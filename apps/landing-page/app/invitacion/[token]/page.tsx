export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import InvitacionClient from './InvitacionClient';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';

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
    .select('id, comerciante_nombre, tipo_evento, estado, token_qr, campana_id')
    .eq('token', token)
    .single();

  if (error || !inv) {
    return <PaginaEstado emoji="🔒" titulo="Invitación no encontrada" mensaje="Este link no existe o ha sido eliminado." />;
  }

  // Cargar contenido dinámico del evento
  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('evento_logo_url, evento_titulo, evento_subtitulo, evento_mensaje, evento_auspiciantes')
    .eq('id', inv.campana_id)
    .single();

  const eventoData = {
    logoUrl: config?.evento_logo_url || null,
    titulo: config?.evento_titulo || '¡Bienvenidos a La Villa del Millón!',
    subtitulo: config?.evento_subtitulo || 'El escenario donde tu esfuerzo encuentra su recompensa.',
    mensaje: config?.evento_mensaje || '',
    auspiciantes: config?.evento_auspiciantes || ['KIA', 'YAMAHA', 'ODONTO PROTECT'],
  };

  if (inv.estado === 'aceptada') {
    const qrDataUrl = `${ADMIN_URL}/validar-qr-inv/${inv.token_qr}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;

    return (
      <main className="min-h-screen bg-marca-darker flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-green-900/20 border border-green-500/30 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-3xl mx-auto">✅</div>
            <h2 className="text-xl font-black text-white">Asistencia Confirmada</h2>
            <p className="text-green-400 font-bold text-sm">{inv.comerciante_nombre}</p>
          </div>
          <div className="bg-marca-gold/5 border border-marca-gold/30 rounded-3xl p-6 text-center space-y-4">
            <p className="text-marca-gold text-xs font-black uppercase tracking-widest">Tu QR de Asistencia</p>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-2xl shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="QR de asistencia" width={180} height={180} className="rounded-lg" />
              </div>
            </div>
            <p className="text-slate-400 text-xs">Presenta este QR en la entrada del evento.</p>
          </div>
        </div>
      </main>
    );
  }

  if (inv.estado === 'rechazada') {
    return <PaginaEstado emoji="🙏" titulo="Invitación declinada" mensaje="Gracias por responder. ¡Esperamos verte en el próximo evento!" />;
  }

  return (
    <main className="min-h-screen bg-marca-darker flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <InvitacionClient
          token={token}
          comercianteNombre={inv.comerciante_nombre}
          tipoEvento={inv.tipo_evento}
          tokenQr={inv.token_qr}
          evento={eventoData}
        />
      </div>
    </main>
  );
}
