export const dynamic = 'force-dynamic';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import PreRegistrosClient from './PreRegistrosClient';
import { getPreRegistrosAction } from './actions';

export const metadata = { title: 'Pre-Registros Evento | AdminPanel' };

export default async function PreRegistrosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') redirect('/');

  const initial = await getPreRegistrosAction({ estado: 'pendiente', page: 1, pageSize: 10 });

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-admin-gold/10 border border-admin-gold/20 rounded-2xl flex items-center justify-center text-xl">📋</div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Pre-Registros al Evento</h1>
            <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest">Registros desde landing pública</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          Personas que se registraron desde redes sociales. Aprueba para enviar invitación oficial con QR.
        </p>
      </header>

      <PreRegistrosClient initialItems={initial.items} initialTotal={initial.total} />
    </div>
  );
}
