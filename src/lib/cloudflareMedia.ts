/**
 * Cloudflare Stream + Images API wrapper
 *
 * Stream: Video upload, playback URLs, thumbnails
 * Images: Image upload, delivery URLs with variants
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

interface CloudflareCredentials {
  accountId: string;
  apiToken: string;
  streamSubdomain?: string;
}

// ============================================================================
// IMAGES
// ============================================================================

export interface CFImageUploadResult {
  id: string;
  filename: string;
  variants: string[];
}

/**
 * Upload an image to Cloudflare Images
 */
export async function uploadImage(
  creds: CloudflareCredentials,
  file: ArrayBuffer | Uint8Array,
  filename: string,
  metadata?: Record<string, string>
): Promise<CFImageUploadResult> {
  const formData = new FormData();
  formData.append('file', new Blob([file as BlobPart]), filename);

  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  const res = await fetch(
    `${CF_API_BASE}/${creds.accountId}/images/v1`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${creds.apiToken}` },
      body: formData,
    }
  );

  const data = await res.json() as {
    success: boolean;
    errors?: { message: string }[];
    result?: { id: string; filename: string; variants: string[] };
  };

  if (!data.success || !data.result) {
    throw new Error(`CF Images upload failed: ${data.errors?.[0]?.message || 'Unknown error'}`);
  }

  return data.result;
}

/**
 * Delete an image from Cloudflare Images
 */
export async function deleteImage(
  creds: CloudflareCredentials,
  imageId: string
): Promise<void> {
  const res = await fetch(
    `${CF_API_BASE}/${creds.accountId}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${creds.apiToken}` },
    }
  );

  if (!res.ok) {
    const data = await res.json() as { errors?: { message: string }[] };
    throw new Error(`CF Images delete failed: ${data.errors?.[0]?.message || res.statusText}`);
  }
}

/**
 * Get a Cloudflare Images delivery URL for a given variant
 * Variants: public, thumbnail, gallery, hero, blog, card
 */
export function getImageUrl(imageId: string, variant: string = 'public'): string {
  // The delivery URL format uses the account hash from the first variant URL
  // But we can also construct it if we know the account hash
  // For now, we store the full variant URL from the upload response
  return `https://imagedelivery.net/${imageId}/${variant}`;
}

/**
 * Extract the account hash from a Cloudflare Images variant URL
 * URL format: https://imagedelivery.net/{accountHash}/{imageId}/{variant}
 */
export function parseImageUrl(variantUrl: string): { accountHash: string; imageId: string; variant: string } | null {
  const match = variantUrl.match(/imagedelivery\.net\/([^/]+)\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { accountHash: match[1], imageId: match[2], variant: match[3] };
}

/**
 * Build delivery URL from account hash + image ID
 */
export function buildImageDeliveryUrl(accountHash: string, imageId: string, variant: string = 'public'): string {
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
}

// ============================================================================
// STREAM (Videos)
// ============================================================================

export interface CFStreamUploadResult {
  uid: string;
  thumbnail: string;
  playback: {
    hls: string;
    dash: string;
  };
  status: {
    state: string;
  };
  duration?: number;
}

/**
 * Upload a video to Cloudflare Stream
 */
export async function uploadVideo(
  creds: CloudflareCredentials,
  file: ArrayBuffer | Uint8Array,
  filename: string,
  metadata?: Record<string, string>
): Promise<CFStreamUploadResult> {
  const formData = new FormData();
  formData.append('file', new Blob([file as BlobPart]), filename);
  // Make video publicly accessible (no signed URLs required)
  formData.append('requireSignedURLs', 'false');

  if (metadata) {
    formData.append('meta', JSON.stringify(metadata));
  }

  const res = await fetch(
    `${CF_API_BASE}/${creds.accountId}/stream`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${creds.apiToken}` },
      body: formData,
    }
  );

  const data = await res.json() as {
    success: boolean;
    errors?: { message: string }[];
    result?: CFStreamUploadResult;
  };

  if (!data.success || !data.result) {
    throw new Error(`CF Stream upload failed: ${data.errors?.[0]?.message || 'Unknown error'}`);
  }

  return data.result;
}

/**
 * Delete a video from Cloudflare Stream
 */
export async function deleteVideo(
  creds: CloudflareCredentials,
  streamUid: string
): Promise<void> {
  const res = await fetch(
    `${CF_API_BASE}/${creds.accountId}/stream/${streamUid}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${creds.apiToken}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    throw new Error(`CF Stream delete failed: ${res.statusText}`);
  }
}

/**
 * Check video processing status
 */
export async function getVideoStatus(
  creds: CloudflareCredentials,
  streamUid: string
): Promise<CFStreamUploadResult | null> {
  const res = await fetch(
    `${CF_API_BASE}/${creds.accountId}/stream/${streamUid}`,
    {
      headers: { 'Authorization': `Bearer ${creds.apiToken}` },
    }
  );

  if (!res.ok) return null;

  const data = await res.json() as {
    success: boolean;
    result?: CFStreamUploadResult;
  };

  return data.result || null;
}

/**
 * Get HLS playback URL for a Stream video
 */
export function getStreamHlsUrl(streamUid: string, subdomain?: string): string {
  if (subdomain) {
    return `https://${subdomain}/${streamUid}/manifest/video.m3u8`;
  }
  return `https://videodelivery.net/${streamUid}/manifest/video.m3u8`;
}

/**
 * Get Stream thumbnail URL
 */
export function getStreamThumbnailUrl(
  streamUid: string,
  subdomain?: string,
  options?: { time?: string; width?: number; height?: number }
): string {
  const base = subdomain
    ? `https://${subdomain}/${streamUid}/thumbnails/thumbnail.jpg`
    : `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg`;

  const params = new URLSearchParams();
  if (options?.time) params.set('time', options.time);
  if (options?.width) params.set('width', String(options.width));
  if (options?.height) params.set('height', String(options.height));

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Get Stream embed/iframe URL
 */
export function getStreamEmbedUrl(streamUid: string, subdomain?: string): string {
  if (subdomain) {
    return `https://${subdomain}/${streamUid}/iframe`;
  }
  return `https://iframe.videodelivery.net/${streamUid}`;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract credentials from Cloudflare env.
 * Falls back to reading CLOUDFLARE_API_TOKEN from the D1 settings table
 * if not set as an environment variable.
 */
export function getCredentials(env: {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_STREAM_SUBDOMAIN?: string;
}): CloudflareCredentials | null {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    return null;
  }
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    streamSubdomain: env.CLOUDFLARE_STREAM_SUBDOMAIN,
  };
}

/**
 * Get credentials with DB fallback for the API token.
 * Checks env vars first, then falls back to the settings table in D1.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCredentialsWithDb(env: any): Promise<CloudflareCredentials | null> {
  // Try env vars first
  const fromEnv = getCredentials(env);
  if (fromEnv) return fromEnv;

  // Fallback: read token from DB settings
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.DB) return null;

  try {
    const db = env.DB as D1Database;
    const result = await db.prepare(
      "SELECT value FROM settings WHERE key = 'cloudflare_api_token'"
    ).first<{ value: string }>();

    if (result?.value) {
      return {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: result.value,
        streamSubdomain: env.CLOUDFLARE_STREAM_SUBDOMAIN,
      };
    }
  } catch {
    // Settings table might not exist yet
  }

  return null;
}

/**
 * Detect if a file is a video based on content type or extension
 */
export function isVideoFile(filename: string, contentType?: string): boolean {
  if (contentType?.startsWith('video/')) return true;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'm4v'].includes(ext || '');
}

/**
 * Detect if a file is an image based on content type or extension
 */
export function isImageFile(filename: string, contentType?: string): boolean {
  if (contentType?.startsWith('image/')) return true;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'].includes(ext || '');
}
