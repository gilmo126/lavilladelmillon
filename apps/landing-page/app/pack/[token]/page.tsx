export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import PackPageClient from './PackPageClient';

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

  // La RPC retorna jsonb — puede venir como objeto directo o envuelto
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

  return <PackPageClient pack={pack} />;
}
