import { useEffect } from "react";
import { useBrandSettings } from "./useBrandSettings";

const DEFAULT_FAVICON = "/logo.png";

export const useDynamicFavicon = () => {
  const { settings } = useBrandSettings();

  useEffect(() => {
    const faviconUrl = settings?.favicon_url || DEFAULT_FAVICON;
    
    // Find existing favicon link
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    
    // Determine type based on extension or favicon_type
    let type = "image/png";
    if (settings?.favicon_url) {
      const ext = settings.favicon_url.split('.').pop()?.toLowerCase();
      if (ext === "ico") type = "image/x-icon";
      else if (ext === "png") type = "image/png";
      else if (ext === "jpg" || ext === "jpeg") type = "image/jpeg";
      else if (ext === "svg") type = "image/svg+xml";
    }
    
    link.type = type;
    link.href = faviconUrl;
    
    // Also update apple-touch-icon if it exists
    const appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (appleIcon && settings?.favicon_url) {
      appleIcon.href = settings.favicon_url;
    }
  }, [settings?.favicon_url]);
};
