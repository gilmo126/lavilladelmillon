export const dynamic = 'force-dynamic';

import { createClient } from '../../../utils/supabase/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import ReporteClient from './ReporteClient';
import { getReporteInvitacionesAction, getAlertasSospechosasAction } from '../actions';

export const metadata = { title: 'Reporte de Invitaciones | AdminPanel' };

export default async function ReporteInvitacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') redirect('/');

  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('jornadas_evento')
    .eq('activa', true)
    .single();

  const jornadasEvento = Array.isArray(config?.jornadas_evento) ? config!.jornadas_evento : [];
  const [initial, alertas] = await Promise.all([
    getReporteInvitacionesAction(),
    getAlertasSospechosasAction(),
  ]);

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-admin-gold/10 border border-admin-gold/20 rounded-2xl flex items-center justify-center text-xl">📊</div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Reporte de Invitaciones</h1>
            <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest">Desempeño por distribuidor</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          Agregado de invitaciones por distribuidor: totales, conversión y jornadas escogidas.
        </p>
      </header>

      <ReporteClient initial={initial} jornadasEvento={jornadasEvento} alertas={alertas} />
    </div>
  );
}
