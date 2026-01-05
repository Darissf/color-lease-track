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
  try {
    const response = await fetch(PDF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        htmlContent,
        apiKey: PDF_API_KEY,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error ${response.status}: ${errorText}`);
    }

    // Receive PDF as blob
    const blob = await response.blob();
    
    // Create download link and trigger
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  } catch (error) {
    console.error('PDF generation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
