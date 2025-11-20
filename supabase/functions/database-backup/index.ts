import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting database backup for user:', user.id);

    // Create backup record
    const { data: backupRecord, error: recordError } = await supabaseClient
      .from('database_backups')
      .insert({
        user_id: user.id,
        status: 'in_progress',
      })
      .select()
      .single();

    if (recordError) {
      console.error('Failed to create backup record:', recordError);
      throw new Error('Failed to initialize backup');
    }

    // Tables to backup
    const tables = [
      'profiles', 'expenses', 'bank_accounts', 'fixed_expenses', 'monthly_budgets',
      'category_budgets', 'income_sources', 'savings_plans', 'rental_contracts',
      'client_groups', 'user_roles', 'chat_conversations', 'chat_messages'
    ];

    let sqlContent = `-- Database Backup - ${new Date().toISOString()}\n\n`;
    const backedUpTables: string[] = [];

    // Export each table
    for (const table of tables) {
      try {
        const { data, error } = await supabaseClient
          .from(table)
          .select('*');

        if (error) {
          console.warn(`Failed to export ${table}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          sqlContent += `-- Table: ${table}\n`;
          sqlContent += `-- Records: ${data.length}\n`;
          sqlContent += JSON.stringify(data, null, 2) + '\n\n';
          backedUpTables.push(table);
        }
      } catch (err) {
        console.warn(`Error exporting ${table}:`, err);
      }
    }

    const backupSizeKb = Math.round(new TextEncoder().encode(sqlContent).length / 1024);
    console.log(`Backup size: ${backupSizeKb} KB, Tables: ${backedUpTables.join(', ')}`);

    // Upload to GitHub
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `database-backup-${timestamp}.json`;
    const filePath = `backups/${fileName}`;

    // Get repository info from environment or use default
    const owner = 'your-github-username'; // User should update this
    const repo = 'your-repo-name'; // User should update this

    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    const githubResponse = await fetch(githubApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `chore: automated database backup ${timestamp}`,
        content: btoa(sqlContent),
      }),
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub API error:', errorText);
      throw new Error(`GitHub upload failed: ${githubResponse.statusText}`);
    }

    const githubData = await githubResponse.json();
    const commitUrl = githubData.content?.html_url || '';

    // Update backup record with success
    await supabaseClient
      .from('database_backups')
      .update({
        status: 'success',
        file_path: filePath,
        commit_url: commitUrl,
        backup_size_kb: backupSizeKb,
        tables_backed_up: backedUpTables,
      })
      .eq('id', backupRecord.id);

    console.log('Backup completed successfully:', commitUrl);

    return new Response(
      JSON.stringify({
        status: 'success',
        filePath,
        commitUrl,
        backupTime: new Date().toISOString(),
        tablesBackedUp: backedUpTables,
        sizeKb: backupSizeKb,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backup error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Backup failed';

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});