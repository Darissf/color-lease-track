import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_code, document_type, payment_id } = await req.json();

    if (!access_code) {
      return new Response(
        JSON.stringify({ error: "Access code is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!document_type || !['invoice', 'kwitansi'].includes(document_type)) {
      return new Response(
        JSON.stringify({ error: "Valid document_type (invoice/kwitansi) is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${document_type} for access_code:`, access_code);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate access code
    const { data: linkData, error: linkError } = await supabase
      .from('contract_public_links')
      .select('*')
      .eq('access_code', access_code)
      .eq('is_active', true)
      .single();

    if (linkError || !linkData) {
      console.error("Link not found:", linkError);
      return new Response(
        JSON.stringify({ error: "Link tidak ditemukan", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if link has expired
    const now = new Date();
    const expiresAt = new Date(linkData.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: "Link sudah expired", code: "EXPIRED" }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contract details with bank account
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
        JSON.stringify({ error: "Kontrak tidak ditemukan" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For kwitansi, check if fully paid
    if (document_type === 'kwitansi' && contractData.tagihan_belum_bayar > 0) {
      return new Response(
        JSON.stringify({ error: "Kwitansi hanya dapat dibuat jika tagihan sudah lunas 100%", code: "NOT_PAID" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const { data: clientData } = await supabase
      .from('client_groups')
      .select('nama, nomor_telepon')
      .eq('id', contractData.client_group_id)
      .single();

    // Get FULL template settings from document_settings table
    const { data: templateSettings } = await supabase
      .from('document_settings')
      .select('*')
      .eq('user_id', linkData.user_id)
      .single();

    // Get brand settings for logo fallback
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('logo_url, sidebar_logo_url, brand_image_url, site_name')
      .eq('user_id', linkData.user_id)
      .single();

    // Generate verification code
    const { data: verificationCode, error: vcError } = await supabase
      .rpc('generate_verification_code');

    if (vcError) {
      console.error("Error generating verification code:", vcError);
      return new Response(
        JSON.stringify({ error: "Gagal generate verification code" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For kwitansi, get the latest payment or specific payment
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

    // Merge template settings with brand settings fallback for logo
    const mergedTemplateSettings = templateSettings ? {
      ...templateSettings,
      invoice_logo_url: templateSettings.invoice_logo_url || brandSettings?.sidebar_logo_url || brandSettings?.brand_image_url || brandSettings?.logo_url || null,
      company_name: templateSettings.company_name || brandSettings?.site_name || null,
    } : {
      invoice_logo_url: brandSettings?.sidebar_logo_url || brandSettings?.brand_image_url || brandSettings?.logo_url || null,
      company_name: brandSettings?.site_name || null,
    };

    const response = {
      verification_code: verificationCode,
      access_code: access_code, // Include access code for payment QR
      contract: {
        id: contractData.id,
        invoice: contractData.invoice,
        keterangan: contractData.keterangan,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        tanggal: contractData.tanggal,
        tagihan: contractData.tagihan,
        tagihan_belum_bayar: contractData.tagihan_belum_bayar,
      },
      client: clientData,
      template_settings: mergedTemplateSettings,
      payment: paymentData,
      document_type,
      bank_info: contractData.bank_accounts ? {
        bank_name: (contractData.bank_accounts as any).bank_name,
        account_number: (contractData.bank_accounts as any).account_number,
        account_holder_name: (contractData.bank_accounts as any).account_holder_name,
      } : null,
    };

    console.log(`Successfully generated ${document_type} data`);
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error in public-document-generate:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
