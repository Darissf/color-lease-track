import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All 113 tables in the public schema
const ALL_TABLES = [
  'ai_content_suggestions', 'ai_custom_tools', 'ai_feature_config', 'ai_memory', 'ai_personas', 'ai_usage_analytics',
  'alert_history', 'api_access_logs', 'api_docs_public_links', 'api_keys', 'api_rate_limits', 'audit_logs',
  'bank_account_balance_history', 'bank_accounts', 'bank_mutations', 'bca_credentials', 'bca_sync_logs',
  'blog_categories', 'blog_comments', 'blog_posts',
  'budget_alerts', 'budget_automation_rules', 'budget_templates', 'category_budgets',
  'chat_bookmarks', 'chat_conversations', 'chat_documents', 'chat_message_reactions', 'chat_messages',
  'client_groups', 'cloud_usage_snapshots', 'content_analysis', 'content_comments', 'content_file_mapping', 'content_history', 'content_render_stats',
  'contract_line_items', 'contract_payments', 'contract_public_links', 'contract_stock_items', 'conversation_sharing',
  'custom_text_elements', 'database_backups', 'delivery_location_history', 'delivery_stops', 'delivery_trips',
  'document_settings', 'driver_templates', 'editable_content',
  'email_logs', 'email_providers', 'email_signatures', 'email_templates', 'email_verification_tokens',
  'expenses', 'fixed_expense_history', 'fixed_expenses', 'fixed_monthly_income',
  'income_sources', 'inventory_items', 'inventory_movements', 'invoice_receipts',
  'login_sessions', 'mail_inbox', 'manual_invoice_content', 'manual_receipt_content', 'meta_ads_settings', 'meta_events', 'meta_whatsapp_templates',
  'monitored_email_addresses', 'monthly_budgets', 'monthly_reports',
  'notification_preferences', 'password_reset_tokens', 'payment_confirmation_requests', 'payment_edit_requests', 'payment_provider_settings', 'payments_tracking',
  'portfolio_projects', 'profiles',
  'recurring_income', 'recurring_income_payments', 'recurring_transactions', 'rental_contracts',
  'savings_plans', 'savings_settings', 'savings_transactions', 'scraper_versions', 'security_rate_limits', 'short_links', 'smtp_settings', 'stamp_elements',
  'temporary_access_codes', 'two_factor_codes', 'unified_notification_queue', 'user_ai_settings', 'user_roles',
  'vip_design_settings', 'warehouse_settings',
  'whatsapp_analytics', 'whatsapp_conversations', 'whatsapp_customer_tags', 'whatsapp_health_checks',
  'whatsapp_message_templates', 'whatsapp_messages', 'whatsapp_notification_queue', 'whatsapp_notifications_log',
  'whatsapp_numbers', 'whatsapp_scheduled_messages', 'whatsapp_settings', 'whatsapp_tracked_links',
  'windows_balance_check_sessions'
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

    console.log('Starting full database export for user:', user.id);

    const backupData: {
      version: string;
      exported_at: string;
      exported_by: string;
      table_count: number;
      total_records: number;
      tables: Record<string, { row_count: number; data: unknown[]; error?: string }>;
    } = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: user.id,
      table_count: 0,
      total_records: 0,
      tables: {}
    };

    let successfulTables = 0;
    let totalRecords = 0;

    // Export each table
    for (const table of ALL_TABLES) {
      try {
        // Use service role to bypass RLS and get all data
        const { data, error } = await supabaseClient
          .from(table)
          .select('*');

        if (error) {
          console.warn(`Failed to export ${table}:`, error.message);
          backupData.tables[table] = { row_count: 0, data: [], error: error.message };
          continue;
        }

        const rowCount = data?.length || 0;
        backupData.tables[table] = {
          row_count: rowCount,
          data: data || []
        };
        
        successfulTables++;
        totalRecords += rowCount;
        console.log(`Exported ${table}: ${rowCount} rows`);
      } catch (err) {
        console.warn(`Error exporting ${table}:`, err);
        backupData.tables[table] = { row_count: 0, data: [], error: String(err) };
      }
    }

    backupData.table_count = successfulTables;
    backupData.total_records = totalRecords;

    console.log(`Export completed: ${successfulTables} tables, ${totalRecords} total records`);

    // Log the export action
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'database_export',
        entity_type: 'database',
        new_data: {
          table_count: successfulTables,
          total_records: totalRecords,
          exported_at: backupData.exported_at
        }
      });

    return new Response(
      JSON.stringify(backupData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
