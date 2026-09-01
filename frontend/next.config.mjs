/** @type {import('next').NextConfig} */
const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const nextConfig = {
  output: 'standalone',
  // Keep browser requests same-origin in development and standalone deployments.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/:path*`,
      },
      {
        source: '/images/:path*',
        destination: `${apiBase}/images/:path*`,
      },
    ];
  },
};

export default nextConfig;
