import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Médias produits : livraison directe Cloudinary via Image unoptimized.
  // Ne pas autoriser leur copie dans le cache disque de l'optimiseur Next.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www\\.gaindesportif\\.com' }],
        destination: 'https://gaindesportif.com/:path*',
        permanent: true,
      },
      { source: '/admin', destination: '/administration', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/administration/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/compte/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};
export default nextConfig;
