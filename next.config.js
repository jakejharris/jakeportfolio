const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'browsing-topics=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  trailingSlash: true,
  async redirects() {
    return [
      { source: '/jspark3deepseek', destination: '/jspark3/deepseek/', permanent: true },
      { source: '/jspark3glm', destination: '/jspark3/glm/', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/((?!studio(?:/|$)).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
    ];
  },
  experimental: {
    scrollRestoration: false,
  },
  outputFileTracingIncludes: {
    '**/opengraph-image*': [
      './public/fonts/Sentient-Bold.woff',
      './node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf',
      './node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf',
    ],
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript during production builds
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
};

module.exports = nextConfig;
