import { COMPRESSED_MAX_SIZE, MAX_WIDTH, MAX_HEIGHT, HASH_SIZE, CATEGORIES } from './constants';

/**
 * Compresses an image to fit within size and dimension limits
 */
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            if (blob.size > COMPRESSED_MAX_SIZE && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculates a perceptual hash for an image
 * Used for duplicate detection
 */
export async function calculateImageHash(imageSource: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      canvas.width = HASH_SIZE;
      canvas.height = HASH_SIZE;
      ctx?.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE);
      const imageData = ctx?.getImageData(0, 0, HASH_SIZE, HASH_SIZE);
      if (!imageData) {
        reject(new Error('Could not get image data'));
        return;
      }

      const pixels: number[] = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = ((imageData.data[i] ?? 0) + (imageData.data[i + 1] ?? 0) + (imageData.data[i + 2] ?? 0)) / 3;
        pixels.push(gray);
      }

      const average = pixels.reduce((a, b) => a + b, 0) / pixels.length;
      let hash = '';
      for (const pixel of pixels) {
        hash += pixel > average ? '1' : '0';
      }

      let hexHash = '';
      for (let i = 0; i < hash.length; i += 4) {
        hexHash += parseInt(hash.substr(i, 4), 2).toString(16);
      }
      resolve(hexHash);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    if (typeof imageSource === 'string') img.src = imageSource;
    else img.src = URL.createObjectURL(imageSource);
  });
}

/**
 * Calculates the Hamming distance between two hashes
 * Lower values indicate more similar images
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const bits1 = parseInt(hash1[i] ?? '0', 16);
    const bits2 = parseInt(hash2[i] ?? '0', 16);
    let xor = bits1 ^ bits2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Gets the display label for a category value
 */
export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

/**
 * Infers a category from a filename
 */
export function inferCategoryFromFilename(filename: string): string {
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.includes('küche') || lowerFilename.includes('kitchen')) return 'kitchen';
  if (lowerFilename.includes('bad') || lowerFilename.includes('sauna')) return 'bathroom';
  if (lowerFilename.includes('schlaf') || lowerFilename.includes('bett')) return 'bedrooms';
  if (lowerFilename.includes('wohn') || lowerFilename.includes('living')) return 'living';
  if (lowerFilename.includes('umgebung') || lowerFilename.includes('landschaft')) return 'surroundings';
  return 'exterior';
}
