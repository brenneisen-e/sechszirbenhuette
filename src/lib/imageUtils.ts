/**
 * Cloudflare Image Resizing utilities
 *
 * Cloudflare Image Resizing transforms images on-the-fly through their CDN.
 * Free tier includes a generous amount of transformations.
 *
 * @see https://developers.cloudflare.com/images/transform-images/
 */

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  format?: 'auto' | 'webp' | 'avif' | 'json';
  blur?: number;
}

/**
 * Transform image URL to use Cloudflare Image Resizing
 * Note: Currently disabled - returns original URL
 * Cloudflare Image Resizing requires a custom domain with Cloudflare DNS
 *
 * @param url - Original image URL
 * @param options - Resize options (currently unused)
 * @returns Original URL (resizing disabled)
 */
export function getCloudflareImageUrl(url: string, _options: ImageResizeOptions = {}): string {
  // Cloudflare Image Resizing is disabled - return original URL
  // To enable, add domain to Cloudflare DNS and configure R2 custom domain
  return url;
}

/**
 * Get thumbnail URL (small preview)
 */
export function getThumbnailUrl(url: string): string {
  return getCloudflareImageUrl(url, {
    width: 200,
    quality: 50,
  });
}

/**
 * Get medium-sized image URL (for cards, grid items)
 */
export function getMediumImageUrl(url: string): string {
  return getCloudflareImageUrl(url, {
    width: 600,
    quality: 70,
  });
}

/**
 * Get large image URL (for hero, full-width sections)
 */
export function getLargeImageUrl(url: string): string {
  return getCloudflareImageUrl(url, {
    width: 1200,
    quality: 80,
  });
}

/**
 * Get responsive image srcset for different screen sizes
 */
export function getResponsiveSrcSet(url: string): string {
  const sizes = [400, 800, 1200, 1600];
  return sizes
    .map(width => `${getCloudflareImageUrl(url, { width, quality: 75 })} ${width}w`)
    .join(', ');
}
