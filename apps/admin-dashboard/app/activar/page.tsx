import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import ActivarForm from './ActivarForm';

export const metadata = {
  title: 'Activar Boletas | Panel Distribuidor',
};

export default async function ActivarPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1. Obtener Perfil Base
  const { data: profile } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.rol !== 'distribuidor') {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-lg font-bold">
          Módulo exclusivo para Distribuidores logísticos.
        </div>
      </div>
    );
  }

  // 2. Obtener Zonas (Consulta Independiente para Resiliencia)
  const { data: userZonas } = await supabase
    .from('perfil_zonas')
    .select('zonas(nombre)')
    .eq('perfil_id', user.id);

  // 3. Obtener las boletas con su zona de destino específica
  const { data: boletas } = await supabase
    .from('boletas')
    .select('id_boleta, estado, zonas!zona_destino_id(nombre)')
    .eq('distribuidor_id', user.id)
    .eq('estado', 1)
    .order('id_boleta', { ascending: true })
    .limit(500);

  const { data: config } = await supabase.from('configuracion_campana').select('nombre_campana').eq('activa', true).single();
  const nombreCampana = config?.nombre_campana || "Campaña Activa";

  // 4. Obtener lista de barrios para el formulario
  const { data: territorios } = await supabase
    .from('territorios')
    .select('nombre')
    .order('nombre', { ascending: true });

  const misZonas = userZonas?.map((uz: any) => uz.zonas.nombre) || ['Nacional'];

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <h1 className="text-3xl font-bold">{nombreCampana}</h1>
          <div className="flex flex-wrap gap-2">
            {misZonas.map((z: string, i: number) => (
                <span key={i} className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    📍 {z}
                </span>
            ))}
          </div>
        </div>
        <p className="text-slate-400">
          Operación de Campo: <span className="text-white font-semibold">{profile.nombre}</span> — 
          Gestiona las ventas tácticas y activa boletas en tus frentes de trabajo autorizados.
        </p>
      </header>

      <ActivarForm boletas={boletas || []} territorios={territorios || []} />
    </div>
  );
}
