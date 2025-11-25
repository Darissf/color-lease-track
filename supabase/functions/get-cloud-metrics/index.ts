import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TableStats {
  tableName: string;
  size: number;
  rowCount: number;
  lastModified: string;
}

interface BucketStats {
  name: string;
  fileCount: number;
  size: number;
  isPublic: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get database table sizes using the function
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_table_sizes');

    if (tablesError) {
      console.error('Error fetching table sizes:', tablesError);
      throw tablesError;
    }

    const tableStats: TableStats[] = (tablesData || []).map((row: any) => ({
      tableName: row.table_name?.replace('public.', '') || '',
      size: Number(row.size_bytes) || 0,
      rowCount: Number(row.row_count) || 0,
      lastModified: row.last_modified || new Date().toISOString(),
    }));

    const totalDatabaseSize = tableStats.reduce((sum, table) => sum + table.size, 0);

    // Get storage bucket stats with real file sizes
    const { data: bucketsData, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('Error fetching buckets:', bucketsError);
      throw bucketsError;
    }

    const bucketStats: BucketStats[] = [];
    let totalStorageSize = 0;

    for (const bucket of bucketsData || []) {
      const { data: files, error: filesError } = await supabase
        .storage
        .from(bucket.name)
        .list('', { limit: 1000 });

      if (filesError) {
        console.error(`Error listing files in ${bucket.name}:`, filesError);
        continue;
      }

      const bucketSize = (files || []).reduce((sum, file) => {
        const fileSize = file.metadata?.size || 0;
        return sum + fileSize;
      }, 0);

      totalStorageSize += bucketSize;

      bucketStats.push({
        name: bucket.name,
        fileCount: files?.length || 0,
        size: bucketSize,
        isPublic: bucket.public || false,
      });
    }

    return new Response(
      JSON.stringify({
        databaseSize: totalDatabaseSize,
        storageSize: totalStorageSize,
        tables: tableStats,
        buckets: bucketStats,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-cloud-metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});