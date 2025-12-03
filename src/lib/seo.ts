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
 * FAQ Schema for Landing Page
 */
export const getFAQSchema = () => ({
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Berapa harga sewa scaffolding di Bali?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Harga sewa scaffolding di Bali mulai dari Rp 25.000 per set per hari. Harga bervariasi tergantung jenis scaffolding (Ring Lock, Cup Lock, Frame), durasi sewa, dan lokasi proyek. Kami menawarkan harga kompetitif dengan kualitas terjamin.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah tersedia pengiriman scaffolding ke seluruh Bali?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya, kami melayani pengiriman scaffolding ke seluruh area Bali termasuk Denpasar, Badung, Gianyar, Tabanan, Buleleng, Karangasem, Klungkung, Bangli, dan Jembrana. Pengiriman cepat dalam 24 jam.",
      },
    },
    {
      "@type": "Question",
      name: "Apa saja jenis scaffolding yang tersedia untuk disewa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kami menyediakan berbagai jenis scaffolding: Ring Lock Scaffolding untuk konstruksi berat, Cup Lock Scaffolding untuk proyek menengah, dan Frame Scaffolding untuk pekerjaan standar. Semua scaffolding certified dan telah diuji keamanannya.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah scaffolding sudah termasuk pemasangan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kami menyediakan layanan pemasangan dan pembongkaran scaffolding dengan tim teknisi profesional berpengalaman. Layanan instalasi dapat ditambahkan sesuai kebutuhan proyek Anda.",
      },
    },
    {
      "@type": "Question",
      name: "Berapa lama minimal durasi sewa scaffolding?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Minimal durasi sewa adalah 1 minggu. Kami juga menawarkan paket sewa bulanan dengan harga lebih ekonomis untuk proyek jangka panjang.",
      },
    },
  ],
});

/**
 * Service Schema
 */
export const getServiceSchema = () => ({
  "@type": "Service",
  serviceType: "Scaffolding Rental",
  name: "Sewa Scaffolding Bali",
  description: "Jasa sewa scaffolding profesional untuk proyek konstruksi, renovasi, dan event di Bali",
  provider: {
    "@type": "LocalBusiness",
    name: "Sewa Scaffolding Bali",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Denpasar",
      addressRegion: "Bali",
      addressCountry: "ID",
    },
  },
  areaServed: {
    "@type": "State",
    name: "Bali",
    containedInPlace: {
      "@type": "Country",
      name: "Indonesia",
    },
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Layanan Scaffolding",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Ring Lock Scaffolding",
          description: "Scaffolding heavy-duty untuk konstruksi besar",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Cup Lock Scaffolding",
          description: "Scaffolding untuk proyek menengah",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Frame Scaffolding",
          description: "Scaffolding standar untuk proyek umum",
        },
      },
    ],
  },
});

/**
 * Aggregate Rating Schema
 */
export const getAggregateRatingSchema = () => ({
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#rating`,
  name: "Sewa Scaffolding Bali",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "127",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: "Budi Santoso",
      },
      datePublished: "2024-11-15",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
      },
      reviewBody: "Pelayanan sangat profesional, scaffolding berkualitas dan pengiriman tepat waktu. Sangat recommended!",
    },
    {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: "Made Wijaya",
      },
      datePublished: "2024-10-20",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
      },
      reviewBody: "Harga terjangkau dengan kualitas scaffolding yang bagus. Tim pemasangan juga sangat profesional.",
    },
  ],
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
