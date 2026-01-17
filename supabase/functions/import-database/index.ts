import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables that should be imported first (no foreign key dependencies)
const PRIORITY_TABLES = [
  'profiles', 'user_roles', 'client_groups', 'bank_accounts', 'inventory_items',
  'income_sources', 'savings_plans', 'blog_categories', 'chat_conversations',
  'delivery_trips', 'ai_personas', 'email_providers', 'whatsapp_numbers'
];

// Tables with foreign key dependencies (import last)
const DEPENDENT_TABLES = [
  'contract_line_items', 'contract_payments', 'contract_public_links', 'contract_stock_items',
  'chat_messages', 'chat_bookmarks', 'chat_message_reactions', 'chat_documents',
  'delivery_stops', 'delivery_location_history', 'blog_posts', 'blog_comments',
  'ai_memory', 'ai_usage_analytics', 'bca_sync_logs', 'recurring_income_payments'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { backup_data, strategy = 'merge' } = await req.json();

    if (!backup_data || !backup_data.version || !backup_data.tables) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting database import with strategy: ${strategy}`);
    console.log(`Backup contains ${backup_data.table_count} tables, ${backup_data.total_records} records`);

    const tableNames = Object.keys(backup_data.tables);
    let tablesImported = 0;
    let recordsImported = 0;
    const errors: Record<string, string> = {};

    // Sort tables: priority first, then regular, then dependent
    const sortedTables = [
      ...PRIORITY_TABLES.filter(t => tableNames.includes(t)),
      ...tableNames.filter(t => !PRIORITY_TABLES.includes(t) && !DEPENDENT_TABLES.includes(t)),
      ...DEPENDENT_TABLES.filter(t => tableNames.includes(t))
    ];

    for (const tableName of sortedTables) {
      const tableData = backup_data.tables[tableName];
      
      if (!tableData || !tableData.data || tableData.data.length === 0) {
        console.log(`Skipping ${tableName}: no data`);
        continue;
      }

      try {
        console.log(`Processing ${tableName}: ${tableData.data.length} records, strategy: ${strategy}`);

        // For replace strategy, delete all existing data first
        if (strategy === 'replace') {
          const { error: deleteError } = await supabaseClient
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (deleteError) {
            console.warn(`Failed to clear ${tableName}:`, deleteError.message);
          }
        }

        let successCount = 0;

        // Process records in batches
        const batchSize = 100;
        for (let i = 0; i < tableData.data.length; i += batchSize) {
          const batch = tableData.data.slice(i, i + batchSize);

          if (strategy === 'merge') {
            // Upsert: update if exists, insert if not
            const { error } = await supabaseClient
              .from(tableName)
              .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

            if (error) {
              console.warn(`Upsert error for ${tableName} batch ${i}:`, error.message);
            } else {
              successCount += batch.length;
            }
          } else if (strategy === 'skip') {
            // Insert with ignore duplicates
            const { error } = await supabaseClient
              .from(tableName)
              .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

            if (error) {
              console.warn(`Insert error for ${tableName} batch ${i}:`, error.message);
            } else {
              successCount += batch.length;
            }
          } else {
            // Replace: just insert (we already deleted)
            const { error } = await supabaseClient
              .from(tableName)
              .insert(batch);

            if (error) {
              console.warn(`Insert error for ${tableName} batch ${i}:`, error.message);
              // Try individual inserts for failed batch
              for (const record of batch) {
                const { error: singleError } = await supabaseClient
                  .from(tableName)
                  .insert(record);
                if (!singleError) successCount++;
              }
            } else {
              successCount += batch.length;
            }
          }
        }

        console.log(`Imported ${successCount}/${tableData.data.length} records to ${tableName}`);
        tablesImported++;
        recordsImported += successCount;

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Error processing ${tableName}:`, errorMsg);
        errors[tableName] = errorMsg;
      }
    }

    // Log the import action
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'database_import',
        entity_type: 'database',
        new_data: {
          strategy,
          tables_imported: tablesImported,
          records_imported: recordsImported,
          backup_exported_at: backup_data.exported_at,
          errors: Object.keys(errors).length > 0 ? errors : undefined
        }
      });

    console.log(`Import completed: ${tablesImported} tables, ${recordsImported} records`);

    return new Response(
      JSON.stringify({
        success: true,
        tables_imported: tablesImported,
        records_imported: recordsImported,
        strategy,
        errors: Object.keys(errors).length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
