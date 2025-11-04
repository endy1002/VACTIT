/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vactit/ui', '@vactit/config', '@vactit/types'],
};

module.exports = nextConfig;
