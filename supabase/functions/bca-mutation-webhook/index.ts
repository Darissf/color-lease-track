import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-hmac-signature, x-timestamp',
};

interface MutationData {
  transaction_date: string;
  transaction_time?: string;
  description: string;
  amount: number;
  transaction_type: 'CR' | 'DB';
  balance_after?: number;
  reference_number?: string;
  raw_data?: Record<string, unknown>;
}

interface WebhookPayload {
  webhook_secret: string;
  mutations: MutationData[];
  sync_mode: 'normal' | 'burst';
  vps_ip?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body and headers
    const payload: WebhookPayload = await req.json();
    const webhookSecret = req.headers.get('x-webhook-secret') || payload.webhook_secret;
    const hmacSignature = req.headers.get('x-hmac-signature');
    const timestamp = req.headers.get('x-timestamp');
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    console.log(`[BCA Webhook] Received ${payload.mutations?.length || 0} mutations from ${clientIp}`);

    // 1. Validate webhook secret
    const { data: credential, error: credError } = await supabase
      .from('bca_credentials')
      .select('id, user_id, allowed_ip, webhook_secret')
      .eq('webhook_secret', webhookSecret)
      .eq('is_active', true)
      .single();

    if (credError || !credential) {
      console.error('[BCA Webhook] Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate IP whitelist (if configured)
    if (credential.allowed_ip && credential.allowed_ip !== clientIp) {
      console.error(`[BCA Webhook] IP not allowed: ${clientIp} (expected: ${credential.allowed_ip})`);
      return new Response(
        JSON.stringify({ error: 'IP not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate HMAC signature (if provided)
    if (hmacSignature && timestamp) {
      const bodyString = JSON.stringify(payload);
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(`${timestamp}:${bodyString}`)
        .digest('hex');
      
      if (hmacSignature !== expectedSignature) {
        console.error('[BCA Webhook] Invalid HMAC signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const userId = credential.user_id;
    const mutations = payload.mutations || [];
    let mutationsFound = mutations.length;
    let mutationsNew = 0;
    let mutationsMatched = 0;

    // 4. Process each mutation
    for (const mutation of mutations) {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('bank_mutations')
        .select('id')
        .eq('user_id', userId)
        .eq('transaction_date', mutation.transaction_date)
        .eq('amount', mutation.amount)
        .eq('description', mutation.description)
        .maybeSingle();

      if (existing) {
        console.log(`[BCA Webhook] Duplicate mutation skipped: ${mutation.description}`);
        continue;
      }

      // Insert new mutation
      const { data: newMutation, error: insertError } = await supabase
        .from('bank_mutations')
        .insert({
          user_id: userId,
          transaction_date: mutation.transaction_date,
          transaction_time: mutation.transaction_time,
          description: mutation.description,
          amount: mutation.amount,
          transaction_type: mutation.transaction_type,
          balance_after: mutation.balance_after,
          reference_number: mutation.reference_number,
          raw_data: mutation.raw_data,
          source: 'auto'
        })
        .select('id, amount, transaction_type')
        .single();

      if (insertError) {
        console.error('[BCA Webhook] Error inserting mutation:', insertError);
        continue;
      }

      mutationsNew++;
      console.log(`[BCA Webhook] New mutation inserted: ${newMutation.id}`);

      // 5. Auto-match with pending payment confirmations (only for credit transactions)
      if (mutation.transaction_type === 'CR') {
        const { data: matchedRequestId } = await supabase
          .rpc('match_mutation_with_request', {
            p_mutation_id: newMutation.id,
            p_amount: mutation.amount
          });

        if (matchedRequestId) {
          mutationsMatched++;
          console.log(`[BCA Webhook] Mutation matched with request: ${matchedRequestId}`);

          // Get matched request details
          const { data: request } = await supabase
            .from('payment_confirmation_requests')
            .select('contract_id, customer_name, customer_phone, amount_expected')
            .eq('id', matchedRequestId)
            .single();

          if (request?.contract_id) {
            // Update rental contract
            const { data: contract } = await supabase
              .from('rental_contracts')
              .select('tagihan_belum_bayar, invoice')
              .eq('id', request.contract_id)
              .single();

            if (contract) {
              const newTagihanBelumBayar = Math.max(0, contract.tagihan_belum_bayar - mutation.amount);
              
              // Update contract
              await supabase
                .from('rental_contracts')
                .update({
                  tagihan_belum_bayar: newTagihanBelumBayar,
                  tanggal_bayar_terakhir: mutation.transaction_date
                })
                .eq('id', request.contract_id);

              // Insert contract payment
              const { data: lastPayment } = await supabase
                .from('contract_payments')
                .select('payment_number')
                .eq('contract_id', request.contract_id)
                .order('payment_number', { ascending: false })
                .limit(1)
                .maybeSingle();

              await supabase
                .from('contract_payments')
                .insert({
                  user_id: userId,
                  contract_id: request.contract_id,
                  payment_date: mutation.transaction_date,
                  amount: mutation.amount,
                  payment_number: (lastPayment?.payment_number || 0) + 1,
                  notes: `Auto-verified dari BCA: ${mutation.description}`
                });

              // Update payment confirmation request - mark WhatsApp as sent
              await supabase
                .from('payment_confirmation_requests')
                .update({
                  whatsapp_sent: true,
                  whatsapp_sent_at: new Date().toISOString()
                })
                .eq('id', matchedRequestId);

              // Send WhatsApp notification
              if (request.customer_phone) {
                try {
                  const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-unified`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseServiceKey}`
                    },
                    body: JSON.stringify({
                      userId: userId,
                      phone: request.customer_phone,
                      templateType: 'payment',
                      contractId: request.contract_id,
                      customVariables: {
                        nama: request.customer_name,
                        invoice: contract.invoice || '-',
                        jumlah_lunas: mutation.amount.toLocaleString('id-ID'),
                        tanggal_lunas: new Date().toLocaleDateString('id-ID')
                      }
                    })
                  });
                  console.log('[BCA Webhook] WhatsApp notification sent:', await whatsappResponse.json());
                } catch (waError) {
                  console.error('[BCA Webhook] WhatsApp notification failed:', waError);
                }
              }

              console.log(`[BCA Webhook] Contract ${request.contract_id} updated, remaining: ${newTagihanBelumBayar}`);
            }
          }
        }
      }
    }

    // 6. Log sync
    const duration = Date.now() - startTime;
    await supabase
      .from('bca_sync_logs')
      .insert({
        bca_credential_id: credential.id,
        status: 'success',
        mode: payload.sync_mode || 'normal',
        mutations_found: mutationsFound,
        mutations_new: mutationsNew,
        mutations_matched: mutationsMatched,
        ip_address: clientIp,
        completed_at: new Date().toISOString(),
        duration_ms: duration
      });

    // 7. Update credential last sync
    await supabase
      .from('bca_credentials')
      .update({
        last_sync_at: new Date().toISOString(),
        status: 'running',
        error_count: 0,
        error_message: null
      })
      .eq('id', credential.id);

    // 8. Expire old burst requests
    await supabase.rpc('expire_burst_requests');

    return new Response(
      JSON.stringify({
        success: true,
        mutations_found: mutationsFound,
        mutations_new: mutationsNew,
        mutations_matched: mutationsMatched,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[BCA Webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
