export const dynamic = 'force-dynamic';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import ScannerClient from './ScannerClient';
import { getAsistenciaAction } from './actions';

export const metadata = {
  title: 'Scanner QR | Panel Asistente',
};

export default async function ScannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'asistente'].includes(profile.rol)) {
    redirect('/');
  }

  const asistenciaHoy = await getAsistenciaAction();

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto flex flex-col items-center">
      <header className="mb-10 text-center">
        <div className="w-16 h-16 bg-admin-gold/10 border border-admin-gold/20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">
          📷
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Scanner de QR</h1>
        <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest mt-2">
          Validación de beneficios
        </p>
        <p className="text-slate-400 text-sm mt-3">
          {profile.nombre} — Escanea o ingresa el código del QR del comerciante
        </p>
      </header>

      <div className="w-full max-w-md">
        <ScannerClient initialAsistencia={asistenciaHoy} />
      </div>
    </div>
  );
}
