export const dynamic = 'force-dynamic';
import React from 'react';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import RealtimeDashboard from './components/RealtimeDashboard';
import { createClient } from '../utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabaseAdmin.from('perfiles').select('*').eq('id', user.id).single();

  if (!profile) {
    redirect('/login');
  }

  const isDist = profile.rol === 'distribuidor';

  // Construir consultas base dependientes del ROL
  let baseBoletas = supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true });

  if (isDist) {
    baseBoletas = baseBoletas.eq('distribuidor_id', user!.id);
  }

  const { getBoletasPaged, getRankingZonas, getConfiguracion } = await import('../lib/actions');

  const [
    config,
    { data: recientes, total: totalCount },
    counts,
    ranking
  ] = await Promise.all([
    getConfiguracion().catch(() => ({ nombre_campana: "Sin Campaña" })),
    getBoletasPaged(1, 10, "", {}, isDist ? user.id : undefined),
    (async () => {
        const { count: t } = await baseBoletas;
        const { count: a } = await supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true }).eq('estado', 1).match(isDist ? { distribuidor_id: user?.id } : {});
        const { count: r } = await supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true }).eq('estado', 2).match(isDist ? { distribuidor_id: user?.id } : {});
        return { total: t || 0, activas: a || 0, registradas: r || 0 };
    })(),
    getRankingZonas(isDist ? user!.id : undefined)
  ]);

  const nombreCampana = config?.nombre_campana || "Sin Campaña Activa";

  const initialCounts = counts;

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-admin-dark p-6 md:p-10 w-full">
        <RealtimeDashboard 
          initialConfig={nombreCampana}
          initialCounts={initialCounts}
          initialRecientes={recientes || []}
          initialRanking={ranking || []}
          userProfile={profile}
        />
      </main>
    </>
  );
}
