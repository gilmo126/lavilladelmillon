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

  if (profile.rol === 'asistente') {
    redirect('/scanner');
  }

  const isDist = profile.rol === 'distribuidor';

  const { getDashboardCounts, getDashboardExtendedCounts, getConfiguracion } = await import('../lib/actions');

  const [config, counts, extendedCounts] = await Promise.all([
    getConfiguracion().catch(() => ({ nombre_campana: "Sin Campaña" })),
    getDashboardCounts(isDist ? user.id : undefined),
    getDashboardExtendedCounts(isDist ? user.id : undefined),
  ]);

  const nombreCampana = config?.nombre_campana || "Sin Campaña Activa";

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-admin-dark p-6 md:p-10 w-full">
        <RealtimeDashboard
          initialConfig={nombreCampana}
          initialCounts={counts}
          initialExtended={extendedCounts}
          userProfile={profile}
        />
      </main>
    </>
  );
}
