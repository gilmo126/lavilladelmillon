export const dynamic = 'force-dynamic';

import { createClient } from '../../../utils/supabase/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import ValidarQrClient from './ValidarQrClient';

function PaginaError({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <main className="min-h-screen bg-admin-dark flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-black text-white mb-3">{titulo}</h1>
        <p className="text-slate-400 text-sm leading-relaxed">{mensaje}</p>
      </div>
    </main>
  );
}

export default async function ValidarQrPage({
  params,
}: {
  params: Promise<{ token_qr: string }>;
}) {
  const { token_qr } = await params;

  // Auth guard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch pack by token_qr
  const { data: pack, error } = await supabaseAdmin
    .from('packs')
    .select(
      'id, comerciante_nombre, fecha_venta, qr_valido_hasta, tipo_pago, estado_pago, token_qr, qr_usado_at, qr_usos'
    )
    .eq('token_qr', token_qr)
    .single();

  if (error || !pack) {
    return (
      <PaginaError
        titulo="QR no encontrado"
        mensaje="Este QR no existe o ha sido eliminado del sistema."
      />
    );
  }

  // Check if QR has expired
  if (pack.qr_valido_hasta && new Date(pack.qr_valido_hasta) < new Date()) {
    return (
      <PaginaError
        titulo="QR expirado"
        mensaje="El plazo de validez de este QR ha vencido."
      />
    );
  }

  // Check if payment is not confirmed for pending packs
  if (pack.estado_pago !== 'pagado') {
    return (
      <PaginaError
        titulo="Pago no confirmado"
        mensaje="El QR de beneficio se activa cuando se confirme el pago del pack."
      />
    );
  }

  // Contar boletas del pack
  const { count: totalBoletas } = await supabaseAdmin
    .from('boletas')
    .select('*', { count: 'exact', head: true })
    .eq('pack_id', pack.id);
  const maxUsos = totalBoletas || 25;
  const usosActuales = pack.qr_usos || 0;
  const agotado = usosActuales >= maxUsos;

  return (
    <ValidarQrClient
      tokenQr={token_qr}
      comercianteNombre={pack.comerciante_nombre}
      fechaVenta={pack.fecha_venta}
      qrValidoHasta={pack.qr_valido_hasta}
      tipoPago={pack.tipo_pago}
      estadoPago={pack.estado_pago}
      qrUsos={usosActuales}
      maxUsos={maxUsos}
      agotado={agotado}
    />
  );
}
