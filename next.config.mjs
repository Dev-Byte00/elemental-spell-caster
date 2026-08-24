/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate canvas/audio init in development
  swcMinify: true
};

export default nextConfig;
