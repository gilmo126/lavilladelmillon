/** @type {import('next').NextConfig} */
const nextConfig = {
  variable: 'edge', // Asegúrate de que el runtime sea edge
  serverExternalPackages: ['@supabase/supabase-js'], // Evita que se empaqueten cosas pesadas
};

export default nextConfig;
