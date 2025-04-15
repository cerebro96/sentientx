/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable ESLint in production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add rewrites to proxy API requests to the backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 