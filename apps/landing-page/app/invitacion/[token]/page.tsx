export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import InvitacionClient from './InvitacionClient';

function PaginaEstado({ emoji, titulo, mensaje }: { emoji: string; titulo: string; mensaje: string }) {
  return (
    <main className="min-h-screen bg-marca-darker flex items-center justify-center p-8">
      <div className="text-center max-w-sm space-y-4">
        <div className="text-6xl mb-2">{emoji}</div>
        <h1 className="text-2xl font-black text-white">{titulo}</h1>
        <p className="text-slate-400 text-sm leading-relaxed">{mensaje}</p>
      </div>
    </main>
  );
}

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || token.length > 64 || !/^[a-zA-Z0-9]+$/.test(token)) {
    return <PaginaEstado emoji="🔒" titulo="Link no válido" mensaje="El formato del link no es correcto." />;
  }

  const { data: inv, error } = await supabaseAdmin
    .from('invitaciones')
    .select('id, comerciante_nombre, tipo_evento, estado, token_qr, campana_id, jornadas_seleccionadas')
    .eq('token', token)
    .single();

  if (error || !inv) {
    return <PaginaEstado emoji="🔒" titulo="Invitación no encontrada" mensaje="Este link no existe o ha sido eliminado." />;
  }

  if (inv.estado === 'rechazada') {
    return <PaginaEstado emoji="🙏" titulo="Invitación declinada" mensaje="Gracias por responder. ¡Esperamos verte en el próximo evento!" />;
  }

  // Cargar contenido dinámico del evento
  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('evento_logo_url, evento_titulo, evento_subtitulo, evento_mensaje, evento_auspiciantes, jornadas_evento, ubicacion_evento, ubicacion_maps_url')
    .eq('id', inv.campana_id)
    .single();

  const eventoData = {
    logoUrl: config?.evento_logo_url || null,
    titulo: config?.evento_titulo || '¡Bienvenidos a La Villa del Millón!',
    subtitulo: config?.evento_subtitulo || 'El escenario donde tu esfuerzo encuentra su recompensa.',
    mensaje: config?.evento_mensaje || '',
    auspiciantes: config?.evento_auspiciantes || ['KIA', 'YAMAHA', 'ODONTO PROTECT'],
    jornadas: config?.jornadas_evento || [],
    ubicacion: config?.ubicacion_evento || '',
    ubicacionMapsUrl: config?.ubicacion_maps_url || '',
  };

  return (
    <main className="min-h-screen bg-marca-darker flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <InvitacionClient
          token={token}
          comercianteNombre={inv.comerciante_nombre}
          tipoEvento={inv.tipo_evento}
          tokenQr={inv.token_qr}
          estado={inv.estado}
          jornadasSeleccionadasIniciales={Array.isArray(inv.jornadas_seleccionadas) ? inv.jornadas_seleccionadas : null}
          evento={eventoData}
        />
      </div>
    </main>
  );
}
