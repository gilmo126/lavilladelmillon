export const dynamic = 'force-dynamic'
import { getVentasPaged } from '../../lib/actions';
import VentasClient from './VentasClient';
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Reporte de Ventas | AdminPanel' };

export default async function VentasReportPage({ searchParams }: { searchParams: Promise<{ page?: string, query?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || !['admin', 'operativo'].includes(profile.rol)) {
    redirect('/');
  }

  const sParams = await searchParams;
  const page = parseInt(sParams.page || '1');
  const query = sParams.query || '';
  const limit = 50;

  const { data, total, totalPages } = await getVentasPaged(page, limit, query);

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">ðŸ“ˆ Reporte de Ventas Local</h1>
        <p className="text-slate-400">
          Base de datos de compradores finales registrados por los distribuidores en Palmira. 
          AuditorÃ­a de cumplimiento legal y trazabilidad de premios.
        </p>
      </header>
      
      <VentasClient initialData={data || []} total={total} currentPage={page} query={query} totalPages={totalPages} />
    </div>
  );
}
