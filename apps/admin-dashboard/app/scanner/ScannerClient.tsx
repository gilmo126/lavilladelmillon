'use client';

import { useState } from 'react';
import {
  validarQrInlineAction,
  getAsistenciaAction,
  buscarPacksPorCedulaAction,
  type AsistenciaItem,
  type PackCedulaItem,
} from './actions';

function QrEstado({ pack }: { pack: PackCedulaItem }) {
  const ahora = new Date();
  if (pack.qr_usado_at) {
    return (
      <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
        Canjeado {new Date(pack.qr_usado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
      </span>
    );
  }
  if (pack.qr_valido_hasta && new Date(pack.qr_valido_hasta) < ahora) {
    return (
      <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg">
        QR Vencido
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
      QR Vigente
    </span>
  );
}

export default function ScannerClient({ initialAsistencia }: { initialAsistencia: AsistenciaItem[] }) {
  const [tab, setTab] = useState<'qr' | 'cedula'>('qr');

  // QR state
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Cédula state
  const [cedula, setCedula] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<PackCedulaItem[]>([]);
  const [buscado, setBuscado] = useState(false);

  // Asistencia
  const [asistencia, setAsistencia] = useState<AsistenciaItem[]>(initialAsistencia);

  async function handleQrSubmit(e: React.FormEvent) {
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

  async function handleCedulaSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!cedula.trim()) return;
    setBuscando(true);
    setBuscado(false);
    const res = await buscarPacksPorCedulaAction(cedula);
    setResultados(res);
    setBuscado(true);
    setBuscando(false);
  }

  async function handleUsarQr(tokenQr: string) {
    setLoading(true);
    setToast(null);
    const result = await validarQrInlineAction(tokenQr);

    if (result.success) {
      setToast({ type: 'success', msg: `${result.comercianteNombre} registrado` });
      const updated = await getAsistenciaAction();
      setAsistencia(updated);
      // Recargar resultados de búsqueda
      if (cedula.trim()) {
        const res = await buscarPacksPorCedulaAction(cedula);
        setResultados(res);
      }
    } else {
      setToast({ type: 'error', msg: result.error });
    }
    setLoading(false);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border border-admin-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setTab('qr')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            tab === 'qr'
              ? 'bg-admin-gold text-slate-900'
              : 'bg-slate-900 text-slate-500 hover:text-white'
          }`}
        >
          📷 Escanear QR
        </button>
        <button
          onClick={() => setTab('cedula')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            tab === 'cedula'
              ? 'bg-admin-blue text-white'
              : 'bg-slate-900 text-slate-500 hover:text-white'
          }`}
        >
          🔍 Buscar por Cédula
        </button>
      </div>

      {/* Tab QR */}
      {tab === 'qr' && (
        <div className="bg-admin-card border border-admin-border rounded-3xl p-8">
          <form onSubmit={handleQrSubmit} className="space-y-4">
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
        </div>
      )}

      {/* Tab Cédula */}
      {tab === 'cedula' && (
        <div className="space-y-4">
          <div className="bg-admin-card border border-admin-border rounded-3xl p-8">
            <form onSubmit={handleCedulaSearch} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Número de identificación del comerciante
                </label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 1144000111"
                  autoFocus
                  disabled={buscando}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-4 text-white text-center font-mono text-lg outline-none focus:border-admin-blue transition-all disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={buscando || !cedula.trim()}
                className="w-full py-4 bg-admin-blue hover:bg-blue-600 disabled:opacity-40 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
              >
                {buscando ? 'Buscando...' : 'Buscar Comerciante'}
              </button>
            </form>
          </div>

          {/* Resultados */}
          {buscado && (
            <div className="bg-admin-card border border-admin-border rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-admin-border flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Resultados</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                  {resultados.length} pack{resultados.length !== 1 ? 's' : ''}
                </span>
              </div>
              {resultados.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">
                  No se encontraron packs pagados con esa identificación.
                </div>
              ) : (
                <div className="divide-y divide-admin-border">
                  {resultados.map((p) => {
                    const vigente = !p.qr_usado_at && (!p.qr_valido_hasta || new Date(p.qr_valido_hasta) > new Date());
                    return (
                      <div key={p.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white font-bold text-sm">{p.comerciante_nombre}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {p.fecha_venta ? new Date(p.fecha_venta).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                            </p>
                          </div>
                          <QrEstado pack={p} />
                        </div>
                        {vigente && (
                          <button
                            onClick={() => handleUsarQr(p.token_qr)}
                            disabled={loading}
                            className="w-full py-3 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-xl transition-all text-xs uppercase tracking-widest active:scale-95"
                          >
                            {loading ? 'Procesando...' : 'Usar este QR'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-2xl font-bold text-sm text-center animate-in fade-in zoom-in-95 duration-300 ${
          toast.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-admin-blue/5 border border-admin-blue/20 rounded-2xl p-4 text-center">
        <p className="text-slate-400 text-xs leading-relaxed">
          {tab === 'qr'
            ? 'Escanea el QR con la cámara del dispositivo o pega el código manualmente.'
            : 'Ingresa la cédula o NIT del comerciante para buscar sus packs con QR vigente.'}
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
                  <p className="text-[10px] text-admin-gold font-black mt-0.5">{a.numero_pack ? `PACK-${String(a.numero_pack).padStart(3, '0')}` : ''}</p>
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
