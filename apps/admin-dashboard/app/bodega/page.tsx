import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import { getConfiguracion } from '../../lib/actions';
import IngresoBodegaClient from './IngresoBodegaClient';

export default async function BodegaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar rol Admin
  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (profile?.rol !== 'admin') {
    // Solo el admin puede cargar inventario inicial
    redirect('/');
  }

  const config = await getConfiguracion();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-admin-dark text-slate-100 p-6 md:p-10 overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-admin-gold/20 flex items-center justify-center border border-admin-gold/30">
            <span className="text-xl">📥</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ingreso a Bodega</h1>
        </div>
        <p className="text-slate-400 max-w-2xl">
          Genera masivamente boletas en <strong>Estado 0 (Bodega)</strong> para iniciar el ciclo logístico. 
          Este proceso es atómico e irreversible.
        </p>
      </header>

      <div className="max-w-4xl">
        <IngresoBodegaClient campanaId={config.id} />
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-amber-950/20 border border-amber-900/30 max-w-4xl">
        <h3 className="text-amber-500 font-bold mb-2 flex items-center gap-2">
          <span>⚠️</span> Recordatorio de Jerarquía
        </h3>
        <ul className="text-sm text-amber-500/80 space-y-2 list-disc pl-5">
          <li>El ingreso a bodega NO asigna distribuidores; eso se hace en el módulo de Asignaciones.</li>
          <li>Los números de boleta deben ser únicos. Si un número ya existe, será omitido.</li>
          <li>Cada boleta generada tendrá un token de integridad automático con formato <code>TKN-ID</code>.</li>
        </ul>
      </div>
    </div>
  );
}
