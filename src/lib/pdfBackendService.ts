/**
 * PDF Backend Service
 * Handles communication with VPS PDF generation server
 */

const PDF_API_URL = 'http://194.163.144.205:3000/generate-pdf';
const PDF_API_KEY = 'rahasia123';

export interface PDFGenerationResult {
  success: boolean;
  error?: string;
}

/**
 * Generate PDF from HTML content via backend server
 * @param htmlContent - Full HTML document string
 * @param fileName - Name for the downloaded file (without .pdf extension)
 */
export async function generatePDFFromBackend(
  htmlContent: string,
  fileName: string
): Promise<PDFGenerationResult> {
  // DEBUG: Log masuk fungsi
  console.log("📡 [pdfBackendService] generatePDFFromBackend DIPANGGIL");
  console.log("📡 [pdfBackendService] HTML length:", htmlContent?.length || 0, "chars");
  console.log("📡 [pdfBackendService] fileName:", fileName);
  
  // Validasi input
  if (!htmlContent || htmlContent.length === 0) {
    console.error("❌ [pdfBackendService] htmlContent KOSONG!");
    return { success: false, error: 'HTML content is empty' };
  }

  try {
    console.log("📡 [pdfBackendService] Mengirim ke VPS:", PDF_API_URL);
    console.log("📡 [pdfBackendService] Body preview (first 500 chars):", htmlContent.substring(0, 500));
    
    const response = await fetch(PDF_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf, application/json',
      },
      body: JSON.stringify({
        htmlContent: htmlContent,
        apiKey: PDF_API_KEY,
      }),
    });

    console.log("📡 [pdfBackendService] Response status:", response.status);
    console.log("📡 [pdfBackendService] Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [pdfBackendService] Server error:", response.status, errorText);
      throw new Error(`Server error ${response.status}: ${errorText}`);
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
    console.error("❌ [pdfBackendService] GAGAL FETCH:", error);
    console.error("❌ [pdfBackendService] Error type:", (error as Error).name);
    console.error("❌ [pdfBackendService] Error message:", (error as Error).message);
    
    // Check for common issues
    if ((error as Error).message.includes('Failed to fetch')) {
      console.error("❌ [pdfBackendService] Kemungkinan: CORS blocked, Network error, atau server tidak bisa diakses");
    }
    if ((error as Error).message.includes('Mixed Content')) {
      console.error("❌ [pdfBackendService] Kemungkinan: Mixed Content - HTTPS page calling HTTP API");
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
