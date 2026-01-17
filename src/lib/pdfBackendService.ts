/**
 * PDF Backend Service
 * Handles communication with VPS PDF generation server via Edge Function proxy
 * This avoids Mixed Content errors (HTTPS → HTTP blocked by browsers)
 */

export interface PDFGenerationResult {
  success: boolean;
  error?: string;
}

/**
 * Generate PDF from HTML content via Edge Function proxy
 * @param htmlContent - Full HTML document string
 * @param fileName - Name for the downloaded file (without .pdf extension)
 */
export async function generatePDFFromBackend(
  htmlContent: string,
  fileName: string
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

  try {
    console.log("📡 [pdfBackendService] Mengirim ke Edge Function:", edgeFunctionUrl);
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ htmlContent, fileName }),
    });

    console.log("📡 [pdfBackendService] Response status:", response.status);

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
    console.error("❌ [pdfBackendService] GAGAL:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
