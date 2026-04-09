// Cloudflare Edge Deployment Force-Retry
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from './components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dashboard | La Villa del Millón',
  description: 'Gestión y control de boletas dinamizadas',
};

import { createClient } from '../utils/supabase/server';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = 'guest';
  let userName = '';

  // Obtener Configuración de Marca (Llaves Maestras)
  const { data: config } = await supabase.from('configuracion_campana').select('nombre_campana').limit(1).single();
  const campanaNombre = config?.nombre_campana || 'La Villa del Millón';

  if (user) {
    const { data: profile } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
    if (profile) {
       role = profile.rol;
       userName = profile.nombre;
    }
  }

  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-admin-dark text-slate-100 flex h-screen overflow-hidden`}>
        {/* Usamos Sidebar envuelto pasando props */}
        {user ? <Sidebar role={role} userName={userName} campanaNombre={campanaNombre} /> : null}
        <div className="flex-1 h-screen overflow-hidden flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
