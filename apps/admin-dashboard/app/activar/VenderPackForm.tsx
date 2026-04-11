'use client';

import { useState } from 'react';
import { venderPackAction, enviarEmailPackAction, type VenderPackResult } from './actions';

const ADMIN_URL   = 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';
const LANDING_URL = 'https://landing-page.guillaumer-orion.workers.dev';

type Props = {
  diasVencimientoPago: number;
};

type SuccessData = Extract<VenderPackResult, { success: true }>;

export default function VenderPackForm({ diasVencimientoPago }: Props) {
  const [tipoPago, setTipoPago]   = useState<'inmediato' | 'pendiente'>('inmediato');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<SuccessData | null>(null);
  const [copied, setCopied]       = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError]   = useState<string | null>(null);

  const fechaVencimientoDisplay = new Date(
    Date.now() + diasVencimientoPago * 24 * 60 * 60 * 1000
  ).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('tipo_pago', tipoPago);
    const res = await venderPackAction(fd);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
    } else {
      setResult(res);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── PANTALLA DE CONFIRMACIÓN ────────────────────────────────────────
  if (result) {
    // ── CONFIRMACIÓN PAGO PENDIENTE ──────────────────────────────
    if (result.tipoPago === 'pendiente') {
      const fechaVenc = result.fechaVencimientoPago
        ? new Date(result.fechaVencimientoPago).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';
      const waPendienteText = encodeURIComponent(
        `Hola ${result.comercianteNombre}, hemos registrado tu reserva en La Villa del Millón. Una vez confirmes el pago recibirás tus 25 números para participar. Tienes hasta el ${fechaVenc} para realizar el pago.`
      );

      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">⏳</div>
            <div>
              <p className="font-black text-white text-lg">Reserva registrada</p>
              <p className="text-yellow-400 text-sm font-bold mt-0.5">{result.comercianteNombre} · Pago pendiente</p>
            </div>
          </div>

          <div className="bg-admin-card border border-admin-border rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-5 bg-yellow-500 rounded-full" />
              <h2 className="font-black text-white uppercase tracking-wider text-sm">Detalles de la Reserva</h2>
            </div>
            <div className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-3">
              <p className="text-slate-400 text-sm">
                Los <span className="text-white font-bold">25 números</span> se generarán cuando se confirme el pago.
              </p>
              <p className="text-slate-400 text-sm">
                Fecha límite: <span className="text-yellow-400 font-bold">{fechaVenc}</span>
              </p>
              <p className="text-slate-500 text-xs">
                Para confirmar el pago, ve a <span className="text-admin-blue font-bold">Mis Packs</span> y presiona "Confirmar Pago".
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/?text=${waPendienteText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest active:scale-[0.99]"
          >
            <span className="text-lg">📲</span> Informar al Comerciante por WhatsApp
          </a>

          <button
            onClick={() => { setResult(null); setError(null); }}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest border border-white/5"
          >
            Nueva Venta
          </button>
        </div>
      );
    }

    // ── CONFIRMACIÓN PAGO INMEDIATO ─────────────────────────────
    const packUrl    = `${LANDING_URL}/pack/${result.tokenPagina}`;
    const qrDataUrl  = `${ADMIN_URL}/validar-qr/${result.tokenQr}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;
    const qrValidoHasta = result.qrValidoHasta
      ? new Date(result.qrValidoHasta).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">✅</div>
          <div>
            <p className="font-black text-white text-lg">Pack generado exitosamente</p>
            <p className="text-green-400 text-sm font-bold mt-0.5">{result.comercianteNombre} · Pago inmediato</p>
          </div>
        </div>

        {/* Grid de 25 números */}
        {result.numeros && result.numeros.length > 0 && (
          <div className="bg-admin-card border border-admin-border rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 bg-admin-gold rounded-full" />
              <h2 className="font-black text-white uppercase tracking-wider text-sm">25 Números Generados</h2>
              <span className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                {result.numeros.length} números
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {result.numeros.map((n) => (
                <div key={n} className="bg-slate-950 border border-admin-border rounded-xl p-2.5 text-center font-mono font-black text-white text-sm hover:border-admin-gold/40 transition-all">
                  {String(n).padStart(6, '0')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link del comerciante */}
        <div className="bg-admin-card border border-admin-border rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-admin-blue rounded-full" />
            <h2 className="font-black text-white uppercase tracking-wider text-sm">Link del Comerciante</h2>
          </div>
          <div className="flex items-center gap-3 bg-slate-950 border border-white/5 rounded-2xl p-4">
            <p className="flex-1 text-admin-blue font-mono text-xs truncate">{packUrl}</p>
            <button
              onClick={() => handleCopy(packUrl)}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex-shrink-0 ${
                copied ? 'bg-green-500 text-white' : 'bg-admin-blue hover:bg-blue-600 text-white'
              }`}
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Enviar al Comerciante */}
        <div className="bg-admin-card border border-admin-border rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-green-500 rounded-full" />
            <h2 className="font-black text-white uppercase tracking-wider text-sm">Enviar al Comerciante</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hola ${result.comercianteNombre}, aquí está tu pack de 25 números para La Villa del Millón.\n\nAccede a tus números aquí: ${packUrl}` +
                (result.tokenQr
                  ? `\n\nTu QR de beneficio recreativo: ${qrImageUrl}` +
                    (qrValidoHasta ? ` - Válido hasta ${qrValidoHasta}` : '')
                  : '')
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest active:scale-[0.99]"
            >
              <span className="text-lg">📲</span> Enviar por WhatsApp
            </a>
            {result.comercianteEmail && result.numeros && result.tokenPagina ? (
              <button
                onClick={async () => {
                  setEmailStatus('sending');
                  setEmailError(null);
                  const res = await enviarEmailPackAction({
                    comercianteNombre: result.comercianteNombre,
                    comercianteEmail: result.comercianteEmail!,
                    numeros: result.numeros!,
                    tokenPagina: result.tokenPagina!,
                    tokenQr: result.tokenQr,
                    qrValidoHasta: result.qrValidoHasta,
                  });
                  setEmailStatus(res.success ? 'sent' : 'error');
                  if (!res.success) setEmailError(res.error || 'Error al enviar email');
                }}
                disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                className={`flex items-center justify-center gap-3 py-4 font-black rounded-2xl transition-all text-sm uppercase tracking-widest active:scale-[0.99] ${
                  emailStatus === 'sent' ? 'bg-green-500/20 border border-green-500 text-green-400'
                  : emailStatus === 'error' ? 'bg-red-500/20 border border-red-500 text-red-400'
                  : emailStatus === 'sending' ? 'bg-slate-700 text-slate-400 border border-white/5'
                  : 'bg-admin-blue hover:bg-blue-600 text-white border border-transparent'
                }`}
              >
                {emailStatus === 'sending' ? 'Enviando...' : emailStatus === 'sent' ? '✓ Email Enviado' : '✉️ Enviar Email'}
              </button>
            ) : null}
          </div>
          {emailStatus === 'error' && emailError && (
            <p className="text-red-400 text-xs font-bold mt-3">{emailError}</p>
          )}
        </div>

        {/* QR de beneficio */}
        <div className="bg-admin-card border border-admin-gold/20 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-admin-gold rounded-full" />
            <h2 className="font-black text-white uppercase tracking-wider text-sm">QR de Beneficio Recreativo</h2>
            {qrValidoHasta && (
              <span className="ml-auto text-[10px] font-bold text-admin-gold bg-admin-gold/10 px-2 py-1 rounded-lg">
                Válido hasta {qrValidoHasta}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="QR de beneficio recreativo" width={180} height={180} className="rounded-lg" />
            </div>
          </div>
        </div>

        <button
          onClick={() => { setResult(null); setError(null); setEmailStatus('idle'); setEmailError(null); }}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest border border-white/5"
        >
          Nueva Venta
        </button>
      </div>
    );
  }

  // ── FORMULARIO ────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 font-bold text-sm animate-in zoom-in-95">
          ❌ {error}
        </div>
      )}

      {/* Datos del comerciante */}
      <div className="bg-admin-card border border-admin-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-5 bg-admin-blue rounded-full" />
          <h2 className="font-black text-white uppercase tracking-wider text-sm">Datos del Comerciante</h2>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Nombre del Comerciante *</label>
          <input
            name="comerciante_nombre"
            required
            placeholder="Ej: Juan Pérez / Tienda El Progreso"
            className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Tipo Documento *</label>
            <select
              name="comerciante_tipo_id"
              required
              defaultValue="CC"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all appearance-none"
            >
              <option value="CC">CC - Cédula de Ciudadanía</option>
              <option value="CE">CE - Cédula de Extranjería</option>
              <option value="NIT">NIT - Número de Identificación Tributaria</option>
              <option value="PP">PP - Pasaporte</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Número de Identificación *</label>
            <input
              name="comerciante_identificacion"
              required
              placeholder="Ej: 1144000111"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Teléfono *</label>
            <input
              name="comerciante_tel"
              required
              placeholder="3001234567"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">WhatsApp</label>
            <input
              name="comerciante_whatsapp"
              placeholder="3001234567"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
          <input
            name="comerciante_email"
            type="email"
            placeholder="comercio@ejemplo.com"
            className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all"
          />
        </div>
      </div>

      {/* Tipo de pago */}
      <div className="bg-admin-card border border-admin-border rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 bg-admin-gold rounded-full" />
          <h2 className="font-black text-white uppercase tracking-wider text-sm">Tipo de Pago</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {(['inmediato', 'pendiente'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoPago(tipo)}
              className={`p-4 rounded-2xl border font-black text-sm uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${
                tipoPago === tipo
                  ? tipo === 'inmediato'
                    ? 'bg-green-500/10 border-green-500 text-green-400'
                    : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                  : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'
              }`}
            >
              <span className="text-2xl">{tipo === 'inmediato' ? '✅' : '⏳'}</span>
              {tipo === 'inmediato' ? 'Inmediato' : 'Pendiente'}
            </button>
          ))}
        </div>

        {tipoPago === 'inmediato' && (
          <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4 animate-in fade-in duration-200">
            <p className="text-green-400 text-xs font-bold">
              ✅ El QR de beneficio recreativo se genera al instante.
            </p>
          </div>
        )}

        {tipoPago === 'pendiente' && (
          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4 animate-in fade-in duration-200">
            <p className="text-yellow-400 text-xs font-bold">
              ⏳ Plazo de pago hasta el{' '}
              <span className="text-white">{fechaVencimientoDisplay}</span>.
              El QR de beneficio se activa al confirmar el pago.
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 disabled:grayscale text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-admin-gold/20 flex items-center justify-center gap-3 active:scale-[0.99]"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            Generando pack...
          </>
        ) : (
          '🎟️ Generar Pack de 25 Números'
        )}
      </button>
    </form>
  );
}
