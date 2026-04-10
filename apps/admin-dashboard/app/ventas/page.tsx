export const dynamic = 'force-dynamic';
import { getPacksPaged } from '../../lib/actions';
import VentasClient from './VentasClient';
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Packs Vendidos | AdminPanel' };

export default async function VentasReportPage({ searchParams }: { searchParams: Promise<{ page?: string; query?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') {
    redirect('/');
  }

  const sParams = await searchParams;
  const page = parseInt(sParams.page || '1');
  const query = sParams.query || '';
  const limit = 25;

  const { data, total, totalPages } = await getPacksPaged(page, limit, query);

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-admin-gold/10 border border-admin-gold/20 rounded-2xl flex items-center justify-center text-xl">
            📦
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Packs Vendidos</h1>
            <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest">Reporte de ventas</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          Historial de packs vendidos por distribuidores a comerciantes. Trazabilidad de pagos y estado.
        </p>
      </header>

      <VentasClient initialData={data || []} total={total} currentPage={page} query={query} totalPages={totalPages} />
    </div>
  );
}
