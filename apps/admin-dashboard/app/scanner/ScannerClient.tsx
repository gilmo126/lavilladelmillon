'use client';

import { useState } from 'react';
import { validarQrInlineAction, getAsistenciaAction, type AsistenciaItem } from './actions';

export default function ScannerClient({ initialAsistencia }: { initialAsistencia: AsistenciaItem[] }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [asistencia, setAsistencia] = useState<AsistenciaItem[]>(initialAsistencia);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = token.trim();
    if (!cleaned) return;

    setLoading(true);
    setToast(null);

    const result = await validarQrInlineAction(cleaned);

    if (result.success) {
      setToast({ type: 'success', msg: `${result.comercianteNombre} registrado` });
      setToken('');
      const updated = await getAsistenciaAction();
      setAsistencia(updated);
    } else {
      setToast({ type: 'error', msg: result.error });
    }

    setLoading(false);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Scanner */}
      <div className="bg-admin-card border border-admin-border rounded-3xl p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Token del QR
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega o escribe el código del QR..."
              autoFocus
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-4 text-white text-center font-mono text-lg outline-none focus:border-admin-gold transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full py-5 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 disabled:grayscale text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-admin-gold/20 active:scale-[0.99] flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                Validando...
              </>
            ) : (
              'Validar QR'
            )}
          </button>
        </form>

        {/* Toast */}
        {toast && (
          <div className={`mt-4 p-4 rounded-2xl font-bold text-sm text-center animate-in fade-in zoom-in-95 duration-300 ${
            toast.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="bg-admin-blue/5 border border-admin-blue/20 rounded-2xl p-4 text-center">
        <p className="text-slate-400 text-xs leading-relaxed">
          Escanea el QR con la cámara del dispositivo o pega el código manualmente.
        </p>
      </div>

      {/* Lista de Asistencia de Hoy */}
      <div className="bg-admin-card border border-admin-border rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-admin-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-green-500 rounded-full" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Asistencia de Hoy</h3>
          </div>
          <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black px-3 py-1 rounded-full">
            {asistencia.length} asistentes
          </span>
        </div>

        {asistencia.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-sm">
            Sin asistentes registrados hoy
          </div>
        ) : (
          <div className="divide-y divide-admin-border">
            {asistencia.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">{a.comerciante_nombre}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {a.id.slice(0, 8)}...
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-admin-gold font-bold text-sm">
                    {new Date(a.qr_usado_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
