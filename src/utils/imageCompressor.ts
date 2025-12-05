export interface CompressOptions {
  maxSizeKB: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Wrap a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message when timeout occurs
 * @returns Promise that rejects if timeout exceeded
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Compress image using Canvas API
 * @param file - Original file to compress
 * @param options - Compression options
 * @returns Compressed Blob
 */
export async function compressImage(file: File, options: CompressOptions): Promise<Blob> {
  const { maxSizeKB, maxWidth = 2000, maxHeight = 2000, quality = 0.9 } = options;
  const maxSizeBytes = maxSizeKB * 1024;

  // Load image
  const img = await loadImage(file);
  
  // Calculate new dimensions
  let { width, height } = img;
  
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Determine output type
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  
  // Iteratively reduce quality until file size is acceptable
  let currentQuality = quality;
  let blob: Blob | null = null;
  
  while (currentQuality > 0.1) {
    blob = await canvasToBlob(canvas, outputType, currentQuality);
    
    if (blob.size <= maxSizeBytes) {
      break;
    }
    
    currentQuality -= 0.1;
  }
  
  // If still too large after quality reduction, resize further
  if (blob && blob.size > maxSizeBytes) {
    let scale = 0.9;
    while (blob.size > maxSizeBytes && scale > 0.1) {
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      blob = await canvasToBlob(canvas, outputType, 0.8);
      scale -= 0.1;
    }
  }
  
  if (!blob) {
    throw new Error('Failed to compress image');
  }
  
  return blob;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to blob failed'));
      },
      type,
      quality
    );
  });
}

/**
 * Check if file type can be compressed
 */
export function isCompressibleImage(file: File): boolean {
  const compressibleTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  return compressibleTypes.includes(file.type);
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
