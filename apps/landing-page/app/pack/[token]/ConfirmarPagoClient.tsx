'use client';

import { useEffect, useRef, useState } from 'react';
import { subirComprobanteLandingAction, getEstadoPackAction } from '../../actions';
import {
  validarArchivoComprobante,
  comprimirImagenCliente,
  TAMANO_MAXIMO_MB,
} from '../../../lib/comprobantes';
import BienvenidaLanding from '../../components/BienvenidaLanding';

const POLLING_INTERVAL_MS = 15_000;

type BienvenidaData = {
  logoUrl: string | null;
  titulo: string;
  subtitulo: string;
  mensaje: string;
  auspiciantes: string[];
};

type Props = {
  token: string;
  comercianteNombre: string;
  nombreCampana: string;
  nequiLlave: string | null;
  montoPack: number;
  instruccionesPago: string | null;
  estadoPago: 'pendiente' | 'comprobante_enviado';
  comprobanteSignedUrl: string | null;
  comprobanteSubidoAt: string | null;
  bienvenida?: BienvenidaData;
};

function formatearMonto(monto: number): string {
  if (!monto || monto <= 0) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monto);
}

export default function ConfirmarPagoClient({
  token,
  comercianteNombre,
  nombreCampana,
  nequiLlave,
  montoPack,
  instruccionesPago,
  estadoPago,
  comprobanteSignedUrl,
  comprobanteSubidoAt,
  bienvenida,
}: Props) {
  const tieneBienvenida = !!(
    bienvenida && (bienvenida.logoUrl || bienvenida.titulo || bienvenida.subtitulo || bienvenida.mensaje || bienvenida.auspiciantes.length > 0)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recienSubido, setRecienSubido] = useState(false);
  const [urlLocal, setUrlLocal] = useState<string | null>(comprobanteSignedUrl);
  const [copiado, setCopiado] = useState(false);

  const yaEnviado = estadoPago === 'comprobante_enviado' || recienSubido;

  // Polling solo cuando el comerciante ya subió comprobante y está esperando verificación.
  // Se pausa si la pestaña no está visible para no gastar recursos.
  useEffect(() => {
    if (!yaEnviado) return;

    let cancelado = false;
    const tick = async () => {
      if (cancelado) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const res = await getEstadoPackAction(token);
        if (!cancelado && res?.estado_pago === 'pagado') {
          window.location.reload();
        }
      } catch {
        /* best-effort */
      }
    };

    const intervalId = window.setInterval(tick, POLLING_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelado = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [yaEnviado, token]);

  async function handleFileSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const valid = validarArchivoComprobante(file);
    if (!valid.ok) {
      setError(valid.error);
      return;
    }

    setSubiendo(true);
    try {
      const fileComprimido = await comprimirImagenCliente(file);
      const fd = new FormData();
      fd.set('archivo', fileComprimido);
      fd.set('token', token);

      const res = await subirComprobanteLandingAction(fd);
      if (!res.success) {
        setError(res.error || 'Error al subir el comprobante.');
        setSubiendo(false);
        return;
      }

      setUrlLocal(res.signedUrl!);
      setRecienSubido(true);
    } catch (e: any) {
      setError(e.message || 'Error inesperado al procesar el archivo.');
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function copiarLlave() {
    if (!nequiLlave) return;
    navigator.clipboard.writeText(nequiLlave).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-marca-darker text-white">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-white/5 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-bold text-marca-gold uppercase tracking-widest mb-1">
            {nombreCampana}
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            💳 Confirma tu pago
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Hola <span className="text-white font-bold">{comercianteNombre}</span>, para activar tus números necesitamos tu comprobante Nequi.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {tieneBienvenida && bienvenida && (
          <BienvenidaLanding
            logoUrl={bienvenida.logoUrl}
            titulo={bienvenida.titulo}
            subtitulo={bienvenida.subtitulo}
            mensaje={bienvenida.mensaje}
            auspiciantes={bienvenida.auspiciantes}
          />
        )}

        {/* Estado actual si ya hay comprobante */}
        {yaEnviado && urlLocal ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-green-300 font-black text-sm">Comprobante enviado</p>
                <p className="text-green-200/70 text-xs mt-0.5">
                  Tu distribuidor verificará el pago y activará tus números en breve.
                </p>
              </div>
            </div>
            {comprobanteSubidoAt && !recienSubido && (
              <p className="text-[10px] text-green-400/60">
                Subido el {new Date(comprobanteSubidoAt).toLocaleString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <a href={urlLocal} target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] font-bold text-green-300 underline underline-offset-2 hover:text-green-200">
              Ver comprobante enviado
            </a>
          </div>
        ) : null}

        {/* Instrucciones de pago */}
        <div className="bg-marca-gold/5 border border-marca-gold/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💸</span>
            <h2 className="font-black text-marca-gold text-sm uppercase tracking-widest">Datos para el pago</h2>
          </div>

          {nequiLlave ? (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transfiere por Nequi a:</p>
              <div className="flex items-center gap-2 bg-slate-950 border border-white/5 rounded-xl p-4">
                <p className="flex-1 text-white font-mono font-black text-lg tracking-wide">{nequiLlave}</p>
                <button
                  onClick={copiarLlave}
                  className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${copiado ? 'bg-green-500 text-white' : 'bg-marca-gold hover:bg-yellow-400 text-slate-900'}`}
                >
                  {copiado ? '✓' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-yellow-400 text-xs font-bold">⚠️ El distribuidor aún no configuró la llave Nequi. Contáctalo.</p>
          )}

          {montoPack > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto a pagar</p>
              <p className="text-marca-gold font-black text-2xl">{formatearMonto(montoPack)}</p>
            </div>
          )}

          {instruccionesPago && (
            <div className="bg-slate-950 border border-white/5 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Instrucciones</p>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{instruccionesPago}</p>
            </div>
          )}
        </div>

        {/* Uploader */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📎</span>
            <h2 className="font-black text-white text-sm uppercase tracking-widest">
              {yaEnviado ? 'Reemplazar comprobante' : 'Sube tu comprobante'}
            </h2>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            onChange={handleFileSeleccionado}
            disabled={subiendo}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendo}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
              yaEnviado
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
                : 'bg-marca-gold hover:bg-yellow-400 text-slate-900 shadow-xl shadow-marca-gold/20 active:scale-[0.99]'
            } disabled:opacity-50`}
          >
            {subiendo ? (
              <>
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Subiendo…
              </>
            ) : yaEnviado ? (
              <>🔄 Subir otro comprobante</>
            ) : (
              <>📷 Subir comprobante Nequi</>
            )}
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            JPG, PNG, WEBP o PDF · máx {TAMANO_MAXIMO_MB} MB · se comprime antes de subir
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-xs font-bold">❌ {error}</p>
            </div>
          )}
        </div>

        {/* Footer nota */}
        <div className="pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">
            {nombreCampana} · Confirmación de pago
          </p>
        </div>
      </div>
    </main>
  );
}
