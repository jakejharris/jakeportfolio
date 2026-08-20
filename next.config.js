/** @type {import('next').NextConfig} */
if (process.env.VERCEL_ENV === 'production') {
  const missingGaEnv = ['GA_PROPERTY_ID', 'GA_SERVICE_ACCOUNT_JSON']
    .filter((name) => !process.env[name]);

  if (missingGaEnv.length > 0) {
    throw new Error(
      `Missing required GA4 production environment variables: ${missingGaEnv.join(', ')}`
    );
  }
}

const nextConfig = {
  /* config options here */
  trailingSlash: true,
  experimental: {
    scrollRestoration: false,
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
