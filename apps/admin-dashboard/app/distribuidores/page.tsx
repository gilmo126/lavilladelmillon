export const dynamic = 'force-dynamic'
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import CreateDistForm from './CreateDistForm';
import GestionPersonalClient from './GestionPersonalClient';

export const metadata = { title: 'GestiÃ³n de Personal | AdminPanel' };

export default async function DistribuidoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return (
    <div className="p-8 text-red-500 font-bold">Acceso Denegado: MÃ³dulo exclusivo de Gerencia.</div>
  );

  // MisiÃ³n de EstabilizaciÃ³n: Atomic Join para perfiles
  const [
    { data: allPerfiles },
    { data: allZonas }
  ] = await Promise.all([
    supabase.from('perfiles').select('*').order('created_at', { ascending: false }),
    supabase.from('zonas').select('id, nombre').order('nombre')
  ]);

  const zonasMap = (allZonas || []).reduce((acc: any, z) => {
    acc[z.id] = z.nombre;
    return acc;
  }, {});

  const mappedPerfiles = (allPerfiles || []).map(p => ({
    ...p,
    zonas: p.zona_id ? { nombre: zonasMap[p.zona_id] || 'Otras' } : null
  }));

  const distribuidores = mappedPerfiles.filter(p => p.rol === 'distribuidor');
  const operativos = mappedPerfiles.filter(p => p.rol === 'operativo');
  const zonas = allZonas;

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">GestiÃ³n de Personal</h1>
        <p className="text-slate-400">AdministraciÃ³n de Distribuidores LogÃ­sticos y Operativos de Bodega. CRUD completo con trazabilidad de identidad.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabla con Tabs */}
        <div className="lg:col-span-2 bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
          <div className="p-6 border-b border-admin-border">
            <h3 className="font-bold text-white">Directorio Activo</h3>
          </div>
          <GestionPersonalClient
            distribuidores={distribuidores || []}
            operativos={operativos || []}
            zonas={zonas || []}
            catalogoZonas={zonas || []}
          />
        </div>

        {/* Formulario de CreaciÃ³n */}
        <div className="lg:col-span-1 space-y-4">
          <CreateDistForm zonasDisponibles={zonas || []} />
        </div>
      </div>
    </div>
  );
}
