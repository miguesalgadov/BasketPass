/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'pub-basketpass.r2.dev'],
  },
  webpack: (config) => {
    // Required for socket.io-client in Next.js
    config.externals.push({ bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' });
    return config;
  },
};

export default nextConfig;
