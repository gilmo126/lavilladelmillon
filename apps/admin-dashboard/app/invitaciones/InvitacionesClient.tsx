'use client';

import { useState, useEffect } from 'react';
import {
  crearInvitacionAction, getInvitacionesAction, reenviarInvitacionAction,
  getInvitacionDetailAction, actualizarInvitacionAction, getReporteInvitacionesAction,
  type InvitacionItem, type InvitacionDetail, type ReporteDistribuidorItem,
} from './actions';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page.guillaumer-orion.workers.dev';
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';

function estadoBadge(estado: string) {
  switch (estado) {
    case 'aceptada': return 'bg-green-500/10 border-green-500/20 text-green-400';
    case 'rechazada': return 'bg-red-500/10 border-red-500/20 text-red-400';
    default: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
  }
}

type JornadaConfig = { id: string; fecha: string; hora: string; label: string };

function JornadasBadges({ ids, jornadas, compact = false }: { ids: string[] | null; jornadas: JornadaConfig[]; compact?: boolean }) {
  if (!ids || ids.length === 0) {
    return compact
      ? <span className="text-[10px] text-slate-600">—</span>
      : <p className="text-slate-500 text-xs italic">Sin jornada seleccionada</p>;
  }
  const seleccionadas = jornadas.filter(j => ids.includes(j.id));
  if (seleccionadas.length === 0) {
    return compact
      ? <span className="text-[10px] text-slate-600">—</span>
      : <p className="text-slate-500 text-xs italic">Jornada no encontrada en configuración</p>;
  }
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {seleccionadas.map(j => (
          <span key={j.id} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider">
            {j.label}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {seleccionadas.map(j => (
        <div key={j.id} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
          <p className="text-white text-xs font-bold">{j.label}</p>
          <p className="text-emerald-300 text-[10px]">{j.fecha} — {j.hora}</p>
        </div>
      ))}
    </div>
  );
}

function InvitacionDrawer({ invId, jornadasEvento, onClose, onUpdated }: { invId: string; jornadasEvento: JornadaConfig[]; onClose: () => void; onUpdated: () => void }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<InvitacionDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  // Editable fields
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tel, setTel] = useState('');
  const [wa, setWa] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    getInvitacionDetailAction(invId).then((d) => {
      setDetail(d);
      if (d) {
        setNombre(d.comerciante_nombre || '');
        setDireccion(d.comerciante_direccion || '');
        setTel(d.comerciante_tel || '');
        setWa(d.comerciante_whatsapp || '');
        setEmail(d.comerciante_email || '');
      }
      setLoading(false);
    });
  }, [invId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await actualizarInvitacionAction(invId, {
      comerciante_nombre: nombre,
      comerciante_direccion: direccion,
      comerciante_tel: tel,
      comerciante_whatsapp: wa,
      comerciante_email: email,
    });
    setSaving(false);
    setSaved(true);
    onUpdated();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleReenviar() {
    setReenviando(true);
    await reenviarInvitacionAction(invId);
    setReenviando(false);
    onUpdated();
  }

  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-[200] flex justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const invUrl = `${LANDING_URL}/invitacion/${detail.token}`;
  const qrDataUrl = `${ADMIN_URL}/validar-qr-inv/${detail.token_qr}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;
  const waShareText = encodeURIComponent(
    `Hola ${nombre}, estás invitado(a) a ${detail.tipo_evento} de La Villa del Millón. Confirma aquí: ${invUrl}`
  );

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-950/50">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{detail.comerciante_nombre}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-admin-gold font-bold uppercase tracking-widest">{detail.tipo_evento}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${estadoBadge(detail.estado)}`}>{detail.estado}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Datos editables */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-admin-blue rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Datos del Comerciante</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Dirección</label>
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">WhatsApp *</label>
                  <input value={wa} onChange={(e) => setWa(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Teléfono <span className="text-slate-600 normal-case">(opcional)</span></label>
                  <input value={tel} onChange={(e) => setTel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                  saved ? 'bg-green-500/20 text-green-400 border border-green-500' : 'bg-admin-blue hover:bg-blue-600 text-white'
                } disabled:opacity-50`}>
                {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Cambios'}
              </button>
            </div>
          </section>

          {/* Info evento */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-admin-gold rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Evento</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Tipo</p>
                <p className="text-white font-bold">{detail.tipo_evento}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Creada</p>
                <p className="text-slate-300">{new Date(detail.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(detail.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </section>

          {/* Jornadas seleccionadas */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Jornada Seleccionada</h4>
            </div>
            <JornadasBadges ids={detail.jornadas_seleccionadas} jornadas={jornadasEvento} />
          </section>

          {/* Link */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-admin-blue rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Link de Invitación</h4>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-xl p-3 mb-3">
              <p className="flex-1 text-admin-blue font-mono text-[10px] truncate">{invUrl}</p>
              <button onClick={() => { navigator.clipboard.writeText(invUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex-shrink-0 ${
                  copied ? 'bg-green-500 text-white' : 'bg-admin-blue hover:bg-blue-600 text-white'
                }`}>
                {copied ? '✓' : 'Copiar'}
              </button>
            </div>
            <a href={`https://wa.me/?text=${waShareText}`} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-all text-[10px] uppercase tracking-widest active:scale-95">
              📲 Compartir por WhatsApp
            </a>
          </section>

          {/* QR */}
          {detail.estado === 'aceptada' ? (
            <section className="bg-slate-950 border border-admin-gold/20 rounded-2xl p-5 text-center space-y-4">
              <div className="flex items-center gap-2 justify-center mb-2">
                <div className="w-1 h-4 bg-admin-gold rounded-full" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">QR de Asistencia</h4>
              </div>
              {detail.qr_escaneado_at ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-green-400 font-black text-sm">✅ QR Escaneado</p>
                  <p className="text-slate-400 text-xs">Ingresó el {new Date(detail.qr_escaneado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })} a las {new Date(detail.qr_escaneado_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="bg-white p-2 rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImageUrl} alt="QR asistencia" width={150} height={150} className="rounded-lg" />
                    </div>
                  </div>
                  {detail.qr_generado_at && (
                    <p className="text-slate-400 text-xs">Aceptada el {new Date(detail.qr_generado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  )}
                  <a href={qrImageUrl} download={`qr-invitacion-${detail.comerciante_nombre}.png`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-bold rounded-xl text-xs uppercase tracking-widest transition-all">
                    Descargar QR
                  </a>
                </>
              )}
            </section>
          ) : (
            <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 text-center">
              <p className="text-slate-500 text-sm">El QR se generará cuando el comerciante acepte la invitación.</p>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-slate-950/80 space-y-3">
          {detail.estado === 'rechazada' && (
            <button onClick={handleReenviar} disabled={reenviando}
              className="w-full py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-black rounded-2xl transition-all text-xs uppercase tracking-widest disabled:opacity-50">
              {reenviando ? 'Reactivando...' : 'Reactivar Invitación'}
            </button>
          )}
          {detail.estado !== 'aceptada' && (
            <button onClick={handleReenviar} disabled={reenviando}
              className="w-full py-3 bg-admin-blue/10 hover:bg-admin-blue/20 text-admin-blue border border-admin-blue/20 font-black rounded-2xl transition-all text-xs uppercase tracking-widest disabled:opacity-50">
              {reenviando ? 'Reenviando...' : 'Reenviar por Email'}
            </button>
          )}
          <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest border border-white/5">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvitacionesClient({
  initialData,
  tiposEvento,
  jornadasEvento,
  isDist,
  userId,
}: {
  initialData: InvitacionItem[];
  tiposEvento: string[];
  jornadasEvento: JornadaConfig[];
  isDist: boolean;
  userId: string;
}) {
  const [tab, setTab] = useState<'todas' | 'aceptada' | 'pendiente'>('todas');
  const [data, setData] = useState<InvitacionItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formResult, setFormResult] = useState<Extract<Awaited<ReturnType<typeof crearInvitacionAction>>, { success: true }> | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [reporte, setReporte] = useState<ReporteDistribuidorItem[]>([]);
  const [reporteLoading, setReporteLoading] = useState(false);

  async function reloadReporte() {
    if (isDist) return;
    setReporteLoading(true);
    const res = await getReporteInvitacionesAction();
    setReporte(res);
    setReporteLoading(false);
  }

  useEffect(() => {
    if (!isDist) reloadReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportReporteCSV() {
    const header = ['Distribuidor', 'Total', 'Aceptadas', 'Pendientes', 'Rechazadas', '% Conversión'];
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = reporte.map(r => [r.distribuidor, r.total, r.aceptadas, r.pendientes, r.rechazadas, r.conversion.toFixed(1) + '%'].map(esc).join(','));
    const csv = '\ufeff' + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_invitaciones_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function reloadList() {
    const res = await getInvitacionesAction(tab, isDist ? userId : undefined);
    setData(res);
  }

  async function handleTabChange(t: 'todas' | 'aceptada' | 'pendiente') {
    setTab(t);
    setLoading(true);
    setPage(1);
    const res = await getInvitacionesAction(t, isDist ? userId : undefined);
    setData(res);
    setLoading(false);
  }

  async function handleCrear(formData: FormData) {
    setFormLoading(true);
    setFormMsg(null);
    const res = await crearInvitacionAction(formData);
    if (res.success) {
      setFormMsg({ type: 'success', text: res.comercianteEmail ? `✅ Invitación creada y email enviado a ${res.comercianteNombre}` : `✅ Invitación creada para ${res.comercianteNombre}` });
      setFormResult(res);
      (document.getElementById('invForm') as HTMLFormElement)?.reset();
      const updated = await getInvitacionesAction(tab, isDist ? userId : undefined);
      setData(updated);
      reloadReporte();
    } else {
      setFormMsg({ type: 'error', text: res.error });
    }
    setFormLoading(false);
  }

  async function handleReenviar(id: string) {
    setReenviando(id);
    await reenviarInvitacionAction(id);
    const updated = await getInvitacionesAction(tab, isDist ? userId : undefined);
    setData(updated);
    setReenviando(null);
  }

  const filtered = data;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      {selectedId && (
        <InvitacionDrawer invId={selectedId} jornadasEvento={jornadasEvento} onClose={() => setSelectedId(null)} onUpdated={reloadList} />
      )}

      {!isDist && (
        <section className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-admin-border">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-admin-gold rounded-full" />
              <h2 className="text-white text-sm font-black uppercase tracking-widest">Reporte por Distribuidor</h2>
              {reporteLoading && <div className="w-4 h-4 border-2 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />}
            </div>
            <button
              onClick={exportReporteCSV}
              disabled={reporte.length === 0}
              className="px-4 py-2 bg-admin-blue/10 hover:bg-admin-blue/20 disabled:opacity-40 text-admin-blue border border-admin-blue/20 font-black rounded-xl transition-all text-[10px] uppercase tracking-widest"
            >
              📥 Exportar CSV
            </button>
          </div>
          {reporte.length === 0 && !reporteLoading ? (
            <div className="p-10 text-center text-slate-500 text-sm">Sin datos de invitaciones todavía.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                    <th className="p-4 font-bold">Distribuidor</th>
                    <th className="p-4 font-bold text-right">Total</th>
                    <th className="p-4 font-bold text-right">Aceptadas</th>
                    <th className="p-4 font-bold text-right">Pendientes</th>
                    <th className="p-4 font-bold text-right">Rechazadas</th>
                    <th className="p-4 font-bold text-right">% Conv.</th>
                    <th className="p-4 font-bold">Jornadas escogidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {reporte.map((r) => (
                    <tr key={r.distribuidor_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 text-white text-sm font-bold">{r.distribuidor}</td>
                      <td className="p-4 text-right text-white text-sm font-black">{r.total}</td>
                      <td className="p-4 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-green-500/10 border border-green-500/30 text-green-400">{r.aceptadas}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">{r.pendientes}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/10 border border-red-500/30 text-red-400">{r.rechazadas}</span>
                      </td>
                      <td className="p-4 text-right text-admin-gold text-sm font-black">{r.conversion.toFixed(1)}%</td>
                      <td className="p-4">
                        {r.jornadas.length === 0 ? (
                          <span className="text-slate-600 text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.jornadas.map((j) => {
                              const cfg = jornadasEvento.find(je => je.id === j.id);
                              const label = cfg?.label || j.id;
                              return (
                                <span key={j.id} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider">
                                  {label} · {j.count}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Lista */}
      <div className="lg:col-span-2 space-y-4">
        {/* Tabs */}
        <div className="flex border border-admin-border rounded-2xl overflow-hidden">
          {[
            { id: 'todas' as const, label: 'Todas' },
            { id: 'aceptada' as const, label: 'Aceptadas' },
            { id: 'pendiente' as const, label: 'Pendientes' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t.id
                  ? 'bg-admin-gold text-slate-900'
                  : 'bg-slate-900 text-slate-500 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">Sin invitaciones en esta categoría.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                    <th className="p-4 font-bold">Comerciante</th>
                    <th className="p-4 font-bold">Evento</th>
                    {!isDist && <th className="p-4 font-bold">Distribuidor</th>}
                    <th className="p-4 font-bold">Jornada</th>
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Estado</th>
                    <th className="p-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {paged.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => setSelectedId(inv.id)}>
                      <td className="p-4">
                        <p className="font-bold text-white text-sm">{inv.comerciante_nombre}</p>
                        {inv.comerciante_tel && <p className="text-[10px] text-slate-500 mt-0.5">{inv.comerciante_tel}</p>}
                      </td>
                      <td className="p-4 text-sm text-slate-300">{inv.tipo_evento}</td>
                      {!isDist && (
                        <td className="p-4 text-sm text-slate-400 font-bold uppercase">{inv.distribuidor?.nombre || '—'}</td>
                      )}
                      <td className="p-4">
                        <JornadasBadges ids={inv.jornadas_seleccionadas} jornadas={jornadasEvento} compact />
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(inv.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}{' '}
                        <span className="text-slate-600">{new Date(inv.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${estadoBadge(inv.estado)}`}>
                          {inv.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <a
                          href={`https://wa.me/${inv.comerciante_whatsapp || inv.comerciante_tel || ''}?text=${encodeURIComponent(`Hola ${inv.comerciante_nombre}, estás invitado(a) a ${inv.tipo_evento} de La Villa del Millón. Confirma aquí: ${LANDING_URL}/invitacion/${inv.token}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 text-xs font-bold"
                        >
                          WhatsApp
                        </a>
                        {inv.estado !== 'aceptada' && (
                          <button
                            onClick={() => handleReenviar(inv.id)}
                            disabled={reenviando === inv.id}
                            className="text-admin-blue hover:text-blue-300 text-xs font-bold disabled:opacity-50"
                          >
                            {reenviando === inv.id ? '...' : 'Reenviar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-admin-border">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Página {page} de {totalPages} · {filtered.length} invitaciones
              </span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-slate-700">← Anterior</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-slate-700">Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formulario */}
      <div className="lg:col-span-1">
        <div className="bg-admin-card rounded-2xl border border-admin-border p-6 sticky top-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-admin-gold/10 flex items-center justify-center border border-admin-gold/20 text-xl">🎪</div>
            <h2 className="text-lg font-bold text-white">Nueva Invitación</h2>
          </div>

          {formResult ? (
            <div className="space-y-4">
              <div className="bg-green-500/10 p-4 rounded-xl space-y-3">
                <p className="text-green-400 text-sm font-bold">{formMsg?.text}</p>
                <a
                  href={`https://wa.me/${formResult.comercianteWhatsapp || ''}?text=${encodeURIComponent(`Hola ${formResult.comercianteNombre}, estás invitado(a) a ${formResult.tipoEvento} de La Villa del Millón. Confirma tu asistencia aquí: ${LANDING_URL}/invitacion/${formResult.token}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { setTimeout(() => { setFormMsg(null); setFormResult(null); }, 500); }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-all text-xs uppercase tracking-widest active:scale-95"
                >
                  📲 Enviar por WhatsApp
                </a>
              </div>
              <button
                onClick={() => { setFormMsg(null); setFormResult(null); }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-sm uppercase tracking-widest border border-white/5"
              >
                Nueva Invitación
              </button>
            </div>
          ) : (
            <>
              {formMsg && formMsg.type === 'error' && (
                <div className="bg-red-500/10 p-3 rounded-lg mb-4">
                  <p className="text-red-400 text-sm font-bold">{formMsg.text}</p>
                </div>
              )}

              <form id="invForm" action={handleCrear} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo de Evento *</label>
                  <select name="tipo_evento" required defaultValue="" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-gold appearance-none">
                    <option value="" disabled>-- Selecciona --</option>
                    {tiposEvento.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre Comerciante *</label>
                  <input name="comerciante_nombre" required placeholder="Ej: Tienda El Progreso" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Dirección</label>
                  <input name="comerciante_direccion" placeholder="Cra 10 #20-30" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">WhatsApp *</label>
                    <input name="comerciante_whatsapp" required placeholder="3001234567" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Teléfono <span className="text-slate-600 normal-case">(opcional)</span></label>
                    <input name="comerciante_tel" placeholder="3001234567" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email</label>
                  <input name="comerciante_email" type="email" placeholder="comercio@ejemplo.com" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                </div>
                <button type="submit" disabled={formLoading} className="w-full py-3 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-xl transition-all text-sm uppercase tracking-widest">
                  {formLoading ? 'Enviando...' : 'Enviar Invitación'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
