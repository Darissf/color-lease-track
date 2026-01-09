import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

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
    const { access_code, document_type, payment_id } = await req.json();

    // 3. Validate required fields
    if (!access_code) {
      return new Response(
        JSON.stringify({ success: false, error: "access_code is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!document_type || !['invoice', 'kwitansi'].includes(document_type)) {
      return new Response(
        JSON.stringify({ success: false, error: "document_type must be 'invoice' or 'kwitansi'" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[document-api] Generating ${document_type} for access_code:`, access_code);

    // Note: supabase client already initialized above for API key validation

    // 5. Validate access code
    const { data: linkData, error: linkError } = await supabase
      .from('contract_public_links')
      .select('*')
      .eq('access_code', access_code)
      .eq('is_active', true)
      .single();

    if (linkError || !linkData) {
      console.error("Link not found:", linkError);
      return new Response(
        JSON.stringify({ success: false, error: "Access code tidak valid", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if link has expired
    const now = new Date();
    const expiresAt = new Date(linkData.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ success: false, error: "Access code sudah expired", code: "EXPIRED" }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Get contract details with bank account
    const { data: contractData, error: contractError } = await supabase
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
        bank_accounts (
          bank_name,
          account_number,
          account_holder_name
        )
      `)
      .eq('id', linkData.contract_id)
      .single();

    if (contractError || !contractData) {
      console.error("Contract not found:", contractError);
      return new Response(
        JSON.stringify({ success: false, error: "Kontrak tidak ditemukan" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For kwitansi, check if fully paid
    if (document_type === 'kwitansi' && contractData.tagihan_belum_bayar > 0) {
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
      .eq('user_id', linkData.user_id)
      .single();

    // 9. Get brand settings for logo fallback
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('logo_url, sidebar_logo_url, brand_image_url, site_name')
      .eq('user_id', linkData.user_id)
      .single();

    // 10. Generate verification code
    const { data: verificationCode, error: vcError } = await supabase
      .rpc('generate_verification_code');

    if (vcError) {
      console.error("Error generating verification code:", vcError);
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
          .eq('contract_id', linkData.contract_id)
          .single();
        paymentData = payment;
      } else {
        // Get the latest payment
        const { data: payment } = await supabase
          .from('contract_payments')
          .select('*')
          .eq('contract_id', linkData.contract_id)
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
      .eq('user_id', linkData.user_id)
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

    // 14. Build comprehensive response
    const response = {
      success: true,
      document_type,
      verification_code: verificationCode,
      access_code,
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
      template_settings: mergedTemplateSettings,
      custom_text_elements: customTextElements || [],
      generated_at: new Date().toISOString(),
      api_version: "1.0",
    };

    console.log(`[document-api] Successfully generated ${document_type} data for ${access_code}`);
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
