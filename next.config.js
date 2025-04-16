/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable ESLint in production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure rewrites to handle both local and backend API routes
  async rewrites() {
    return [
      // Then, send all /api/* routes to the backend
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 