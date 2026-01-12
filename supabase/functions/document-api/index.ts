import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Rate limit configuration
const RATE_LIMIT_PER_KEY = 100; // requests per minute per API key
const RATE_LIMIT_PER_INVOICE = 10; // requests per minute per invoice
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Helper function to hash API key
    async function hashApiKey(key: string): Promise<string> {
      const encoder = new TextEncoder();
      const data = encoder.encode(key);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Helper function to log access
    async function logAccess(
      supabase: any,
      apiKeyId: string,
      identifier: string,
      accessMethod: 'invoice_number' | 'access_code',
      documentType: string,
      request: Request,
      success: boolean,
      errorMessage?: string
    ) {
      try {
        await supabase.from('api_access_logs').insert({
          api_key_id: apiKeyId,
          invoice_number: identifier,
          access_method: accessMethod,
          document_type: documentType,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          success,
          error_message: errorMessage
        });
      } catch (e) {
        console.error('Failed to log access:', e);
      }
    }

    // Helper function to check rate limit
    async function checkRateLimit(
      supabase: any,
      apiKeyId: string,
      invoiceNumber?: string
    ): Promise<{ allowed: boolean; retryAfter?: number }> {
      const now = new Date();
      const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

      // Check per-key rate limit
      const { data: keyRateLimit } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .is('invoice_number', null)
        .single();

      if (keyRateLimit) {
        // Check if locked out
        if (keyRateLimit.locked_until && new Date(keyRateLimit.locked_until) > now) {
          const retryAfter = Math.ceil((new Date(keyRateLimit.locked_until).getTime() - now.getTime()) / 1000);
          return { allowed: false, retryAfter };
        }

        // Check if within current window
        if (new Date(keyRateLimit.window_start) > windowStart) {
          if (keyRateLimit.request_count >= RATE_LIMIT_PER_KEY) {
            const retryAfter = Math.ceil((new Date(keyRateLimit.window_start).getTime() + RATE_LIMIT_WINDOW_MS - now.getTime()) / 1000);
            return { allowed: false, retryAfter };
          }
        }
      }

      // Check per-invoice rate limit if invoice_number provided
      if (invoiceNumber) {
        const { data: invoiceRateLimit } = await supabase
          .from('api_rate_limits')
          .select('*')
          .eq('api_key_id', apiKeyId)
          .eq('invoice_number', invoiceNumber)
          .single();

        if (invoiceRateLimit) {
          // Check if locked out
          if (invoiceRateLimit.locked_until && new Date(invoiceRateLimit.locked_until) > now) {
            const retryAfter = Math.ceil((new Date(invoiceRateLimit.locked_until).getTime() - now.getTime()) / 1000);
            return { allowed: false, retryAfter };
          }

          // Check if within current window
          if (new Date(invoiceRateLimit.window_start) > windowStart) {
            if (invoiceRateLimit.request_count >= RATE_LIMIT_PER_INVOICE) {
              const retryAfter = Math.ceil((new Date(invoiceRateLimit.window_start).getTime() + RATE_LIMIT_WINDOW_MS - now.getTime()) / 1000);
              return { allowed: false, retryAfter };
            }
          }
        }
      }

      return { allowed: true };
    }

    // Helper function to increment rate limit counter
    async function incrementRateLimit(supabase: any, apiKeyId: string, invoiceNumber?: string) {
      const now = new Date();
      const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

      // Increment per-key rate limit
      const { data: existingKeyLimit } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .is('invoice_number', null)
        .single();

      if (existingKeyLimit) {
        if (new Date(existingKeyLimit.window_start) > windowStart) {
          await supabase
            .from('api_rate_limits')
            .update({ 
              request_count: existingKeyLimit.request_count + 1,
              updated_at: now.toISOString()
            })
            .eq('id', existingKeyLimit.id);
        } else {
          await supabase
            .from('api_rate_limits')
            .update({ 
              request_count: 1, 
              window_start: now.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('id', existingKeyLimit.id);
        }
      } else {
        await supabase.from('api_rate_limits').insert({
          api_key_id: apiKeyId,
          invoice_number: null,
          request_count: 1,
          window_start: now.toISOString()
        });
      }

      // Increment per-invoice rate limit if invoice_number provided
      if (invoiceNumber) {
        const { data: existingInvoiceLimit } = await supabase
          .from('api_rate_limits')
          .select('*')
          .eq('api_key_id', apiKeyId)
          .eq('invoice_number', invoiceNumber)
          .single();

        if (existingInvoiceLimit) {
          if (new Date(existingInvoiceLimit.window_start) > windowStart) {
            await supabase
              .from('api_rate_limits')
              .update({ 
                request_count: existingInvoiceLimit.request_count + 1,
                updated_at: now.toISOString()
              })
              .eq('id', existingInvoiceLimit.id);
          } else {
            await supabase
              .from('api_rate_limits')
              .update({ 
                request_count: 1, 
                window_start: now.toISOString(),
                updated_at: now.toISOString()
              })
              .eq('id', existingInvoiceLimit.id);
          }
        } else {
          await supabase.from('api_rate_limits').insert({
            api_key_id: apiKeyId,
            invoice_number: invoiceNumber,
            request_count: 1,
            window_start: now.toISOString()
          });
        }
      }
    }

    // Helper function to increment failed attempts
    async function incrementFailedAttempts(supabase: any, apiKeyId: string, invoiceNumber: string) {
      const now = new Date();

      const { data: existing } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .eq('invoice_number', invoiceNumber)
        .single();

      if (existing) {
        const newFailedAttempts = existing.failed_attempts + 1;
        const updateData: any = { 
          failed_attempts: newFailedAttempts,
          updated_at: now.toISOString()
        };

        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          updateData.locked_until = new Date(now.getTime() + LOCKOUT_DURATION_MS).toISOString();
        }

        await supabase
          .from('api_rate_limits')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        await supabase.from('api_rate_limits').insert({
          api_key_id: apiKeyId,
          invoice_number: invoiceNumber,
          request_count: 0,
          failed_attempts: 1,
          window_start: now.toISOString()
        });
      }
    }

    // 1. Validate API Key from database
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key required" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client early for API key validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the provided API key and check against database
    const apiKeyHash = await hashApiKey(apiKey);
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', apiKeyHash)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    // 2. Parse request body
    const { access_code, invoice_number, document_type, payment_id } = await req.json();

    // 3. Validate: at least one identifier required
    if (!access_code && !invoice_number) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Either access_code or invoice_number is required",
          hint: "Provide 'access_code' (temporary) OR 'invoice_number' (permanent, recommended)"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!document_type || !['invoice', 'kwitansi'].includes(document_type)) {
      return new Response(
        JSON.stringify({ success: false, error: "document_type must be 'invoice' or 'kwitansi'" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine access method
    const accessMethod = invoice_number ? 'invoice_number' : 'access_code';
    const identifier = invoice_number || access_code;

    console.log(`[document-api] Generating ${document_type} via ${accessMethod}:`, identifier);

    // 4. Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, keyData.id, invoice_number);
    if (!rateLimitCheck.allowed) {
      await logAccess(supabase, keyData.id, identifier, accessMethod, document_type, req, false, 'Rate limit exceeded');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded",
          retry_after_seconds: rateLimitCheck.retryAfter,
          limits: {
            per_api_key: `${RATE_LIMIT_PER_KEY} requests/minute`,
            per_invoice: `${RATE_LIMIT_PER_INVOICE} requests/minute`
          }
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let contractData: any;
    let userId: string;

    // 5. Handle access via invoice_number (NEW - Permanent access)
    if (invoice_number) {
      // Use API key owner's user_id for template settings
      userId = keyData.user_id;

      const { data: contract, error: contractError } = await supabase
        .from('rental_contracts')
        .select(`
          id,
          invoice,
          keterangan,
          start_date,
          end_date,
          tanggal,
          tagihan,
          tagihan_belum_bayar,
          jumlah_lunas,
          tanggal_lunas,
          tanggal_bayar_terakhir,
          status,
          client_group_id,
          bank_account_id,
          api_access_enabled,
          transport_cost_delivery,
          transport_cost_pickup,
          discount,
          invoice_full_rincian,
          bank_accounts (
            bank_name,
            account_number,
            account_holder_name
          )
        `)
        .eq('invoice', invoice_number)
        .eq('user_id', keyData.user_id)
        .single();

      if (contractError || !contract) {
        await logAccess(supabase, keyData.id, invoice_number, 'invoice_number', document_type, req, false, 'Invoice not found');
        await incrementFailedAttempts(supabase, keyData.id, invoice_number);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invoice tidak ditemukan",
            code: "NOT_FOUND"
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if API access is enabled for this contract
      if (contract.api_access_enabled === false) {
        await logAccess(supabase, keyData.id, invoice_number, 'invoice_number', document_type, req, false, 'API access disabled for this contract');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Akses API dinonaktifkan untuk kontrak ini",
            code: "ACCESS_DISABLED"
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      contractData = contract;

    } else {
      // 6. Handle access via access_code (EXISTING - Temporary access)
      const { data: linkData, error: linkError } = await supabase
        .from('contract_public_links')
        .select('*')
        .eq('access_code', access_code)
        .eq('is_active', true)
        .single();

      if (linkError || !linkData) {
        console.error("Link not found:", linkError);
        await logAccess(supabase, keyData.id, access_code, 'access_code', document_type, req, false, 'Access code not found');
        return new Response(
          JSON.stringify({ success: false, error: "Access code tidak valid", code: "NOT_FOUND" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if link has expired
      const now = new Date();
      const expiresAt = new Date(linkData.expires_at);
      if (now > expiresAt) {
        await logAccess(supabase, keyData.id, access_code, 'access_code', document_type, req, false, 'Access code expired');
        return new Response(
          JSON.stringify({ success: false, error: "Access code sudah expired", code: "EXPIRED" }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = linkData.user_id;

      // Get contract details with bank account
      const { data: contract, error: contractError } = await supabase
        .from('rental_contracts')
        .select(`
          id,
          invoice,
          keterangan,
          start_date,
          end_date,
          tanggal,
          tagihan,
          tagihan_belum_bayar,
          jumlah_lunas,
          tanggal_lunas,
          tanggal_bayar_terakhir,
          status,
          client_group_id,
          bank_account_id,
          transport_cost_delivery,
          transport_cost_pickup,
          discount,
          invoice_full_rincian,
          bank_accounts (
            bank_name,
            account_number,
            account_holder_name
          )
        `)
        .eq('id', linkData.contract_id)
        .single();

      if (contractError || !contract) {
        console.error("Contract not found:", contractError);
        await logAccess(supabase, keyData.id, access_code, 'access_code', document_type, req, false, 'Contract not found');
        return new Response(
          JSON.stringify({ success: false, error: "Kontrak tidak ditemukan" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      contractData = contract;
    }

    // For kwitansi, check if fully paid
    if (document_type === 'kwitansi' && contractData.tagihan_belum_bayar > 0) {
      await logAccess(supabase, keyData.id, identifier, accessMethod, document_type, req, false, 'Contract not fully paid');
      return new Response(
        JSON.stringify({ success: false, error: "Kwitansi hanya dapat dibuat jika tagihan sudah lunas 100%", code: "NOT_PAID" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Get client info
    const { data: clientData } = await supabase
      .from('client_groups')
      .select('nama, nomor_telepon')
      .eq('id', contractData.client_group_id)
      .single();

    // 8. Get FULL template settings from document_settings table
    const { data: templateSettings } = await supabase
      .from('document_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 9. Get brand settings for logo fallback
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('logo_url, sidebar_logo_url, brand_image_url, site_name')
      .eq('user_id', userId)
      .single();

    // 10. Generate verification code
    const { data: verificationCode, error: vcError } = await supabase
      .rpc('generate_verification_code');

    if (vcError) {
      console.error("Error generating verification code:", vcError);
      await logAccess(supabase, keyData.id, identifier, accessMethod, document_type, req, false, 'Failed to generate verification code');
      return new Response(
        JSON.stringify({ success: false, error: "Gagal generate verification code" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 11. For kwitansi, get the latest payment or specific payment
    let paymentData = null;
    if (document_type === 'kwitansi') {
      if (payment_id) {
        const { data: payment } = await supabase
          .from('contract_payments')
          .select('*')
          .eq('id', payment_id)
          .eq('contract_id', contractData.id)
          .single();
        paymentData = payment;
      } else {
        // Get the latest payment
        const { data: payment } = await supabase
          .from('contract_payments')
          .select('*')
          .eq('contract_id', contractData.id)
          .order('payment_date', { ascending: false })
          .limit(1)
          .single();
        paymentData = payment;
      }
    }

    // 12. Get custom text elements for the document type
    const customTextDocType = document_type === 'invoice' ? 'invoice' : 'receipt';
    const { data: customTextElements } = await supabase
      .from('custom_text_elements')
      .select('*')
      .eq('user_id', userId)
      .eq('document_type', customTextDocType)
      .eq('is_visible', true)
      .order('order_index');

    // 13. Merge template settings with brand settings fallback for logo
    const mergedTemplateSettings = templateSettings ? {
      ...templateSettings,
      invoice_logo_url: templateSettings.invoice_logo_url || brandSettings?.sidebar_logo_url || brandSettings?.brand_image_url || brandSettings?.logo_url || null,
      company_name: templateSettings.company_name || brandSettings?.site_name || null,
      // Ensure layout settings are objects (not null/undefined)
      invoice_layout_settings: typeof templateSettings.invoice_layout_settings === 'object' && templateSettings.invoice_layout_settings
        ? templateSettings.invoice_layout_settings
        : {},
      receipt_layout_settings: typeof templateSettings.receipt_layout_settings === 'object' && templateSettings.receipt_layout_settings
        ? templateSettings.receipt_layout_settings
        : {},
    } : {
      invoice_logo_url: brandSettings?.sidebar_logo_url || brandSettings?.brand_image_url || brandSettings?.logo_url || null,
      company_name: brandSettings?.site_name || null,
      invoice_layout_settings: {},
      receipt_layout_settings: {},
    };

    // Log successful access and increment rate limit
    await logAccess(supabase, keyData.id, identifier, accessMethod, document_type, req, true);
    await incrementRateLimit(supabase, keyData.id, invoice_number);

    // 14. Fetch line items for Page 2 (Rincian Tagihan)
    const { data: lineItemsData } = await supabase
      .from('contract_line_items')
      .select('item_name, quantity, unit_price_per_day, duration_days, subtotal, sort_order')
      .eq('contract_id', contractData.id)
      .order('sort_order', { ascending: true });

    // 15. Build comprehensive response
    const response = {
      success: true,
      document_type,
      verification_code: verificationCode,
      access_method: accessMethod,
      identifier: identifier,
      contract: {
        id: contractData.id,
        invoice: contractData.invoice,
        keterangan: contractData.keterangan,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        tanggal: contractData.tanggal,
        tagihan: contractData.tagihan,
        tagihan_belum_bayar: contractData.tagihan_belum_bayar,
        jumlah_lunas: contractData.jumlah_lunas,
        tanggal_lunas: contractData.tanggal_lunas,
        tanggal_bayar_terakhir: contractData.tanggal_bayar_terakhir,
        status: contractData.status,
      },
      client: clientData || { nama: null, nomor_telepon: null },
      payment: paymentData,
      bank_info: contractData.bank_accounts ? {
        bank_name: (contractData.bank_accounts as any).bank_name,
        account_number: (contractData.bank_accounts as any).account_number,
        account_holder_name: (contractData.bank_accounts as any).account_holder_name,
      } : null,
      // Page 2 data (Rincian Tagihan)
      line_items: lineItemsData || [],
      page_2_settings: {
        transport_delivery: contractData.transport_cost_delivery || 0,
        transport_pickup: contractData.transport_cost_pickup || 0,
        discount: contractData.discount || 0,
        full_rincian: contractData.invoice_full_rincian ?? true,
      },
      template_settings: mergedTemplateSettings,
      custom_text_elements: customTextElements || [],
      generated_at: new Date().toISOString(),
      api_version: "1.4",
      rate_limits: {
        per_api_key: `${RATE_LIMIT_PER_KEY} requests/minute`,
        per_invoice: `${RATE_LIMIT_PER_INVOICE} requests/minute`
      }
    };

    console.log(`[document-api] Successfully generated ${document_type} data via ${accessMethod}: ${identifier}`);
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("[document-api] Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
