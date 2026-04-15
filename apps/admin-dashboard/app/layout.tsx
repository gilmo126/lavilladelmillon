// Cloudflare Edge Deployment Force-Retry
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from './components/Sidebar';
import IdleLogout from './components/IdleLogout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dashboard | La Villa del Millón',
  description: 'Gestión y control de boletas dinamizadas',
};

import { createClient } from '../utils/supabase/server';
import { supabaseAdmin } from '../lib/supabaseAdmin';

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
  const { data: config } = await supabaseAdmin.from('configuracion_campana').select('nombre_campana, sesion_timeout_minutos').limit(1).single();
  const campanaNombre = config?.nombre_campana || 'La Villa del Millón';
  const sesionTimeoutMin = config?.sesion_timeout_minutos ?? 30;

  if (user) {
    const { data: profile } = await supabaseAdmin.from('perfiles').select('rol, nombre').eq('id', user.id).single();
    if (profile) {
       role = profile.rol;
       userName = profile.nombre;
    }
  }

  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-admin-dark text-slate-100 flex h-screen`}>
        {/* Usamos Sidebar envuelto pasando props */}
        {user ? <Sidebar role={role} userName={userName} campanaNombre={campanaNombre} /> : null}
        <div className="flex-1 h-screen overflow-y-auto flex flex-col">
          {children}
        </div>
        {user ? <IdleLogout timeoutMinutes={sesionTimeoutMin} /> : null}
      </body>
    </html>
  );
}
