'use client';

import { useState } from 'react';
import {
  validarQrInlineAction,
  getAsistenciaAction,
  getInvitacionesAsistenciaAction,
  buscarPacksPorCedulaAction,
  type AsistenciaItem,
  type InvitacionAsistenciaItem,
  type PackCedulaItem,
} from './actions';

const ITEMS_PER_PAGE = 10;

function QrEstado({ pack }: { pack: PackCedulaItem }) {
  const ahora = new Date();
  if (pack.qr_usado_at) {
    return <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">Canjeado {new Date(pack.qr_usado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>;
  }
  if (pack.qr_valido_hasta && new Date(pack.qr_valido_hasta) < ahora) {
    return <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg">QR Vencido</span>;
  }
  return <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">QR Vigente</span>;
}

function Paginador({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between p-3 border-t border-admin-border">
      <span className="text-[10px] text-slate-500 font-bold">{page}/{totalPages}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-slate-700">←</button>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-slate-700">→</button>
      </div>
    </div>
  );
}

export default function ScannerClient({
  initialAsistencia,
  initialInvitaciones,
}: {
  initialAsistencia: AsistenciaItem[];
  initialInvitaciones: InvitacionAsistenciaItem[];
}) {
  const [tab, setTab] = useState<'qr' | 'cedula'>('qr');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [cedula, setCedula] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<PackCedulaItem[]>([]);
  const [buscado, setBuscado] = useState(false);
  const [asistencia, setAsistencia] = useState<AsistenciaItem[]>(initialAsistencia);
  const [invitaciones, setInvitaciones] = useState<InvitacionAsistenciaItem[]>(initialInvitaciones);
  const [pageAsist, setPageAsist] = useState(1);
  const [pageInv, setPageInv] = useState(1);

  const totalPagesAsist = Math.ceil(asistencia.length / ITEMS_PER_PAGE);
  const totalPagesInv = Math.ceil(invitaciones.length / ITEMS_PER_PAGE);
  const pagedAsist = asistencia.slice((pageAsist - 1) * ITEMS_PER_PAGE, pageAsist * ITEMS_PER_PAGE);
  const pagedInv = invitaciones.slice((pageInv - 1) * ITEMS_PER_PAGE, pageInv * ITEMS_PER_PAGE);

  async function reloadLists() {
    const [a, i] = await Promise.all([getAsistenciaAction(), getInvitacionesAsistenciaAction()]);
    setAsistencia(a);
    setInvitaciones(i);
  }

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
      await reloadLists();
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
      await reloadLists();
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
      {/* Tabs Scanner */}
      <div className="flex border border-admin-border rounded-2xl overflow-hidden">
        <button onClick={() => setTab('qr')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'qr' ? 'bg-admin-gold text-slate-900' : 'bg-slate-900 text-slate-500 hover:text-white'}`}>📷 Escanear QR</button>
        <button onClick={() => setTab('cedula')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'cedula' ? 'bg-admin-blue text-white' : 'bg-slate-900 text-slate-500 hover:text-white'}`}>🔍 Buscar Cédula</button>
      </div>

      {/* Tab QR */}
      {tab === 'qr' && (
        <div className="bg-admin-card border border-admin-border rounded-3xl p-8">
          <form onSubmit={handleQrSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Token del QR</label>
              <input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Pega o escribe el código del QR..." autoFocus disabled={loading}
                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-4 text-white text-center font-mono text-lg outline-none focus:border-admin-gold transition-all disabled:opacity-50" />
            </div>
            <button type="submit" disabled={loading || !token.trim()} className="w-full py-5 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 disabled:grayscale text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-admin-gold/20 active:scale-[0.99] flex items-center justify-center gap-3">
              {loading ? (<><div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />Validando...</>) : 'Validar QR'}
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Número de identificación del comerciante</label>
                <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Ej: 1144000111" autoFocus disabled={buscando}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-4 text-white text-center font-mono text-lg outline-none focus:border-admin-blue transition-all disabled:opacity-50" />
              </div>
              <button type="submit" disabled={buscando || !cedula.trim()} className="w-full py-4 bg-admin-blue hover:bg-blue-600 disabled:opacity-40 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3">
                {buscando ? 'Buscando...' : 'Buscar Comerciante'}
              </button>
            </form>
          </div>
          {buscado && (
            <div className="bg-admin-card border border-admin-border rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-admin-border flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Resultados</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{resultados.length} pack{resultados.length !== 1 ? 's' : ''}</span>
              </div>
              {resultados.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">Sin packs pagados con esa identificación.</div>
              ) : (
                <div className="divide-y divide-admin-border">
                  {resultados.map((p) => {
                    const vigente = !p.qr_usado_at && (!p.qr_valido_hasta || new Date(p.qr_valido_hasta) > new Date());
                    return (
                      <div key={p.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white font-bold text-sm">{p.comerciante_nombre}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{p.fecha_venta ? new Date(p.fecha_venta).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</p>
                          </div>
                          <QrEstado pack={p} />
                        </div>
                        {vigente && (
                          <button onClick={() => handleUsarQr(p.token_qr)} disabled={loading} className="w-full py-3 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-xl transition-all text-xs uppercase tracking-widest active:scale-95">
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
        <div className={`p-4 rounded-2xl font-bold text-sm text-center animate-in fade-in zoom-in-95 duration-300 ${toast.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Lista Asistencia Evento Recreativo */}
      <div className="bg-admin-card border border-admin-border rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-admin-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-green-500 rounded-full" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Asistencia Evento Recreativo</h3>
          </div>
          <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black px-3 py-1 rounded-full">{asistencia.length}</span>
        </div>
        {pagedAsist.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-sm">Sin asistentes registrados</div>
        ) : (
          <div className="divide-y divide-admin-border">
            {pagedAsist.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">{a.comerciante_nombre}</p>
                  <p className="text-[10px] text-admin-gold font-black mt-0.5">{a.numero_pack ? `PACK-${String(a.numero_pack).padStart(3, '0')}` : ''}</p>
                </div>
                <p className="text-admin-gold font-bold text-sm">{new Date(a.qr_usado_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        )}
        <Paginador page={pageAsist} totalPages={totalPagesAsist} onChange={setPageAsist} />
      </div>

      {/* Lista Invitaciones a Eventos */}
      <div className="bg-admin-card border border-admin-border rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-admin-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-purple-500 rounded-full" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Invitaciones a Eventos</h3>
          </div>
          <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black px-3 py-1 rounded-full">{invitaciones.length}</span>
        </div>
        {pagedInv.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-sm">Sin invitaciones aceptadas</div>
        ) : (
          <div className="divide-y divide-admin-border">
            {pagedInv.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">{inv.comerciante_nombre}</p>
                  <p className="text-[10px] text-purple-400 font-bold mt-0.5">{inv.tipo_evento}</p>
                </div>
                <p className="text-purple-400 font-bold text-sm">{new Date(inv.qr_generado_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        )}
        <Paginador page={pageInv} totalPages={totalPagesInv} onChange={setPageInv} />
      </div>
    </div>
  );
}
