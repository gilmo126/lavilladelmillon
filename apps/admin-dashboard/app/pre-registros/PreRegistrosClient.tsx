'use client';

import { useState } from 'react';
import {
  getPreRegistrosAction, aprobarPreRegistroAction, rechazarPreRegistroAction,
  type PreRegistroItem,
} from './actions';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page.guillaumer-orion.workers.dev';
const PAGE_SIZE = 10;

type JornadaConfig = { id: string; fecha: string; hora: string; label: string };

function estadoBadge(estado: string) {
  switch (estado) {
    case 'pendiente': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
    case 'invitacion_enviada': return 'bg-green-500/10 border-green-500/20 text-green-400';
    case 'rechazado': return 'bg-red-500/10 border-red-500/20 text-red-400';
    case 'aprobado': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    default: return 'bg-slate-100/10 border-white/5 text-slate-300';
  }
}

function estadoLabel(estado: string) {
  switch (estado) {
    case 'pendiente': return 'Pendiente';
    case 'invitacion_enviada': return 'Invitación enviada';
    case 'rechazado': return 'Rechazado';
    case 'aprobado': return 'Aprobado';
    default: return estado;
  }
}

function formatWhatsAppNumber(num: string | null | undefined): string {
  if (!num) return '';
  const digits = num.replace(/\D/g, '');
  if (digits.startsWith('57')) return digits;
  return `57${digits}`;
}

function PreRegistroDrawer({ reg, jornadasEvento, onClose, onUpdated }: { reg: PreRegistroItem; jornadasEvento: JornadaConfig[]; onClose: () => void; onUpdated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ token: string; whatsapp: string } | null>(null);
  const [rechazado, setRechazado] = useState(false);

  async function handleAprobar() {
    if (!confirm('¿Aprobar este registro y enviar invitación oficial?')) return;
    setLoading(true);
    setError(null);
    const res = await aprobarPreRegistroAction(reg.id);
    setLoading(false);
    if (res.success) {
      setResultado({ token: res.token!, whatsapp: res.comercianteWhatsapp || '' });
      onUpdated();
    } else {
      setError(res.error || 'Error al aprobar.');
    }
  }

  async function handleRechazar() {
    if (!confirm('¿Rechazar este pre-registro?')) return;
    setLoading(true);
    setError(null);
    const res = await rechazarPreRegistroAction(reg.id);
    setLoading(false);
    if (res.success) {
      setRechazado(true);
      onUpdated();
    } else {
      setError(res.error || 'Error al rechazar.');
    }
  }

  const invUrl = resultado ? `${LANDING_URL}/invitacion/${resultado.token}` : '';
  const waText = resultado ? encodeURIComponent(`Hola ${reg.nombre}, has sido invitado(a) al evento de La Villa del Millón. Confirma tu asistencia aquí: ${invUrl}`) : '';

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-950/50">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{reg.nombre}</h3>
            <p className="text-[10px] text-admin-gold font-bold uppercase tracking-widest mt-1">
              {reg.nombre_negocio}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Estado */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black border uppercase ${estadoBadge(rechazado ? 'rechazado' : resultado ? 'invitacion_enviada' : reg.estado)}`}>
              {estadoLabel(rechazado ? 'rechazado' : resultado ? 'invitacion_enviada' : reg.estado)}
            </span>
            <span className="text-[10px] text-slate-500">
              Registrado {new Date(reg.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Datos */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-admin-blue rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Datos del Registrado</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Nombre</p><p className="text-white font-bold">{reg.nombre}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Negocio</p><p className="text-admin-gold font-bold">{reg.nombre_negocio}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Documento</p><p className="text-slate-300">{reg.tipo_doc} {reg.identificacion || '—'}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">WhatsApp</p><p className="text-slate-300 font-mono">{reg.whatsapp}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Teléfono</p><p className="text-slate-300 font-mono">{reg.telefono || '—'}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Email</p><p className="text-slate-300">{reg.email || '—'}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Ciudad</p><p className="text-slate-300">{reg.ciudad || '—'}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Dirección</p><p className="text-slate-300">{reg.direccion || '—'}</p></div>
              <div className="col-span-2"><p className="text-[10px] text-slate-500 uppercase font-bold">¿Cómo se enteró?</p><p className="text-slate-300">{reg.como_se_entero || '—'}</p></div>
            </div>
          </section>

          {/* Jornadas seleccionadas */}
          {reg.jornadas_seleccionadas && reg.jornadas_seleccionadas.length > 0 && (
            <section className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Jornada(s) seleccionada(s)</h4>
              </div>
              {reg.jornadas_seleccionadas.map((jId) => {
                const cfg = jornadasEvento.find(j => j.id === jId);
                return cfg ? (
                  <div key={jId} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <p className="text-white text-xs font-bold">{cfg.label}</p>
                    <p className="text-emerald-300 text-[10px]">{cfg.fecha} — {cfg.hora}</p>
                  </div>
                ) : null;
              })}
            </section>
          )}

          {/* Resultado de aprobación */}
          {resultado && (
            <section className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 space-y-4">
              <p className="text-green-400 font-bold text-sm">✅ Invitación creada y email enviado</p>
              <a
                href={`https://wa.me/${formatWhatsAppNumber(resultado.whatsapp)}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-all text-xs uppercase tracking-widest active:scale-95"
              >
                📲 Enviar Invitación por WhatsApp
              </a>
            </section>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-sm font-bold">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-slate-950/80 space-y-3">
          {reg.estado === 'pendiente' && !resultado && !rechazado && (
            <>
              <button onClick={handleAprobar} disabled={loading}
                className="w-full py-3 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-2xl transition-all text-xs uppercase tracking-widest">
                {loading ? 'Procesando...' : '✅ Aprobar y Enviar Invitación'}
              </button>
              <button onClick={handleRechazar} disabled={loading}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black rounded-2xl transition-all text-xs uppercase tracking-widest disabled:opacity-40">
                ❌ Rechazar
              </button>
            </>
          )}
          <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest border border-white/5">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreRegistrosClient({
  initialItems,
  initialTotal,
  jornadasEvento,
}: {
  initialItems: PreRegistroItem[];
  initialTotal: number;
  jornadasEvento: JornadaConfig[];
}) {
  const [tab, setTab] = useState<'pendiente' | 'invitacion_enviada' | 'rechazado' | 'todos'>('pendiente');
  const [data, setData] = useState<PreRegistroItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedReg, setSelectedReg] = useState<PreRegistroItem | null>(null);

  async function fetchPage(t: string, p: number) {
    return getPreRegistrosAction({ estado: t, page: p, pageSize: PAGE_SIZE });
  }

  async function handleTabChange(t: typeof tab) {
    setTab(t);
    setPage(1);
    setLoading(true);
    const res = await fetchPage(t, 1);
    setData(res.items);
    setTotal(res.total);
    setLoading(false);
  }

  async function handlePageChange(p: number) {
    setPage(p);
    setLoading(true);
    const res = await fetchPage(tab, p);
    setData(res.items);
    setTotal(res.total);
    setLoading(false);
  }

  async function reload() {
    const res = await fetchPage(tab, page);
    setData(res.items);
    setTotal(res.total);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {selectedReg && (
        <PreRegistroDrawer reg={selectedReg} jornadasEvento={jornadasEvento} onClose={() => { setSelectedReg(null); reload(); }} onUpdated={() => {}} />
      )}

      {/* Tabs */}
      <div className="flex border border-admin-border rounded-2xl overflow-hidden">
        {([
          { id: 'pendiente' as const, label: 'Pendientes' },
          { id: 'invitacion_enviada' as const, label: 'Invitación Enviada' },
          { id: 'rechazado' as const, label: 'Rechazados' },
          { id: 'todos' as const, label: 'Todos' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t.id ? 'bg-admin-gold text-slate-900' : 'bg-slate-900 text-slate-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin mx-auto" />
          </div>
        ) : total === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">Sin pre-registros en esta categoría.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                  <th className="p-4 font-bold">Nombre</th>
                  <th className="p-4 font-bold">Negocio</th>
                  <th className="p-4 font-bold">WhatsApp</th>
                  <th className="p-4 font-bold">Jornada</th>
                  <th className="p-4 font-bold">Cómo se enteró</th>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {data.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => setSelectedReg(r)}>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{r.nombre}</p>
                      {r.ciudad && <p className="text-[10px] text-slate-500 mt-0.5">{r.ciudad}</p>}
                    </td>
                    <td className="p-4 text-sm text-admin-gold font-bold">{r.nombre_negocio}</td>
                    <td className="p-4 text-sm text-slate-300 font-mono">{r.whatsapp}</td>
                    <td className="p-4">
                      {r.jornadas_seleccionadas && r.jornadas_seleccionadas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.jornadas_seleccionadas.map((jId) => {
                            const cfg = jornadasEvento.find(j => j.id === jId);
                            return cfg ? (
                              <span key={jId} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider">
                                {cfg.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="p-4 text-sm text-slate-400">{r.como_se_entero || '—'}</td>
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${estadoBadge(r.estado)}`}>
                        {estadoLabel(r.estado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-admin-border">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Página {page} de {totalPages} · {total} registros
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1 || loading} onClick={() => handlePageChange(page - 1)}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-slate-700">← Anterior</button>
              <button disabled={page >= totalPages || loading} onClick={() => handlePageChange(page + 1)}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-slate-700">Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
