/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  trailingSlash: true,
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