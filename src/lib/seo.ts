// SEO Utility Functions

const SITE_NAME = "Sewa Scaffolding Bali";
const SITE_URL = "https://sewascaffoldingbali.com";

export interface SEOConfig {
  title: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noindex?: boolean;
}

/**
 * Update document title with site name suffix
 */
export const setPageTitle = (title: string, includeSiteName = true) => {
  document.title = includeSiteName ? `${title} | ${SITE_NAME}` : title;
};

/**
 * Update meta tag content
 */
export const setMetaTag = (name: string, content: string, isProperty = false) => {
  const attribute = isProperty ? "property" : "name";
  let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  
  meta.content = content;
};

/**
 * Update canonical URL
 */
export const setCanonical = (url: string) => {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  
  link.href = url.startsWith("http") ? url : `${SITE_URL}${url}`;
};

/**
 * Set all SEO meta tags at once
 */
export const setSEO = (config: SEOConfig) => {
  const {
    title,
    description,
    keywords,
    canonical,
    ogImage,
    ogType = "website",
    publishedTime,
    modifiedTime,
    author,
    noindex,
  } = config;

  // Title
  setPageTitle(title);

  // Description
  if (description) {
    setMetaTag("description", description);
    setMetaTag("og:description", description, true);
    setMetaTag("twitter:description", description);
  }

  // Keywords
  if (keywords) {
    setMetaTag("keywords", keywords);
  }

  // Canonical
  if (canonical) {
    setCanonical(canonical);
    setMetaTag("og:url", canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`, true);
    setMetaTag("twitter:url", canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`);
  }

  // Open Graph
  setMetaTag("og:title", title, true);
  setMetaTag("og:type", ogType, true);
  setMetaTag("og:site_name", SITE_NAME, true);
  setMetaTag("twitter:title", title);
  setMetaTag("twitter:card", "summary_large_image");

  if (ogImage) {
    const imageUrl = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;
    setMetaTag("og:image", imageUrl, true);
    setMetaTag("twitter:image", imageUrl);
  }

  // Article specific
  if (ogType === "article") {
    if (publishedTime) {
      setMetaTag("article:published_time", publishedTime, true);
    }
    if (modifiedTime) {
      setMetaTag("article:modified_time", modifiedTime, true);
    }
    if (author) {
      setMetaTag("article:author", author, true);
    }
  }

  // Robots
  if (noindex) {
    setMetaTag("robots", "noindex, nofollow");
  } else {
    setMetaTag("robots", "index, follow");
  }
};

/**
 * Add JSON-LD structured data to the page
 */
export const setStructuredData = (data: Record<string, unknown>) => {
  // Remove existing structured data with same @type
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach((script) => {
    try {
      const parsed = JSON.parse(script.textContent || "{}");
      if (parsed["@type"] === data["@type"]) {
        script.remove();
      }
    } catch {
      // Ignore parse errors
    }
  });

  // Add new structured data
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    ...data,
  });
  document.head.appendChild(script);
};

/**
 * LocalBusiness Schema for Sewa Scaffolding Bali
 */
export const getLocalBusinessSchema = () => ({
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Sewa Scaffolding Bali",
  alternateName: "Scaffolding Bali",
  description: "Penyedia jasa rental scaffolding profesional di Bali. Menyediakan Ring Lock, Cup Lock, dan Frame Scaffolding untuk berbagai proyek konstruksi.",
  url: SITE_URL,
  telephone: "+62-812-3456-7890",
  email: "info@sewascaffoldingbali.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jl. Bypass Ngurah Rai No. 123",
    addressLocality: "Denpasar",
    addressRegion: "Bali",
    postalCode: "80361",
    addressCountry: "ID",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -8.409518,
    longitude: 115.188919,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  priceRange: "$$",
  currenciesAccepted: "IDR",
  paymentAccepted: "Cash, Bank Transfer",
  areaServed: {
    "@type": "State",
    name: "Bali",
  },
  serviceType: ["Scaffolding Rental", "Scaffolding Installation", "Construction Equipment Rental"],
  image: `${SITE_URL}/og-image.jpg`,
  sameAs: [
    "https://www.instagram.com/sewascaffoldingbali",
    "https://www.facebook.com/sewascaffoldingbali",
  ],
});

/**
 * Article Schema for blog posts
 */
export const getArticleSchema = (article: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedTime: string;
  modifiedTime?: string;
  author?: string;
}) => ({
  "@type": "Article",
  headline: article.title,
  description: article.description,
  url: article.url,
  image: article.image || `${SITE_URL}/og-image.jpg`,
  datePublished: article.publishedTime,
  dateModified: article.modifiedTime || article.publishedTime,
  author: {
    "@type": "Organization",
    name: article.author || "Tim Scaffolding Bali",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.ico`,
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": article.url,
  },
});

/**
 * Organization Schema
 */
export const getOrganizationSchema = () => ({
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Sewa Scaffolding Bali",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/favicon.ico`,
  },
  description: "Penyedia jasa rental scaffolding profesional di Bali dengan pengalaman lebih dari 10 tahun.",
  foundingDate: "2014",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jl. Bypass Ngurah Rai No. 123",
    addressLocality: "Denpasar",
    addressRegion: "Bali",
    postalCode: "80361",
    addressCountry: "ID",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+62-812-3456-7890",
    contactType: "customer service",
    availableLanguage: ["Indonesian", "English"],
  },
  sameAs: [
    "https://www.instagram.com/sewascaffoldingbali",
    "https://www.facebook.com/sewascaffoldingbali",
  ],
});

/**
 * BreadcrumbList Schema
 */
export const getBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
  })),
});

/**
 * Cleanup SEO tags on component unmount
 */
export const cleanupSEO = () => {
  // Reset title
  document.title = `${SITE_NAME} - Rental Scaffolding Profesional & Terpercaya`;
  
  // Remove dynamically added structured data (keep only essential ones)
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  scripts.forEach((script) => {
    try {
      const parsed = JSON.parse(script.textContent || "{}");
      // Keep LocalBusiness schema, remove others
      if (parsed["@type"] !== "LocalBusiness") {
        script.remove();
      }
    } catch {
      // Ignore parse errors
    }
  });
};
