/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'], // Evita que se empaqueten cosas pesadas
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'async_hooks': false,
      };
    }
    return config;
  },
  experimental: {
    turbopack: {
      resolveAlias: {
        'async_hooks': false,
      },
    },
  },
};

export default nextConfig;
