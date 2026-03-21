/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      // goatwise.app → goatsteward.com
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'goatwise.app' }],
        destination: 'https://goatsteward.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.goatwise.app' }],
        destination: 'https://www.goatsteward.com/:path*',
        permanent: true,
      },
      // herdsteward.com → goatsteward.com (until multi-species is fully branded)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'herdsteward.com' }],
        destination: 'https://goatsteward.com/:path*',
        permanent: false,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.herdsteward.com' }],
        destination: 'https://www.goatsteward.com/:path*',
        permanent: false,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
