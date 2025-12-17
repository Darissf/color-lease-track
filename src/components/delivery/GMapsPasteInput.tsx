import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Check, AlertCircle, Link2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  parseGoogleMapsUrl, 
  isGoogleMapsUrl, 
  isGoogleMapsShortLink,
  isValidCoordinates,
  formatCoordinates,
  ParsedLocation 
} from '@/utils/googleMapsParser';

interface GMapsPasteInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onLocationParsed: (lat: number, lng: number, address?: string) => void;
  onLinkChange?: (link: string) => void;
  className?: string;
}

export const GMapsPasteInput = ({
  label = 'Link Google Maps',
  placeholder = 'Paste link Google Maps disini...',
  value = '',
  onLocationParsed,
  onLinkChange,
  className = '',
}: GMapsPasteInputProps) => {
  const [link, setLink] = useState(value);
  const [status, setStatus] = useState<'idle' | 'resolving' | 'valid' | 'invalid'>('idle');
  const [parsedLocation, setParsedLocation] = useState<ParsedLocation | null>(null);

  useEffect(() => {
    if (value !== link) {
      setLink(value);
    }
  }, [value]);

  const resolveShortLink = async (shortUrl: string): Promise<ParsedLocation | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('resolve-gmaps-shortlink', {
        body: { shortUrl }
      });

      if (error) {
        console.error('Error resolving short link:', error);
        return null;
      }

      if (data?.success && data?.lat && data?.lng) {
        return {
          lat: data.lat,
          lng: data.lng,
          address: data.address
        };
      }

      return null;
    } catch (err) {
      console.error('Failed to resolve short link:', err);
      return null;
    }
  };

  const handleParse = async (inputLink: string) => {
    if (!inputLink.trim()) {
      setStatus('idle');
      setParsedLocation(null);
      return;
    }

    // Check if it's a short link that needs resolution
    if (isGoogleMapsShortLink(inputLink)) {
      setStatus('resolving');
      const resolved = await resolveShortLink(inputLink);
      
      if (resolved && isValidCoordinates(resolved.lat, resolved.lng)) {
        setStatus('valid');
        setParsedLocation(resolved);
        onLocationParsed(resolved.lat, resolved.lng, resolved.address);
      } else {
        setStatus('invalid');
        setParsedLocation(null);
      }
      return;
    }

    // Check if it's a valid Google Maps URL
    if (!isGoogleMapsUrl(inputLink)) {
      setStatus('invalid');
      setParsedLocation(null);
      return;
    }

    // Try to parse coordinates directly from the URL
    const result = parseGoogleMapsUrl(inputLink);
    
    if (result && isValidCoordinates(result.lat, result.lng)) {
      setStatus('valid');
      setParsedLocation(result);
      onLocationParsed(result.lat, result.lng, result.address);
    } else {
      setStatus('invalid');
      setParsedLocation(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    setLink(newLink);
    onLinkChange?.(newLink);
    
    // Auto-parse on paste (detected by rapid input)
    if (newLink.length > 20 && (isGoogleMapsUrl(newLink) || isGoogleMapsShortLink(newLink))) {
      handleParse(newLink);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    // Let the onChange handle the update, then parse
    setTimeout(() => handleParse(pastedText), 0);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-2 text-muted-foreground">
        <Link2 className="h-4 w-4" />
        {label}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={link}
            onChange={handleChange}
            onPaste={handlePaste}
            placeholder={placeholder}
            className={`pr-10 ${
              status === 'valid' 
                ? 'border-green-500 focus-visible:ring-green-500' 
                : status === 'invalid' 
                  ? 'border-destructive focus-visible:ring-destructive' 
                  : ''
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {status === 'resolving' && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
            {status === 'valid' && <Check className="h-4 w-4 text-green-500" />}
            {status === 'invalid' && <AlertCircle className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handleParse(link)}
          disabled={status === 'resolving'}
          title="Parse Link"
        >
          {status === 'resolving' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {status === 'resolving' && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Mengambil koordinat dari short link...
        </p>
      )}
      
      {status === 'valid' && parsedLocation && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Koordinat: {formatCoordinates(parsedLocation.lat, parsedLocation.lng)}
          {parsedLocation.address && (
            <span className="text-muted-foreground ml-2">
              ({parsedLocation.address})
            </span>
          )}
        </p>
      )}
      
      {status === 'invalid' && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Link tidak valid atau koordinat tidak ditemukan
        </p>
      )}
    </div>
  );
};
