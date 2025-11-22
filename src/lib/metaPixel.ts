// Meta Pixel (Facebook Pixel) utility functions

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export interface MetaPixelConfig {
  pixelId: string;
  enabled?: boolean;
}

export interface MetaEventParams {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  contact_method?: string;
  [key: string]: any;
}

let isInitialized = false;
let pixelId: string | null = null;

/**
 * Initialize Meta Pixel
 */
export const initMetaPixel = (config: MetaPixelConfig) => {
  if (isInitialized || typeof window === "undefined") return;

  pixelId = config.pixelId;

  if (!config.enabled || !pixelId) {
    console.log("Meta Pixel disabled or no pixel ID provided");
    return;
  }

  // Load Facebook Pixel script
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");

  isInitialized = true;
  console.log("Meta Pixel initialized:", pixelId);
};

/**
 * Track standard Meta event
 */
export const trackEvent = (eventName: string, params?: MetaEventParams) => {
  if (typeof window === "undefined" || !window.fbq) {
    console.warn("Meta Pixel not initialized");
    return;
  }

  try {
    window.fbq("track", eventName, params);
    console.log("Meta Event tracked:", eventName, params);
  } catch (error) {
    console.error("Error tracking Meta event:", error);
  }
};

/**
 * Track custom Meta event
 */
export const trackCustomEvent = (eventName: string, params?: MetaEventParams) => {
  if (typeof window === "undefined" || !window.fbq) {
    console.warn("Meta Pixel not initialized");
    return;
  }

  try {
    window.fbq("trackCustom", eventName, params);
    console.log("Custom Meta Event tracked:", eventName, params);
  } catch (error) {
    console.error("Error tracking custom Meta event:", error);
  }
};

/**
 * Standard Events
 */
export const MetaEvents = {
  // Standard events
  PageView: () => trackEvent("PageView"),
  
  ViewContent: (params: MetaEventParams) => trackEvent("ViewContent", params),
  
  Contact: (params?: { contact_method?: string }) => 
    trackEvent("Contact", params),
  
  Lead: (params?: MetaEventParams) => trackEvent("Lead", params),
  
  CompleteRegistration: (params?: MetaEventParams) => 
    trackEvent("CompleteRegistration", params),
  
  Search: (params?: { search_string?: string }) => 
    trackEvent("Search", params),
  
  AddToCart: (params?: MetaEventParams) => trackEvent("AddToCart", params),
  
  InitiateCheckout: (params?: MetaEventParams) => 
    trackEvent("InitiateCheckout", params),
  
  Purchase: (params?: MetaEventParams) => trackEvent("Purchase", params),
};

/**
 * Track page view (SPA navigation)
 */
export const trackPageView = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
};

/**
 * Get current pixel ID
 */
export const getPixelId = () => pixelId;

/**
 * Check if pixel is initialized
 */
export const isPixelInitialized = () => isInitialized;
