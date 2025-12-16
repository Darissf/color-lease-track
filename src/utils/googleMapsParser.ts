/**
 * Google Maps URL Parser
 * Extracts latitude, longitude, and address from various Google Maps URL formats
 */

export interface ParsedLocation {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Parse Google Maps URL and extract coordinates
 * Supports multiple formats:
 * - https://maps.google.com/?q=-8.6500,115.2167
 * - https://www.google.com/maps/place/.../@-8.6500,115.2167,17z
 * - https://www.google.com/maps/@-8.6500,115.2167,17z
 * - https://goo.gl/maps/xxxxx (requires redirect resolution)
 * - https://maps.app.goo.gl/xxxxx (requires redirect resolution)
 */
export const parseGoogleMapsUrl = (url: string): ParsedLocation | null => {
  if (!url || typeof url !== 'string') return null;

  const trimmedUrl = url.trim();

  // Pattern 1: ?q=lat,lng or ?q=lat+lng
  const qPattern = /[?&]q=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/;
  const qMatch = trimmedUrl.match(qPattern);
  if (qMatch) {
    return {
      lat: parseFloat(qMatch[1]),
      lng: parseFloat(qMatch[2]),
    };
  }

  // Pattern 2: /@lat,lng,zoom or /@lat,lng
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = trimmedUrl.match(atPattern);
  if (atMatch) {
    return {
      lat: parseFloat(atMatch[1]),
      lng: parseFloat(atMatch[2]),
    };
  }

  // Pattern 3: /place/name/@lat,lng - extract place name as address
  const placePattern = /\/place\/([^/@]+)\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const placeMatch = trimmedUrl.match(placePattern);
  if (placeMatch) {
    const addressEncoded = placeMatch[1];
    const address = decodeURIComponent(addressEncoded.replace(/\+/g, ' '));
    return {
      lat: parseFloat(placeMatch[2]),
      lng: parseFloat(placeMatch[3]),
      address: address,
    };
  }

  // Pattern 4: ll=lat,lng (legacy format)
  const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const llMatch = trimmedUrl.match(llPattern);
  if (llMatch) {
    return {
      lat: parseFloat(llMatch[1]),
      lng: parseFloat(llMatch[2]),
    };
  }

  // Pattern 5: !3d lat !4d lng (embedded map format)
  const embedPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
  const embedMatch = trimmedUrl.match(embedPattern);
  if (embedMatch) {
    return {
      lat: parseFloat(embedMatch[1]),
      lng: parseFloat(embedMatch[2]),
    };
  }

  // Pattern 6: data=!3m1!4b1!4m...!3d lat!4d lng (new embed format)
  const dataPattern = /!3d(-?\d+\.?\d*).*?!4d(-?\d+\.?\d*)/;
  const dataMatch = trimmedUrl.match(dataPattern);
  if (dataMatch) {
    return {
      lat: parseFloat(dataMatch[1]),
      lng: parseFloat(dataMatch[2]),
    };
  }

  return null;
};

/**
 * Check if URL is a Google Maps short link that needs resolution
 */
export const isGoogleMapsShortLink = (url: string): boolean => {
  if (!url) return false;
  return (
    url.includes('goo.gl/maps') ||
    url.includes('maps.app.goo.gl') ||
    url.includes('g.co/maps')
  );
};

/**
 * Check if URL is a valid Google Maps URL
 */
export const isGoogleMapsUrl = (url: string): boolean => {
  if (!url) return false;
  const trimmedUrl = url.trim().toLowerCase();
  return (
    trimmedUrl.includes('google.com/maps') ||
    trimmedUrl.includes('maps.google.com') ||
    trimmedUrl.includes('goo.gl/maps') ||
    trimmedUrl.includes('maps.app.goo.gl') ||
    trimmedUrl.includes('g.co/maps')
  );
};

/**
 * Validate parsed coordinates are within valid ranges
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return (
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

/**
 * Generate Google Maps URL from coordinates
 */
export const generateGoogleMapsUrl = (lat: number, lng: number): string => {
  return `https://www.google.com/maps?q=${lat},${lng}`;
};
