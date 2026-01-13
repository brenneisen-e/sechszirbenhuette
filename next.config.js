const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
};

module.exports = withNextIntl(nextConfig);
