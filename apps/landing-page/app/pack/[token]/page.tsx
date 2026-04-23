export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import PackPageClient from './PackPageClient';
import ConfirmarPagoClient from './ConfirmarPagoClient';

export type NumeroDetalle = {
  numero: number;
  estado: number;
};

export type PackData = {
  found: boolean;
  is_expired: boolean;
  comerciante_nombre: string;
  tipo_pago: 'inmediato' | 'pendiente';
  estado_pago: 'pagado' | 'pendiente' | 'vencido';
  fecha_vencimiento: string;
  numeros: NumeroDetalle[];
  nombre_campana: string;
  token_qr: string | null;
  qr_valido_hasta: string | null;
  qr_usado_at: string | null;
  numero_pack: number | null;
};

function PaginaError({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <main className="min-h-screen bg-marca-darker flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-black text-white mb-3">{titulo}</h1>
        <p className="text-slate-400 text-sm leading-relaxed">{mensaje}</p>
      </div>
    </main>
  );
}

export default async function PackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validar formato del token (UUID hex, 32-36 chars)
  if (!token || token.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
    return (
      <PaginaError
        titulo="Link no válido"
        mensaje="El formato del link no es correcto."
      />
    );
  }

  // 1) Obtener el pack directamente para validar estado y decidir qué renderizar
  const { data: packDirecto } = await supabaseAdmin
    .from('packs')
    .select('id, es_prueba, estado_pago, comerciante_nombre, comprobante_path, comprobante_subido_at')
    .eq('token_pagina', token)
    .maybeSingle();

  if (!packDirecto) {
    return (
      <PaginaError
        titulo="Link no disponible"
        mensaje="Este link no existe o ha sido eliminado. Consulta con tu distribuidor."
      />
    );
  }

  if (packDirecto.es_prueba) {
    return (
      <PaginaError
        titulo="Link no disponible"
        mensaje="Este link no existe o ha sido eliminado. Consulta con tu distribuidor."
      />
    );
  }

  // 2) Config de campaña (nombre + datos de pago + bienvenida) — usado por ambas ramas
  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('nombre_campana, nequi_llave, monto_pack, instrucciones_pago, bienvenida_pago_logo_url, bienvenida_pago_titulo, bienvenida_pago_subtitulo, bienvenida_pago_mensaje, bienvenida_pago_auspiciantes')
    .eq('activa', true)
    .maybeSingle();

  const nombreCampana = config?.nombre_campana || 'La Villa del Millón';

  // 3) Si el pack está pendiente o con comprobante enviado: flujo de confirmación de pago
  if (packDirecto.estado_pago === 'pendiente' || packDirecto.estado_pago === 'comprobante_enviado') {
    let comprobanteSignedUrl: string | null = null;
    if (packDirecto.comprobante_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from('comprobantes-pago')
        .createSignedUrl(packDirecto.comprobante_path, 600);
      comprobanteSignedUrl = signed?.signedUrl || null;
    }

    const bienvenida = {
      logoUrl: config?.bienvenida_pago_logo_url || null,
      titulo: config?.bienvenida_pago_titulo || '',
      subtitulo: config?.bienvenida_pago_subtitulo || '',
      mensaje: config?.bienvenida_pago_mensaje || '',
      auspiciantes: Array.isArray(config?.bienvenida_pago_auspiciantes)
        ? (config?.bienvenida_pago_auspiciantes as string[])
        : [],
    };

    return (
      <ConfirmarPagoClient
        token={token}
        comercianteNombre={packDirecto.comerciante_nombre || 'comerciante'}
        nombreCampana={nombreCampana}
        nequiLlave={config?.nequi_llave || null}
        montoPack={config?.monto_pack || 0}
        instruccionesPago={config?.instrucciones_pago || null}
        estadoPago={packDirecto.estado_pago as 'pendiente' | 'comprobante_enviado'}
        comprobanteSignedUrl={comprobanteSignedUrl}
        comprobanteSubidoAt={packDirecto.comprobante_subido_at || null}
        bienvenida={bienvenida}
      />
    );
  }

  if (packDirecto.estado_pago === 'vencido') {
    return (
      <PaginaError
        titulo="Pago vencido"
        mensaje="El plazo para completar el pago venció. Consulta con tu distribuidor."
      />
    );
  }

  // 4) Pack pagado: flujo habitual (numeros + QR multiuso)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.rpc('get_pack_publica', { p_token: token });

  if (error) {
    console.error('Error fetching pack:', error.message, error.code, error.details);
    return (
      <PaginaError
        titulo="Error al cargar"
        mensaje={`No pudimos cargar esta página. Por favor intenta más tarde. (${error.code || 'unknown'})`}
      />
    );
  }

  const pack = (typeof data === 'string' ? JSON.parse(data) : data) as PackData;

  if (!pack?.found) {
    return (
      <PaginaError
        titulo="Link no disponible"
        mensaje="Este link no existe o ha sido eliminado. Consulta con tu distribuidor."
      />
    );
  }

  if (pack.is_expired) {
    return (
      <PaginaError
        titulo="Link expirado"
        mensaje="El plazo para distribuir estos números ha vencido. Consulta con tu distribuidor."
      />
    );
  }

  // Buscar TODOS los packs del mismo comerciante para mostrar todos sus números
  const { data: packRecord } = await supabaseAdmin
    .from('packs')
    .select('id, comerciante_identificacion, qr_usos')
    .eq('token_pagina', token)
    .single();

  let qrUsos = packRecord?.qr_usos ?? 0;
  let qrMaxUsos = 0;
  if (packRecord?.id) {
    const { count: boletasCount } = await supabaseAdmin
      .from('boletas')
      .select('*', { count: 'exact', head: true })
      .eq('pack_id', packRecord.id);
    qrMaxUsos = boletasCount || 0;
  }

  if (packRecord?.comerciante_identificacion) {
    const { data: allPacks } = await supabaseAdmin
      .from('packs')
      .select('id')
      .eq('comerciante_identificacion', packRecord.comerciante_identificacion)
      .eq('estado_pago', 'pagado')
      .eq('es_prueba', false);

    if (allPacks && allPacks.length > 1) {
      const allPackIds = allPacks.map((p: any) => p.id);
      const { data: allBoletas } = await supabaseAdmin
        .from('boletas')
        .select('id_boleta, estado')
        .in('pack_id', allPackIds)
        .order('id_boleta', { ascending: true });

      if (allBoletas && allBoletas.length > pack.numeros.length) {
        pack.numeros = allBoletas.map((b: any) => ({ numero: b.id_boleta, estado: b.estado }));
      }
    }
  }

  return <PackPageClient pack={pack} qrUsos={qrUsos} qrMaxUsos={qrMaxUsos} />;
}
