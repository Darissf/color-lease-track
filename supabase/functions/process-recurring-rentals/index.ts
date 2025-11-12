import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get all unpaid rental contracts (jumlah_lunas = 0 or null) with status 'masa sewa'
    const { data: unpaidContracts, error: fetchError } = await supabase
      .from('rental_contracts')
      .select('*')
      .eq('status', 'masa sewa')
      .or('jumlah_lunas.eq.0,jumlah_lunas.is.null')
      .not('tanggal', 'is', null);

    if (fetchError) throw fetchError;

    const newContracts = [];
    const processedIds = [];

    for (const contract of unpaidContracts || []) {
      const contractDate = new Date(contract.tanggal);
      const contractMonth = contractDate.getMonth();
      const contractYear = contractDate.getFullYear();

      // Check if contract date is in the past (not current month)
      if (contractYear < currentYear || (contractYear === currentYear && contractMonth < currentMonth)) {
        // Check if there's already a contract for current month
        const nextMonthDate = new Date(currentYear, currentMonth, contractDate.getDate());
        
        const { data: existingContract } = await supabase
          .from('rental_contracts')
          .select('id')
          .eq('user_id', contract.user_id)
          .eq('client_group_id', contract.client_group_id)
          .eq('tanggal', nextMonthDate.toISOString().split('T')[0])
          .single();

        if (!existingContract) {
          // Create new contract for next month
          const newContract = {
            user_id: contract.user_id,
            client_group_id: contract.client_group_id,
            start_date: contract.start_date,
            end_date: contract.end_date,
            tanggal: nextMonthDate.toISOString().split('T')[0],
            tagihan_belum_bayar: contract.tagihan_belum_bayar,
            jumlah_lunas: 0,
            status: 'masa sewa',
            keterangan: contract.keterangan,
            notes: `Auto-generated from contract ${contract.id}`,
            google_maps_link: contract.google_maps_link,
            bank_account_id: contract.bank_account_id,
          };

          newContracts.push(newContract);
          processedIds.push(contract.id);
        }
      }
    }

    // Insert new contracts
    if (newContracts.length > 0) {
      const { error: insertError } = await supabase
        .from('rental_contracts')
        .insert(newContracts);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedIds.length,
        created: newContracts.length,
        message: `Processed ${processedIds.length} contracts, created ${newContracts.length} new entries`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
