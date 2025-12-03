import { useEffect } from "react";
import { setSEO, setStructuredData, cleanupSEO, SEOConfig } from "@/lib/seo";

interface SEOHeadProps extends SEOConfig {
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * SEOHead Component - Add SEO meta tags and structured data to pages
 * 
 * Usage:
 * ```tsx
 * <SEOHead 
 *   title="Page Title"
 *   description="Page description"
 *   canonical="/page-url"
 *   structuredData={getLocalBusinessSchema()}
 * />
 * ```
 */
export const SEOHead = ({ structuredData, ...seoConfig }: SEOHeadProps) => {
  useEffect(() => {
    // Set SEO meta tags
    setSEO(seoConfig);

    // Add structured data
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        structuredData.forEach((data) => setStructuredData(data));
      } else {
        setStructuredData(structuredData);
      }
    }

    // Cleanup on unmount
    return () => {
      cleanupSEO();
    };
  }, [seoConfig.title, seoConfig.description, seoConfig.canonical]);

  return null;
};

export default SEOHead;
