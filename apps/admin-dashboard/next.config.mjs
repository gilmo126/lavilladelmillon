/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'async_hooks': 'node:async_hooks',
      };
    }
    return config;
  },
  experimental: {
    turbopack: {
      resolveAlias: {
        'async_hooks': 'node:async_hooks',
      },
    },
  },
};

export default nextConfig;
