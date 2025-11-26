import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTransaction {
  id: string;
  savings_plan_id: string;
  user_id: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_execution_date: string;
  is_active: boolean;
  notes: string | null;
}

// Jakarta Timezone Helper Functions
const JAKARTA_OFFSET_HOURS = 7; // UTC+7

const getNowInJakarta = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + (JAKARTA_OFFSET_HOURS * 60 * 60 * 1000));
};

const formatJakartaDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting recurring transactions processing...');

    const today = formatJakartaDate(getNowInJakarta());

    // Fetch all active recurring transactions that are due today
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution_date', today);

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringTransactions?.length || 0} recurring transactions to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const recurring of recurringTransactions || []) {
      try {
        // Check if end_date has passed
        if (recurring.end_date && recurring.end_date < today) {
          console.log(`Deactivating expired recurring transaction ${recurring.id}`);
          await supabase
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id);
          continue;
        }

        // Create the transaction
        const { error: insertError } = await supabase
          .from('savings_transactions')
          .insert({
            savings_plan_id: recurring.savings_plan_id,
            user_id: recurring.user_id,
            transaction_type: 'deposit',
            amount: recurring.amount,
            notes: recurring.notes || 'Auto-deposit (recurring transaction)',
            transaction_date: today,
          });

        if (insertError) {
          console.error(`Error creating transaction for recurring ${recurring.id}:`, insertError);
          errorCount++;
          continue;
        }

        // Calculate next execution date
        const nextDate = calculateNextExecutionDate(
          recurring.next_execution_date,
          recurring.frequency
        );

        // Update the recurring transaction with the next execution date
        const { error: updateError } = await supabase
          .from('recurring_transactions')
          .update({ next_execution_date: nextDate })
          .eq('id', recurring.id);

        if (updateError) {
          console.error(`Error updating recurring transaction ${recurring.id}:`, updateError);
          errorCount++;
          continue;
        }

        console.log(`Processed recurring transaction ${recurring.id}, next date: ${nextDate}`);
        processedCount++;
      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Processing complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        message: `Processed ${processedCount} recurring transactions`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in process-recurring-transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function calculateNextExecutionDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate + 'T00:00:00Z'); // Parse as UTC
  const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
  const jakartaDate = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  
  switch (frequency) {
    case 'daily':
      jakartaDate.setDate(jakartaDate.getDate() + 1);
      break;
    case 'weekly':
      jakartaDate.setDate(jakartaDate.getDate() + 7);
      break;
    case 'monthly':
      jakartaDate.setMonth(jakartaDate.getMonth() + 1);
      break;
    case 'yearly':
      jakartaDate.setFullYear(jakartaDate.getFullYear() + 1);
      break;
  }
  
  return jakartaDate.toISOString().split('T')[0];
}
