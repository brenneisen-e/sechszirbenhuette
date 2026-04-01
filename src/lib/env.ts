/**
 * Environment variable validation.
 *
 * Validates that all required public (non-secret) environment variables
 * defined in wrangler.toml [vars] are present at runtime.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Current deployment environment (e.g. "production") */
export const ENVIRONMENT = requireEnv('ENVIRONMENT');

/** Public URL for the R2 media bucket */
export const PUBLIC_R2_URL = requireEnv('PUBLIC_R2_URL');

/** Cloudflare account ID */
export const CLOUDFLARE_ACCOUNT_ID = requireEnv('CLOUDFLARE_ACCOUNT_ID');

/** Subdomain used for Cloudflare Stream videos */
export const CLOUDFLARE_STREAM_SUBDOMAIN = requireEnv('CLOUDFLARE_STREAM_SUBDOMAIN');

/** Account hash used for Cloudflare Images URLs */
export const CLOUDFLARE_IMAGES_ACCOUNT_HASH = requireEnv('CLOUDFLARE_IMAGES_ACCOUNT_HASH');
