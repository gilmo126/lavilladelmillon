import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'async_hooks': path.resolve(__dirname, 'lib/async_hooks_shim.js'),
      };
    }
    return config;
  },
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      'async_hooks': './lib/async_hooks_shim.js',
    },
  },
};

export default nextConfig;
