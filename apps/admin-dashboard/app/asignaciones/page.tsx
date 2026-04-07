import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import AsignarForm from './AsignarForm';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Asignaciones Masivas | AdminPanel',
};

export default async function AsignacionesPage() {
  const supabase = await createClient();

  // 1. Verificar Autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Verificar Rol permitido (Admin o Operativo)
  const { data: profile } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
  if (!profile || !['admin', 'operativo'].includes(profile.rol)) {
     return (
        <div className="p-8">
           <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-lg font-bold">
              Bloqueo de Seguridad: Esta sección es exclusiva de Gerencia y personal Operativo.
           </div>
        </div>
     );
  }

  // 3. Misión de Estabilización: Atomic Join para distribuidores y zonas
  const [resDist, resZonas, resBoletas, resPerfilZonas] = await Promise.all([
    supabaseAdmin.from('perfiles').select('*').eq('rol', 'distribuidor').order('nombre'),
    supabaseAdmin.from('zonas').select('id, nombre'),
    supabaseAdmin.from('boletas').select('id_boleta', { count: 'exact', head: true }).eq('estado', 0),
    supabaseAdmin.from('perfil_zonas').select('perfil_id, zona_id')
  ]);

  const zonasMap = (resZonas.data || []).reduce((acc: any, z) => {
    acc[z.id] = z.nombre;
    return acc;
  }, {});

  // Atomic Join: Distribuidores + Sus Zonas N:N (Con Fallback Resiliente)
  const distribuidores = (resDist.data || []).map(d => {
    // 1. Intentar buscar zonas vinculadas en perfil_zonas (N:N)
    let myPZs = (resPerfilZonas.data || [])
      .filter(pz => pz.perfil_id === d.id)
      .map(pz => ({
        zonas: {
          id: pz.zona_id,
          nombre: zonasMap[pz.zona_id] || 'General'
        }
      }));

    // 2. Fallback de Emergencia: Si no hay N:N, usar la zona única del perfil
    if (myPZs.length === 0 && d.zona_id) {
       myPZs = [{
          zonas: {
             id: d.zona_id,
             nombre: zonasMap[d.zona_id] || 'General / Respaldo'
          }
       }];
    }

    return {
      ...d,
      perfil_zonas: myPZs
    };
  });

  const boletasBodega = resBoletas.count || 0;

  return (
    <div className="p-8 pb-20">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Asignaciones Masivas</h1>
        <p className="text-slate-400">Opera despachos de inventario inactivo (Bodega) hacia la red logística de Distribuidores Autorizados.</p>
      </header>

      <AsignarForm 
        distribuidores={distribuidores || []} 
        boletasLibres={boletasBodega || 0} 
      />

      <div className="mt-8 p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <h3 className="text-white font-bold mb-2">Protocolos de Estricto Cumplimiento (DB-First Security)</h3>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-2">
            <li>Al asignar un lote, este pasa irreversiblemente a la custodia del Distribuidor <strong>(Estado 1: Despachada)</strong>.</li>
            <li>Si digita un rango que contiene boletas que ya fueron despachadas, el sistema <strong>las ignorará de forma automática y solo inyectará las vírgenes.</strong></li>
            <li>Los distribuidores recibirán este lote íntegramente de forma inmediata en sus pantallas de trazabilidad y estarán habilitados para entregarlas en comercios y zonas.</li>
            <li>No se pueden reversar lotes enviados de forma directa, se requiere intervención superior SQL sobre incidentes reales.</li>
          </ul>
      </div>
    </div>
  );
}
