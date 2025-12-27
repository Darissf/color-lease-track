/**
 * Asset URL Converter
 * 
 * Converts Supabase storage URLs to custom domain asset URLs via edge function proxy.
 * This hides Supabase infrastructure URLs from public view.
 * 
 * Transforms:
 * https://uqzzpxfmwhmhiqniiyjk.supabase.co/storage/v1/object/public/avatars/xxx.jpg
 * 
 * To:
 * https://[current-domain]/functions/v1/serve-asset/avatars/xxx.jpg
 */

const SUPABASE_PROJECT_ID = 'uqzzpxfmwhmhiqniiyjk';
const SUPABASE_STORAGE_PREFIX = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/`;

/**
 * Converts a Supabase storage URL to a proxied asset URL
 * @param storageUrl - The original Supabase storage URL
 * @returns The proxied URL using the current domain
 */
export function getAssetUrl(storageUrl: string | null | undefined): string {
  if (!storageUrl) return '';
  
  // Only transform Supabase storage URLs
  if (storageUrl.startsWith(SUPABASE_STORAGE_PREFIX)) {
    // Extract the bucket and path from the URL
    const relativePath = storageUrl.replace(SUPABASE_STORAGE_PREFIX, '');
    
    // Use current domain (will automatically use custom domain in production)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    return `${baseUrl}/functions/v1/serve-asset/${relativePath}`;
  }
  
  // Return original URL if not a Supabase storage URL
  return storageUrl;
}

/**
 * Checks if a URL is a Supabase storage URL
 * @param url - The URL to check
 * @returns true if the URL is a Supabase storage URL
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith(SUPABASE_STORAGE_PREFIX);
}
