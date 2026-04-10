export const dynamic = 'force-dynamic';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import VenderPackForm from './VenderPackForm';

export const metadata = {
  title: 'Vender Pack | Panel Distribuidor',
};

export default async function ActivarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  if (!profile || profile.rol !== 'distribuidor') {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl font-bold">
          Módulo exclusivo para Distribuidores logísticos.
        </div>
      </div>
    );
  }

  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('nombre_campana, dias_vencimiento_pago')
    .eq('activa', true)
    .single();

  const nombreCampana      = config?.nombre_campana      ?? 'Campaña Activa';
  const diasVencimientoPago = config?.dias_vencimiento_pago ?? 8;

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-admin-gold/10 border border-admin-gold/20 rounded-2xl flex items-center justify-center text-xl">
            🎟️
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Vender Pack</h1>
            <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest">{nombreCampana}</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          <span className="text-white font-semibold">{profile.nombre}</span> — Genera un pack de 25 números aleatorios y véndelo a un comerciante.
        </p>
      </header>

      <div className="max-w-2xl">
        <VenderPackForm diasVencimientoPago={diasVencimientoPago} />
      </div>
    </div>
  );
}
