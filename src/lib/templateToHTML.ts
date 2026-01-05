/**
 * Template to HTML Converter
 * Renders React components to full HTML documents with embedded CSS
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, ComponentType } from 'react';

/**
 * Extract all compiled CSS from the current document
 * Scrapes from <style> tags AND document.styleSheets for complete coverage
 */
function getCompiledCSS(): string {
  console.log("📄 [templateToHTML] Scraping semua CSS dari browser...");
  
  let collectedStyles = '';
  
  // METODE 1: Ambil dari semua <style> tags (Vite inject CSS di sini)
  const styleTags = document.querySelectorAll('style');
  console.log("📄 [templateToHTML] Ditemukan", styleTags.length, "<style> tags");
  
  styleTags.forEach((tag, index) => {
    const content = tag.innerHTML || tag.textContent || '';
    if (content.trim()) {
      collectedStyles += `/* Style Tag ${index + 1} */\n${content}\n\n`;
      console.log("📄 [templateToHTML] Style tag", index + 1, "length:", content.length);
    }
  });
  
  // METODE 2: Fallback - coba ambil dari document.styleSheets untuk external CSS
  try {
    const styleSheets = Array.from(document.styleSheets);
    console.log("📄 [templateToHTML] Ditemukan", styleSheets.length, "StyleSheet objects");
    
    styleSheets.forEach((sheet, index) => {
      try {
        // Skip jika dari <style> tag (sudah ditangkap di metode 1)
        if (sheet.href === null) {
          return;
        }
        
        const rules = Array.from(sheet.cssRules || []);
        if (rules.length > 0) {
          let sheetCSS = `/* External StyleSheet ${index + 1}: ${sheet.href} */\n`;
          rules.forEach(rule => {
            sheetCSS += rule.cssText + '\n';
          });
          collectedStyles += sheetCSS + '\n';
          console.log("📄 [templateToHTML] External sheet", index + 1, "rules:", rules.length);
        }
      } catch (e) {
        // CORS restriction - skip external stylesheets
        console.warn("📄 [templateToHTML] Skip external (CORS):", sheet.href);
      }
    });
  } catch (e) {
    console.warn("📄 [templateToHTML] StyleSheets API error:", e);
  }
  
  console.log("📄 [templateToHTML] Total CSS collected:", collectedStyles.length, "chars");
  return collectedStyles;
}

/**
 * Additional CSS overrides specifically for PDF generation
 */
function getPDFOverrideCSS(): string {
  return `
    /* PDF Generation Overrides */
    html, body {
      margin: 0;
      padding: 0;
      background: white;
    }
    
    /* A4 Paper dimensions */
    .paper-document {
      width: 210mm !important;
      min-height: 297mm !important;
      padding: 32px !important;
      background: white !important;
      box-sizing: border-box !important;
    }
    
    /* Print page setup */
    .print-page {
      width: 210mm !important;
      min-height: 297mm !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      background: white !important;
    }
    
    /* Page break */
    .print-page-break {
      page-break-after: always !important;
      break-after: page !important;
    }
    
    /* Hide no-print elements */
    .no-print {
      display: none !important;
    }
    
    /* Watermark transform comes from inline styles - DO NOT override */
    /* Rotation is dynamic from database settings (watermark_rotation) */
    
    .stamp-positioned {
      /* Preserve stamp rotation */
    }
    
    /* Ensure colors are printed */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  `;
}

/**
 * Generate a complete HTML document from a React component
 * Includes all CSS inline for server-side rendering
 */
export function generateFullHTMLDocument<P extends object>(
  templateComponent: ComponentType<P>,
  props: P
): string {
  console.log("📄 [templateToHTML] generateFullHTMLDocument DIPANGGIL");
  console.log("📄 [templateToHTML] templateComponent:", (templateComponent as any)?.name || "anonymous");
  console.log("📄 [templateToHTML] props keys:", Object.keys(props || {}));
  
  // Render React component to static HTML
  const templateHTML = renderToStaticMarkup(
    createElement(templateComponent, props)
  );
  
  console.log("📄 [templateToHTML] templateHTML length:", templateHTML.length);
  
  // Get all compiled CSS
  const compiledCSS = getCompiledCSS();
  console.log("📄 [templateToHTML] compiledCSS length:", compiledCSS.length);
  
  const pdfOverrides = getPDFOverrideCSS();
  
  // Build complete HTML document with Google Fonts
  const fullHTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    /* ======== CSS Variables & Compiled Styles ======== */
    ${compiledCSS}
    
    /* ======== PDF Generation Overrides ======== */
    ${pdfOverrides}
    
    /* ======== Force Print Color Rendering ======== */
    @page { 
      size: A4 portrait; 
      margin: 0; 
    }
    
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: white;">
  ${templateHTML}
</body>
</html>`;

  console.log("📄 [templateToHTML] FULL HTML length:", fullHTML.length);
  return fullHTML;
}

/**
 * Generate HTML for multi-page document (Invoice + Rincian)
 */
export function generateMultiPageHTMLDocument(pages: Array<{
  component: ComponentType<any>;
  props: any;
}>): string {
  // Render all pages
  const pagesHTML = pages.map((page, index) => {
    const pageHTML = renderToStaticMarkup(
      createElement(page.component, page.props)
    );
    
    // Add page break between pages (except last)
    const pageBreak = index < pages.length - 1 
      ? '<div class="print-page-break" style="page-break-after: always;"></div>' 
      : '';
    
    return `<div class="print-page">${pageHTML}</div>${pageBreak}`;
  }).join('\n');
  
  // Get all compiled CSS
  const compiledCSS = getCompiledCSS();
  const pdfOverrides = getPDFOverrideCSS();
  
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    /* ======== CSS Variables & Compiled Styles ======== */
    ${compiledCSS}
    
    /* ======== PDF Generation Overrides ======== */
    ${pdfOverrides}
    
    /* ======== Force Print Color Rendering ======== */
    @page { 
      size: A4 portrait; 
      margin: 0; 
    }
    
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: white;">
  <div class="print-container">
    ${pagesHTML}
  </div>
</body>
</html>`;
}
