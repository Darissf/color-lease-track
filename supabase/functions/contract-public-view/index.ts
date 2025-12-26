import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_code } = await req.json();

    if (!access_code) {
      console.error("Missing access_code in request");
      return new Response(
        JSON.stringify({ error: "Access code is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Fetching public contract for access_code:", access_code);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get the public link and check if it's valid
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
      console.log("Link has expired:", access_code);
      return new Response(
        JSON.stringify({ 
          error: "Link sudah expired", 
          code: "EXPIRED",
          expired_at: linkData.expires_at 
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the contract details
    const { data: contractData, error: contractError } = await supabase
      .from('rental_contracts')
      .select(`
        id,
        invoice,
        keterangan,
        jenis_scaffolding,
        lokasi_detail,
        google_maps_link,
        start_date,
        end_date,
        tanggal,
        tanggal_kirim,
        tanggal_ambil,
        jumlah_unit,
        tagihan,
        tagihan_belum_bayar,
        status,
        status_pengiriman,
        status_pengambilan,
        penanggung_jawab,
        biaya_kirim,
        client_group_id
      `)
      .eq('id', linkData.contract_id)
      .single();

    if (contractError || !contractData) {
      console.error("Contract not found:", contractError);
      return new Response(
        JSON.stringify({ error: "Kontrak tidak ditemukan", code: "CONTRACT_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const { data: clientData } = await supabase
      .from('client_groups')
      .select('nama, nomor_telepon, icon')
      .eq('id', contractData.client_group_id)
      .single();

    // Get bank account info if there's remaining payment
    let bankInfo = null;
    if (contractData.tagihan_belum_bayar > 0) {
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('bank_name, account_number, account_holder_name')
        .eq('user_id', linkData.user_id)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (bankData) {
        bankInfo = bankData;
      }
    }

    // Get payment history
    const { data: payments } = await supabase
      .from('contract_payments')
      .select('id, payment_date, amount, payment_number, notes')
      .eq('contract_id', linkData.contract_id)
      .order('payment_date', { ascending: false });

    // Increment view count (fire and forget)
    supabase.rpc('increment_contract_link_views', { p_access_code: access_code })
      .then(() => console.log("View count incremented"));

    const response = {
      contract: {
        ...contractData,
        client: clientData || null,
        bank: bankInfo,
        payments: payments || [],
      },
      link: {
        expires_at: linkData.expires_at,
        view_count: linkData.view_count + 1,
        created_at: linkData.created_at,
      }
    };

    console.log("Successfully fetched public contract data");
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error in contract-public-view:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
