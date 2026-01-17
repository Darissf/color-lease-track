/**
 * PDF Backend Service
 * Handles communication with VPS PDF generation server via Edge Function proxy
 * This avoids Mixed Content errors (HTTPS → HTTP blocked by browsers)
 */

export interface PDFGenerationResult {
  success: boolean;
  error?: string;
}

export interface PDFProgressCallback {
  onProgress?: (elapsedSeconds: number) => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000; // 3 seconds base delay

/**
 * Sleep utility
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate PDF from HTML content via Edge Function proxy
 * @param htmlContent - Full HTML document string
 * @param fileName - Name for the downloaded file (without .pdf extension)
 * @param callbacks - Optional callbacks for progress updates
 */
export async function generatePDFFromBackend(
  htmlContent: string,
  fileName: string,
  callbacks?: PDFProgressCallback
): Promise<PDFGenerationResult> {
  console.log("📡 [pdfBackendService] generatePDFFromBackend DIPANGGIL");
  console.log("📡 [pdfBackendService] HTML length:", htmlContent?.length || 0, "chars");
  console.log("📡 [pdfBackendService] fileName:", fileName);
  
  if (!htmlContent || htmlContent.length === 0) {
    console.error("❌ [pdfBackendService] htmlContent KOSONG!");
    return { success: false, error: 'HTML content is empty' };
  }

  // Use Edge Function proxy to avoid Mixed Content error
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf-proxy`;

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = RETRY_DELAY_MS * attempt;
        console.log(`🔄 [pdfBackendService] Retry ${attempt}/${MAX_RETRIES} setelah ${delayMs}ms...`);
        await sleep(delayMs);
      }

      console.log(`📡 [pdfBackendService] Attempt ${attempt + 1}/${MAX_RETRIES + 1} - Mengirim ke Edge Function:`, edgeFunctionUrl);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ htmlContent, fileName }),
      });

      console.log("📡 [pdfBackendService] Response status:", response.status);

      // Check for timeout (504) - should retry
      if (response.status === 504) {
        const errorData = await response.json().catch(() => ({ error: 'Gateway Timeout' }));
        lastError = new Error(errorData.error || 'Server timeout');
        console.warn(`⚠️ [pdfBackendService] Timeout pada attempt ${attempt + 1}, akan retry...`);
        continue; // Retry
      }

      if (!response.ok) {
        let errorMessage = `Server error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        console.error("❌ [pdfBackendService] Error:", errorMessage);
        throw new Error(errorMessage);
      }

      // Receive PDF as blob
      console.log("✅ [pdfBackendService] Menerima blob PDF...");
      const blob = await response.blob();
      console.log("✅ [pdfBackendService] Blob size:", blob.size, "bytes, type:", blob.type);
      
      // Create download link and trigger
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log("✅ [pdfBackendService] Download triggered untuk:", `${fileName}.pdf`);
      return { success: true };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`❌ [pdfBackendService] Error pada attempt ${attempt + 1}:`, lastError.message);
      
      // Don't retry on non-timeout errors
      if (attempt === MAX_RETRIES || !lastError.message.toLowerCase().includes('timeout')) {
        break;
      }
    }
  }

  console.error("❌ [pdfBackendService] GAGAL setelah semua retry:", lastError?.message);
  return { 
    success: false, 
    error: lastError?.message || 'Unknown error after retries'
  };
}
