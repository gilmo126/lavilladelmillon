export const dynamic = 'force-dynamic'
import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import CreateZonaForm from './CreateZonaForm';
import { deleteZonaAction, editZonaAction } from './actions';

export const metadata = {
  title: 'Catálogo de Zonas | AdminPanel',
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

function EditButton({ id, nombre, descripcion }: { id: string; nombre: string; descripcion: string }) {
  return (
    <form action={async (formData: FormData) => {
      'use server';
      await editZonaAction(id, formData);
    }}>
      <details className="relative">
        <summary className="text-admin-blue hover:text-blue-300 font-medium text-sm hover:underline cursor-pointer">
          Editar
        </summary>
        <div className="absolute right-0 top-8 z-50 bg-slate-900 border border-admin-border rounded-xl p-4 shadow-2xl w-64 space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre</label>
            <input
              name="nombre"
              defaultValue={nombre}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Descripción</label>
            <input
              name="descripcion"
              defaultValue={descripcion}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-admin-blue text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all"
          >
            Guardar
          </button>
        </div>
      </details>
    </form>
  );
}

export default async function ZonasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('perfiles').select('*').eq('id', user.id).single();
  if (profile?.rol !== 'admin') {
    return <div className="p-8 text-red-500 font-bold">Bloqueo: Módulo exclusivo de Gerencia.</div>;
  }

  const { data: zonas } = await supabaseAdmin
    .from('zonas')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 pb-20">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Territorios y Zonas Logísticas</h1>
        <p className="text-slate-400">Catálogo maestro para delimitar territorios. Al crear asignaciones y reclutar agentes, este catálogo proveerá las opciones.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Tabla Central */}
        <div className="lg:col-span-2">
          <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
             <div className="p-6 border-b border-admin-border">
                <h3 className="font-bold text-white">Catálogo Actual</h3>
             </div>

             {zonas && zonas.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                       <th className="p-4 font-bold">Identificador de Zona</th>
                       <th className="p-4 font-bold">Resumen / Límites</th>
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
                           {zona.descripcion || <span className="italic opacity-50">Sin descripción</span>}
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-3">
                             <EditButton id={zona.id} nombre={zona.nombre} descripcion={zona.descripcion || ''} />
                             <DeleteButton id={zona.id} />
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             ) : (
                <div className="p-12 text-center text-slate-500">
                  <p>Aún no has definido ninguna zona geográfica.</p>
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
