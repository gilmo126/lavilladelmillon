export const dynamic = 'force-dynamic'
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import MisDistribuidoresClient from './MisDistribuidoresClient';

export const metadata = { title: 'Mis Distribuidores | Panel Operativo' };

export default async function MisDistribuidoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('perfiles')
    .select('*, zonas(nombre)').eq('id', user.id).single();
  if (!profile || profile.rol !== 'operativo') {
    return <div className="p-8 text-red-500 font-bold">MÃ³dulo exclusivo de Operativos.</div>;
  }

  // El operativo puede ver TODOS los distribuidores para gestionar logÃ­stica
  const { data: distribuidores } = await supabase
    .from('perfiles').select('*, zonas(nombre)')
    .eq('rol', 'distribuidor').order('zonas(nombre)');

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">Mis Distribuidores</h1>
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Vista Operativo
          </span>
        </div>
        <p className="text-slate-400">
          Red logÃ­stica asignada. Puedes editar datos de contacto y zona. No puedes crear ni eliminar distribuidores.
        </p>
      </header>

      <MisDistribuidoresClient distribuidores={distribuidores || []} />
    </div>
  );
}
