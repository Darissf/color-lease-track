import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  contract_id: string;
  amount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: RequestPayload = await req.json();

    if (!payload.contract_id || !payload.amount) {
      return new Response(
        JSON.stringify({ error: 'contract_id and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this contract
    const { data: contract, error: contractError } = await supabase
      .from('rental_contracts')
      .select(`
        id,
        invoice,
        tagihan_belum_bayar,
        user_id,
        client_group_id,
        client_groups!inner(
          id,
          nama,
          nomor_telepon,
          linked_user_id
        )
      `)
      .eq('id', payload.contract_id)
      .single();

    if (contractError || !contract) {
      return new Response(
        JSON.stringify({ error: 'Contract not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns this contract (via linked client group) or is admin
    const clientGroup = contract.client_groups as any;
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = roleData?.role === 'admin' || roleData?.role === 'super_admin';
    const isOwner = clientGroup?.linked_user_id === user.id;

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('payment_confirmation_requests')
      .select('id, burst_expires_at')
      .eq('contract_id', payload.contract_id)
      .eq('status', 'pending')
      .gt('burst_expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingRequest) {
      const expiresAt = new Date(existingRequest.burst_expires_at);
      const secondsRemaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Existing request found',
          request_id: existingRequest.id,
          seconds_remaining: secondsRemaining,
          already_pending: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new payment confirmation request
    const burstExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now

    const { data: newRequest, error: insertError } = await supabase
      .from('payment_confirmation_requests')
      .insert({
        user_id: contract.user_id, // Use contract owner's user_id
        contract_id: payload.contract_id,
        customer_name: clientGroup?.nama || 'Customer',
        customer_phone: clientGroup?.nomor_telepon || null,
        amount_expected: payload.amount,
        burst_expires_at: burstExpiresAt.toISOString(),
        status: 'pending'
      })
      .select('id, burst_expires_at')
      .single();

    if (insertError) {
      console.error('[BCA Request] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BCA Request] Payment check requested for contract ${payload.contract_id}, amount: ${payload.amount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verification started',
        request_id: newRequest.id,
        seconds_remaining: 180, // 3 minutes
        burst_expires_at: newRequest.burst_expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[BCA Request] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
