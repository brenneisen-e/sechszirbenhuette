/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for Cloudflare Pages
  images: {
    unoptimized: true,
  },

  // Skip ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable experimental features for better Cloudflare compatibility
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Erhöhe Body-Limit für Bild-Uploads (100MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
