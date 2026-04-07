export const dynamic = 'force-dynamic'
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import CreateZonaForm from './CreateZonaForm';
import { deleteZonaAction } from './actions';

export const metadata = {
  title: 'CatÃ¡logo de Zonas | AdminPanel',
};

function DeleteButton({ id }: { id: string }) {
  return (
    <form action={async () => {
      'use server';
      await deleteZonaAction(id);
    }}>
      <button 
        type="submit"
        className="text-red-400 hover:text-red-300 font-medium text-sm hover:underline"
      >
        Borrar
      </button>
    </form>
  );
}

export default async function ZonasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
  if (profile?.rol !== 'admin') {
    return <div className="p-8 text-red-500 font-bold">Bloqueo: MÃ³dulo exclusivo de Gerencia.</div>;
  }

  const { data: zonas } = await supabase
    .from('zonas')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 pb-20">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Territorios y Zonas LogÃ­sticas</h1>
        <p className="text-slate-400">CatÃ¡logo maestro para delimitar territorios. Al crear asignaciones y reclutar agentes, este catÃ¡logo proveerÃ¡ las opciones.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tabla Central */}
        <div className="lg:col-span-2">
          <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
             <div className="p-6 border-b border-admin-border">
                <h3 className="font-bold text-white">CatÃ¡logo Actual</h3>
             </div>
             
             {zonas && zonas.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                       <th className="p-4 font-bold">Identificador de Zona</th>
                       <th className="p-4 font-bold">Resumen / Limites</th>
                       <th className="p-4 font-bold text-right">Admin</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {zonas.map((zona) => (
                      <tr key={zona.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                           <p className="font-bold text-white text-lg">{zona.nombre}</p>
                           <p className="text-xs text-admin-blue font-mono mt-1">{zona.id}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-400 max-w-xs truncate">
                           {zona.descripcion || <span className="italic opacity-50">Sin descripciÃ³n</span>}
                        </td>
                        <td className="p-4 text-right">
                           <DeleteButton id={zona.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             ) : (
                <div className="p-12 text-center text-slate-500">
                  <p>AÃºn no has definido ninguna zona geogrÃ¡fica.</p>
                </div>
             )}
          </div>
        </div>

        {/* Formulario */}
        <div className="lg:col-span-1">
           <CreateZonaForm />
        </div>
      </div>
    </div>
  );
}
