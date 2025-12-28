import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function to serve scraper files from Supabase Storage
 * 
 * This solves the problem of SPA preview URLs returning HTML instead of raw files.
 * Files are served from the 'scraper-files' storage bucket.
 * 
 * Usage:
 * GET /functions/v1/get-scraper-file?file=bca-scraper.js
 * GET /functions/v1/get-scraper-file?file=scheduler.js
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fileName = url.searchParams.get('file');

    if (!fileName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing file parameter',
          usage: 'GET /functions/v1/get-scraper-file?file=bca-scraper.js',
          available_files: [
            'bca-scraper.js',
            'scheduler.js', 
            'config.env.template',
            'install.sh',
            'run.sh',
            'bca-scraper.service',
            'install-service.sh',
            'README.md',
            'README.txt'
          ]
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Security: only allow specific file names (no path traversal)
    const allowedFiles = [
      'bca-scraper.js',
      'scheduler.js',
      'config.env.template',
      'install.sh',
      'run.sh',
      'bca-scraper.service',
      'install-service.sh',
      'logrotate-bca-scraper',
      'README.md',
      'README.txt',
      'README-OPENVPN.md',
      'setup-openvpn.sh',
      'setup-split-tunnel.sh',
      'vpn-up.sh',
      'vpn-down.sh'
    ];

    // Clean the filename - remove any path components
    const cleanFileName = fileName.split('/').pop() || '';
    
    if (!allowedFiles.includes(cleanFileName)) {
      return new Response(
        JSON.stringify({ 
          error: `File not allowed: ${cleanFileName}`,
          allowed_files: allowedFiles
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[get-scraper-file] Fetching file: ${cleanFileName}`);

    // Try to get file from storage bucket
    const { data, error } = await supabase.storage
      .from('scraper-files')
      .download(cleanFileName);

    if (error) {
      console.error(`[get-scraper-file] Storage error for ${cleanFileName}:`, error);
      
      // Return helpful error with instructions
      return new Response(
        JSON.stringify({ 
          error: `File not found in storage: ${cleanFileName}`,
          message: 'The file needs to be uploaded to the scraper-files storage bucket first.',
          instructions: [
            '1. Go to the Cloud Scraper Settings page in the app',
            '2. Use the "Upload Scraper Files" feature to upload the files',
            '3. Or manually upload files to the scraper-files bucket'
          ]
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine content type
    let contentType = 'text/plain';
    if (cleanFileName.endsWith('.js')) {
      contentType = 'application/javascript';
    } else if (cleanFileName.endsWith('.sh')) {
      contentType = 'text/x-shellscript';
    } else if (cleanFileName.endsWith('.md')) {
      contentType = 'text/markdown';
    } else if (cleanFileName.endsWith('.service')) {
      contentType = 'text/plain';
    }

    // Convert blob to text
    const text = await data.text();
    
    console.log(`[get-scraper-file] Successfully served ${cleanFileName} (${text.length} bytes)`);

    return new Response(text, {
      headers: {
        ...corsHeaders,
        'Content-Type': `${contentType}; charset=utf-8`,
        'Content-Disposition': `inline; filename="${cleanFileName}"`,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('[get-scraper-file] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
