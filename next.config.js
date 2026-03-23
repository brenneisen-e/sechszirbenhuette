/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: '*.cloudflarestream.com' },
      { protocol: 'https', hostname: 'videodelivery.net' },
      { protocol: 'https', hostname: 'customer-0p71nv70kmvniiuy.cloudflarestream.com' },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
