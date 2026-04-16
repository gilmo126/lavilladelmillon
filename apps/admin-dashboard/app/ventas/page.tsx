export const dynamic = 'force-dynamic';
import { getPacksPaged } from '../../lib/actions';
import VentasClient from './VentasClient';
import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Packs Vendidos | AdminPanel' };

export default async function VentasReportPage({ searchParams }: { searchParams: Promise<{ page?: string; query?: string; pruebas?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('perfiles').select('id, rol, nombre').eq('id', user.id).single();
  if (!profile || !['admin', 'distribuidor'].includes(profile.rol)) {
    redirect('/');
  }

  const isDist = profile.rol === 'distribuidor';
  const isAdmin = profile.rol === 'admin';
  const sParams = await searchParams;
  const page = parseInt(sParams.page || '1');
  const query = sParams.query || '';
  const limit = 25;
  const incluirPruebas = isAdmin && sParams.pruebas === '1';

  const { data, total, totalPages } = await getPacksPaged(page, limit, query, isDist ? user.id : undefined, incluirPruebas);

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-admin-gold/10 border border-admin-gold/20 rounded-2xl flex items-center justify-center text-xl">
            📦
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {isDist ? 'Mis Packs Vendidos' : 'Packs Vendidos'}
            </h1>
            <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest">Reporte de ventas</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          {isDist
            ? `${profile.nombre} — Historial de packs vendidos a comerciantes.`
            : 'Historial de packs vendidos por distribuidores a comerciantes. Trazabilidad de pagos y estado.'}
        </p>
      </header>

      <VentasClient initialData={data || []} total={total} currentPage={page} query={query} totalPages={totalPages} isDist={isDist} isAdmin={isAdmin} incluirPruebas={incluirPruebas} />
    </div>
  );
}
