export const dynamic = 'force-dynamic';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import InvitacionesClient from './InvitacionesClient';
import { getInvitacionesAction } from './actions';

export const metadata = { title: 'Invitaciones | AdminPanel' };

export default async function InvitacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('perfiles').select('id, rol, nombre').eq('id', user.id).single();
  if (!profile || !['admin', 'distribuidor'].includes(profile.rol)) redirect('/');

  const isDist = profile.rol === 'distribuidor';

  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('tipos_evento, jornadas_evento')
    .eq('activa', true)
    .single();

  const tiposEvento = config?.tipos_evento || ['Lanzamiento', 'Capacitación', 'Feria Comercial', 'Premiación', 'Networking'];
  const jornadasEvento = Array.isArray(config?.jornadas_evento) ? config!.jornadas_evento : [];
  const initialData = await getInvitacionesAction('todas', isDist ? user.id : undefined);

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-admin-gold/10 border border-admin-gold/20 rounded-2xl flex items-center justify-center text-xl">🎪</div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {isDist ? 'Mis Invitaciones' : 'Invitaciones a Evento'}
            </h1>
            <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest">Gestión de invitaciones</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          {isDist
            ? `${profile.nombre} — Invita comerciantes a eventos de La Villa del Millón.`
            : 'Reporte de todas las invitaciones enviadas por distribuidores.'}
        </p>
      </header>

      <InvitacionesClient
        initialData={initialData}
        tiposEvento={tiposEvento}
        jornadasEvento={jornadasEvento}
        isDist={isDist}
        userId={user.id}
      />
    </div>
  );
}
