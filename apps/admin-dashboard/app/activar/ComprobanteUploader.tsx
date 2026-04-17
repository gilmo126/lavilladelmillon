'use client';

import { useRef, useState } from 'react';
import {
  validarArchivoComprobante,
  comprimirImagenCliente,
  TAMANO_MAXIMO_MB,
} from '../../lib/comprobantes';
import { subirComprobantePackAction } from './actions';

export type ComprobanteEstado =
  | { tipo: 'sin_subir' }
  | { tipo: 'subido'; url: string; subidoAt: string }
  | { tipo: 'verificado'; url: string; subidoAt: string; verificadoAt: string };

type Props = {
  packId: string;
  estadoInicial: ComprobanteEstado;
  onUploaded?: (url: string) => void;
  variant?: 'card' | 'inline';
};

export default function ComprobanteUploader({ packId, estadoInicial, onUploaded, variant = 'card' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<ComprobanteEstado>(estadoInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      fd.set('packId', packId);

      const res = await subirComprobantePackAction(fd);
      if (!res.success) {
        setError(res.error || 'Error al subir el comprobante.');
        setSubiendo(false);
        return;
      }

      setEstado({ tipo: 'subido', url: res.signedUrl!, subidoAt: new Date().toISOString() });
      setPreviewUrl(res.signedUrl!);
      onUploaded?.(res.signedUrl!);
    } catch (e: any) {
      setError(e.message || 'Error inesperado.');
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const badge = (() => {
    if (estado.tipo === 'verificado') {
      return <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-green-500/10 border border-green-500/30 text-green-400">✅ Pago verificado</span>;
    }
    if (estado.tipo === 'subido') {
      return <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-admin-blue/10 border border-admin-blue/30 text-admin-blue">📎 Pendiente de verificación</span>;
    }
    return <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">⚠️ Sin comprobante</span>;
  })();

  const contenido = (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">📎</span>
          <div>
            <p className="text-white font-black text-sm">Soporte de Pago</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Comprobante Nequi</p>
          </div>
        </div>
        {badge}
      </div>

      {estado.tipo !== 'verificado' && (
        <>
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
            className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              estado.tipo === 'subido'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5'
                : 'bg-admin-gold hover:bg-yellow-500 text-slate-900 shadow-xl shadow-admin-gold/20 active:scale-[0.99]'
            } disabled:opacity-50`}
          >
            {subiendo ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Subiendo…
              </>
            ) : estado.tipo === 'subido' ? (
              <>🔄 Reemplazar comprobante</>
            ) : (
              <>📷 Subir comprobante Nequi</>
            )}
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            JPG, PNG, WEBP o PDF · máx {TAMANO_MAXIMO_MB} MB · se comprime antes de subir
          </p>
        </>
      )}

      {estado.tipo !== 'sin_subir' && (previewUrl || (estado as any).url) && (
        <div className="bg-slate-950 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-16 h-16 bg-slate-900 rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl || (estado as any).url} alt="comprobante" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Archivo subido</p>
            <a
              href={previewUrl || (estado as any).url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-admin-blue hover:text-blue-300 text-xs font-bold underline underline-offset-2 truncate block"
            >
              Abrir en pestaña nueva
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-red-400 text-xs font-bold">❌ {error}</p>
        </div>
      )}
    </>
  );

  if (variant === 'inline') {
    return <div className="space-y-3">{contenido}</div>;
  }

  return (
    <div className="bg-admin-card border border-admin-border rounded-3xl p-6 space-y-4">
      {contenido}
    </div>
  );
}
