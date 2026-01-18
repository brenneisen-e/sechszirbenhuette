/**
 * Cloudflare Image Resizing utilities
 *
 * Cloudflare Image Resizing transforms images on-the-fly through their CDN.
 * Free tier includes a generous amount of transformations.
 *
 * @see https://developers.cloudflare.com/images/transform-images/
 */

// Public R2 URL for media serving (enables Cloudflare Image Resizing)
const PUBLIC_R2_URL = 'https://media.sechszirbenhuette.com';

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  format?: 'auto' | 'webp' | 'avif' | 'json';
  blur?: number;
}

/**
 * Convert an API media URL to public R2 URL
 * API URLs like /api/admin/media/file/category/filename.jpg
 * become https://media.sechszirbenhuette.com/category/filename.jpg
 */
export function getPublicMediaUrl(url: string): string {
  if (!url) return url;

  // Check if it's an API URL that needs conversion
  const apiPrefix = '/api/admin/media/file/';
  if (url.startsWith(apiPrefix)) {
    const fileKey = url.substring(apiPrefix.length);
    return `${PUBLIC_R2_URL}/${fileKey}`;
  }

  return url;
}

/**
 * Transform image URL to use Cloudflare Image Resizing
 * Only works for images served through Cloudflare
 *
 * @param url - Original image URL
 * @param options - Resize options
 * @returns Transformed URL with Cloudflare Image Resizing parameters
 */
export function getCloudflareImageUrl(url: string, options: ImageResizeOptions = {}): string {
  // Skip if not an image URL, is a data URL, or already transformed
  if (!url || url.startsWith('data:') || url.includes('/cdn-cgi/image/')) {
    return url;
  }

  // Skip for local development (localhost doesn't have Cloudflare)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return url;
  }

  // Convert API URLs to public R2 URLs for Cloudflare Image Resizing
  const publicUrl = getPublicMediaUrl(url);

  // Skip for external URLs that aren't our R2 bucket
  if (publicUrl.startsWith('http') && !publicUrl.includes('media.sechszirbenhuette.com')) {
    if (typeof window !== 'undefined' && !publicUrl.includes(window.location.hostname)) {
      return publicUrl;
    }
  }

  const {
    width,
    height,
    quality = 75,
    fit = 'cover',
    format = 'auto',
  } = options;

  try {
    const urlObj = new URL(publicUrl, typeof window !== 'undefined' ? window.location.origin : 'https://sechszirbenhuette.pages.dev');

    // Build resize parameters
    const params: string[] = [];
    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    params.push(`quality=${quality}`);
    params.push(`fit=${fit}`);
    params.push(`format=${format}`);

    const resizeParams = params.join(',');

    // For R2 URLs, use the R2 domain for resizing
    // Format: https://media.sechszirbenhuette.com/cdn-cgi/image/params/path
    return `${urlObj.origin}/cdn-cgi/image/${resizeParams}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, return public URL
    return publicUrl;
  }
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
