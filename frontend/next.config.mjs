/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 요청을 백엔드로 프록시
  async rewrites() {
    return [
      {
        source: '/images/:path*',
        destination: 'https://api.tradediary.site/images/:path*',
      },
    ];
  },
};

export default nextConfig;
