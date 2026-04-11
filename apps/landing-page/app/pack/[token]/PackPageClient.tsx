'use client';

import { useState } from 'react';
import type { PackData, NumeroDetalle } from './page';

const LANDING_URL = 'https://landing-page.guillaumer-orion.workers.dev';

function NumeroCard({
  detalle,
  nombreCampana,
}: {
  detalle: NumeroDetalle;
  nombreCampana: string;
}) {
  const numStr = String(detalle.numero).padStart(6, '0');
  const registrado = detalle.estado >= 2;

  const registroUrl = `${LANDING_URL}?numero=${detalle.numero}`;
  const waText = encodeURIComponent(
    `🎟️ ¡Tengo el número *${numStr}* en *${nombreCampana}*!\n\nRegistrá tus datos aquí para participar 👇\n${registroUrl}`
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  if (registrado) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-3 flex flex-col items-center gap-3">
        <span className="font-mono font-black text-green-400 text-lg tracking-wider">
          {numStr}
        </span>
        <div className="w-full flex items-center justify-center gap-1.5 bg-green-500/10 text-green-400 text-[9px] font-black uppercase tracking-widest py-2 rounded-xl">
          ✅ Registrado
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center gap-3 hover:border-marca-gold/40 transition-all group">
      <span className="font-mono font-black text-white text-lg tracking-wider group-hover:text-marca-gold transition-colors">
        {numStr}
      </span>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-[9px] font-black uppercase tracking-widest py-2 rounded-xl transition-all active:scale-95"
      >
        <span>📲</span> Compartir
      </a>
    </div>
  );
}

export default function PackPageClient({ pack }: { pack: PackData }) {
  const [copied, setCopied] = useState(false);

  const fechaVencimiento = new Date(pack.fecha_vencimiento).toLocaleDateString(
    'es-CO',
    { day: '2-digit', month: 'long', year: 'numeric' }
  );

  const totalRegistrados = pack.numeros.filter((n) => n.estado >= 2).length;

  const ADMIN_URL = 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';
  const tieneQr = pack.tipo_pago === 'inmediato' && pack.token_qr && !pack.qr_usado_at;
  const qrDataUrl = pack.token_qr ? `${ADMIN_URL}/validar-qr/${pack.token_qr}` : '';
  const qrImageUrl = qrDataUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}` : '';
  const qrValidoHastaStr = pack.qr_valido_hasta
    ? new Date(pack.qr_valido_hasta).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  function handleCopyAll() {
    const disponibles = pack.numeros.filter((n) => n.estado < 2);
    const lista = disponibles
      .map((n) => String(n.numero).padStart(6, '0'))
      .join(' · ');
    const texto =
      `🎟️ Mis números de ${pack.nombre_campana}:\n\n${lista}\n\n` +
      `Registrá tus datos en: ${LANDING_URL}`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <main className="min-h-screen bg-marca-darker text-white">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-white/5 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-bold text-marca-gold uppercase tracking-widest mb-1">
            {pack.nombre_campana}
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            🏪 {pack.comerciante_nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              {pack.numeros.length} números
            </span>
            {totalRegistrados > 0 && (
              <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                ✅ {totalRegistrados} registrados
              </span>
            )}
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              ⏳ Vence {fechaVencimiento}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Instrucciones */}
        <div className="bg-marca-gold/5 border border-marca-gold/20 rounded-2xl p-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="font-black text-marca-gold">¿Cómo funciona?</span>{' '}
            Comparte cada número con tus clientes tocando{' '}
            <span className="text-green-400 font-bold">Compartir</span>. Ellos
            deben registrar sus datos antes del{' '}
            <span className="text-white font-bold">{fechaVencimiento}</span> para
            participar en el sorteo.
          </p>
        </div>

        {/* QR de Beneficio Recreativo */}
        {tieneQr && (
          <div className="bg-marca-gold/5 border border-marca-gold/30 rounded-2xl p-6 text-center space-y-4">
            <h2 className="font-black text-marca-gold text-sm uppercase tracking-widest">
              🎟️ Tu QR de Beneficio Recreativo
            </h2>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-2xl shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="QR de beneficio recreativo" width={180} height={180} className="rounded-lg" />
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Presenta este QR en el evento recreativo.
              {qrValidoHastaStr && (
                <span className="text-marca-gold font-bold"> Válido hasta el {qrValidoHastaStr}.</span>
              )}
            </p>
          </div>
        )}

        {pack.qr_usado_at && pack.tipo_pago === 'inmediato' && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-center">
            <p className="text-slate-400 text-sm">
              QR utilizado el {new Date(pack.qr_usado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* Copiar todos (solo disponibles) */}
        <button
          onClick={handleCopyAll}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border ${
            copied
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-marca-gold/40 hover:text-white'
          }`}
        >
          {copied ? '✓ ¡Copiado!' : '📋 Copiar números disponibles'}
        </button>

        {/* Grid de números */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Tus {pack.numeros.length} números — toca compartir para enviar por WhatsApp
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {pack.numeros.map((n) => (
              <NumeroCard
                key={n.numero}
                detalle={n}
                nombreCampana={pack.nombre_campana}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">
            {pack.nombre_campana} · Distribución autorizada
          </p>
        </div>
      </div>
    </main>
  );
}
