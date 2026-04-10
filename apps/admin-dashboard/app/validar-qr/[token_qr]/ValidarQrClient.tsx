'use client';

import { useState } from 'react';
import { anularQrAction } from './actions';

type Props = {
  tokenQr: string;
  comercianteNombre: string;
  fechaVenta: string;
  qrValidoHasta: string | null;
  tipoPago: string;
  estadoPago: string;
  yaUsado: boolean;
};

export default function ValidarQrClient({
  tokenQr,
  comercianteNombre,
  fechaVenta,
  qrValidoHasta,
  tipoPago,
  estadoPago,
  yaUsado,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'processing' | 'done' | 'error'>(
    yaUsado ? 'done' : 'idle'
  );
  const [error, setError] = useState<string | null>(null);

  const fechaVentaStr = new Date(fechaVenta).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const qrValidoStr = qrValidoHasta
    ? new Date(qrValidoHasta).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  async function handleAnular() {
    setStatus('processing');
    setError(null);
    const res = await anularQrAction(tokenQr);
    if (res.success) {
      setStatus('done');
    } else {
      setStatus('error');
      setError(res.error || 'Error desconocido');
    }
  }

  return (
    <div className="min-h-screen bg-admin-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-admin-gold/10 border border-admin-gold/20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">
            {status === 'done' ? '✅' : '🎟️'}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {status === 'done' ? 'QR Canjeado' : 'Validar QR de Beneficio'}
          </h1>
          <p className="text-[10px] font-bold text-admin-gold uppercase tracking-widest mt-2">
            Beneficio recreativo
          </p>
        </div>

        {/* Datos del comerciante */}
        <div className="bg-admin-card border border-admin-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-admin-blue rounded-full" />
            <h2 className="font-black text-white uppercase tracking-wider text-sm">
              Datos del Comerciante
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Nombre
              </span>
              <span className="text-white font-bold text-sm">{comercianteNombre}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Fecha de compra
              </span>
              <span className="text-slate-300 text-sm">{fechaVentaStr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Tipo de pago
              </span>
              <span
                className={`text-sm font-bold ${
                  tipoPago === 'inmediato' ? 'text-green-400' : 'text-yellow-400'
                }`}
              >
                {tipoPago === 'inmediato' ? '✅ Inmediato' : '⏳ Pendiente'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Estado pago
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                  estadoPago === 'pagado'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : estadoPago === 'pendiente'
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {estadoPago.toUpperCase()}
              </span>
            </div>
            {qrValidoStr && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  QR válido hasta
                </span>
                <span className="text-admin-gold text-sm font-bold">{qrValidoStr}</span>
              </div>
            )}
          </div>
        </div>

        {/* Acción */}
        {status === 'done' ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6 text-center">
            <p className="text-green-400 font-black text-lg">Asistencia Registrada</p>
            <p className="text-slate-400 text-sm mt-2">
              {yaUsado
                ? 'Este QR ya fue canjeado anteriormente.'
                : 'El beneficio recreativo ha sido registrado exitosamente.'}
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-red-400 font-bold text-sm">❌ {error}</p>
            </div>
            <button
              onClick={handleAnular}
              className="w-full py-4 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest"
            >
              Reintentar
            </button>
          </div>
        ) : status === 'confirming' ? (
          <div className="space-y-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
              <p className="text-yellow-400 font-bold text-sm">
                ¿Confirmas registrar la asistencia y anular este QR? Esta accion es irreversible.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStatus('idle')}
                className="py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest border border-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnular}
                className="py-4 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest"
              >
                Confirmar
              </button>
            </div>
          </div>
        ) : status === 'processing' ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-8 h-8 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />
          </div>
        ) : (
          <button
            onClick={() => setStatus('confirming')}
            className="w-full py-5 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-admin-gold/20 active:scale-[0.99]"
          >
            Registrar Asistencia y Anular QR
          </button>
        )}
      </div>
    </div>
  );
}
