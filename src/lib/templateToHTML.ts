/**
 * Template to HTML Converter
 * Renders React components to full HTML documents with embedded CSS
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, ComponentType } from 'react';

/**
 * Extract all compiled CSS from the current document
 * This captures Tailwind + custom CSS from index.css
 */
function getCompiledCSS(): string {
  const styleSheets = Array.from(document.styleSheets);
  let css = '';
  
  styleSheets.forEach(sheet => {
    try {
      // Only process same-origin stylesheets
      const rules = Array.from(sheet.cssRules || []);
      rules.forEach(rule => {
        css += rule.cssText + '\n';
      });
    } catch (e) {
      // Skip external stylesheets (CORS restrictions)
      console.warn('Could not access stylesheet:', sheet.href);
    }
  });
  
  return css;
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
    
    /* Preserve transforms for watermark and stamp */
    .watermark-centered {
      transform: translate(-50%, -50%) rotate(-45deg) !important;
    }
    
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
  
  // Build complete HTML document
  const fullHTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    ${compiledCSS}
    ${pdfOverrides}
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
  <style>
    ${compiledCSS}
    ${pdfOverrides}
  </style>
</head>
<body style="margin: 0; padding: 0; background: white;">
  <div class="print-container">
    ${pagesHTML}
  </div>
</body>
</html>`;
}
