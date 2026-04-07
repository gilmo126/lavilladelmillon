/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'], // Evita que se empaqueten cosas pesadas
};

export default nextConfig;
