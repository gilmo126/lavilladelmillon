export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import RegistroEventoClient from './RegistroEventoClient';

export const metadata = { title: 'Registro al Evento | La Villa del Millón' };

export default async function RegistroEventoPage() {
  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('evento_logo_url, evento_titulo, evento_subtitulo, evento_mensaje, evento_auspiciantes, jornadas_evento, ubicacion_evento, ubicacion_maps_url')
    .eq('activa', true)
    .single();

  const evento = {
    logoUrl: config?.evento_logo_url || null,
    titulo: config?.evento_titulo || 'La Villa del Millón',
    subtitulo: config?.evento_subtitulo || 'El escenario donde tu esfuerzo encuentra su recompensa.',
    mensaje: config?.evento_mensaje || '',
    auspiciantes: config?.evento_auspiciantes || [],
    jornadas: Array.isArray(config?.jornadas_evento) ? config!.jornadas_evento : [],
    ubicacion: config?.ubicacion_evento || '',
    ubicacionMapsUrl: config?.ubicacion_maps_url || '',
  };

  return (
    <main className="min-h-screen bg-marca-darker">
      <div className="max-w-lg mx-auto px-4 py-8">
        <RegistroEventoClient evento={evento} />
      </div>
    </main>
  );
}
