import { redirect } from 'next/navigation';
import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import CambiarPasswordClient from './CambiarPasswordClient';

export const metadata = {
  title: 'Cambiar Contraseña | La Villa del Millón',
};

export default async function CambiarPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verificar que realmente debe cambiar la contraseña
  const { data: profile } = await supabaseAdmin
    .from('perfiles')
    .select('nombre, debe_cambiar_password')
    .eq('id', user.id)
    .single();

  if (!profile?.debe_cambiar_password) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-admin-dark relative overflow-y-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-admin-gold/5 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-admin-blue/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">La Villa del Millón</h1>
          <p className="text-[10px] font-black text-slate-500 tracking-widest mt-1">Primer Acceso — Cambio de Contraseña</p>
        </div>
        <CambiarPasswordClient nombre={profile.nombre || 'Usuario'} />
      </div>
    </div>
  );
}
