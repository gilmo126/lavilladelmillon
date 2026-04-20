'use client';

import { useMemo, useState } from 'react';
import {
  getReporteInvitacionesAction, getInvitacionesPorDistribuidorAction,
  getReporteDetalladoInvitacionesAction,
  type ReporteDistribuidorItem, type AlertaItem, type InvitacionDistribuidorItem,
  type ReporteDetalladoInvitacionItem,
} from '../actions';

type JornadaConfig = { id: string; fecha: string; hora: string; label: string };

function conversionColor(conv: number, total: number): string {
  if (total <= 5) return 'text-slate-400';
  if (conv > 50) return 'text-green-400';
  if (conv >= 20) return 'text-yellow-400';
  return 'text-red-400';
}

const alertaTipoLabel: Record<string, { emoji: string; label: string; color: string }> = {
  sin_confirmacion: { emoji: '📵', label: 'Sin confirmar WhatsApp', color: 'border-orange-500/30 bg-orange-500/5' },
  baja_conversion: { emoji: '📉', label: 'Baja conversión', color: 'border-red-500/30 bg-red-500/5' },
  telefono_repetido: { emoji: '📞', label: 'Teléfono repetido', color: 'border-yellow-500/30 bg-yellow-500/5' },
};

export default function ReporteClient({
  initial,
  jornadasEvento,
  alertas,
  detallado,
}: {
  initial: ReporteDistribuidorItem[];
  jornadasEvento: JornadaConfig[];
  alertas: AlertaItem[];
  detallado: ReporteDetalladoInvitacionItem[];
}) {
  const [alertasOpen, setAlertasOpen] = useState(alertas.length > 0);
  const [reporte, setReporte] = useState<ReporteDistribuidorItem[]>(initial);
  const [loading, setLoading] = useState(false);
  const [drawerDist, setDrawerDist] = useState<ReporteDistribuidorItem | null>(null);
  const [drawerItems, setDrawerItems] = useState<InvitacionDistribuidorItem[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [tab, setTab] = useState<'distribuidor' | 'listado'>('distribuidor');
  const [detalle, setDetalle] = useState<ReporteDetalladoInvitacionItem[]>(detallado);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState<'todos' | 'distribuidor' | 'pre_registro'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'aceptada' | 'rechazada'>('todos');

  async function refresh() {
    setLoading(true);
    const res = await getReporteInvitacionesAction();
    setReporte(res);
    setLoading(false);
  }

  async function refreshDetalle() {
    setDetalleLoading(true);
    const res = await getReporteDetalladoInvitacionesAction();
    setDetalle(res);
    setDetalleLoading(false);
  }

  const detalleFiltrado = useMemo(() => {
    const q = search.trim().toLowerCase();
    return detalle.filter((i) => {
      if (filtroOrigen !== 'todos' && (i.origen || 'distribuidor') !== filtroOrigen) return false;
      if (filtroEstado !== 'todos' && i.estado !== filtroEstado) return false;
      if (!q) return true;
      return [
        i.comerciante_nombre,
        i.comerciante_nombre_comercial,
        i.identificacion,
        i.comerciante_tel,
        i.comerciante_whatsapp,
        i.comerciante_email,
        i.comerciante_direccion,
        i.comerciante_ciudad,
        i.distribuidor_nombre,
      ].some((v) => v && v.toLowerCase().includes(q));
    });
  }, [detalle, search, filtroOrigen, filtroEstado]);

  function exportCSVDetalle() {
    const header = [
      'Nombre', 'Nombre Comercial', 'Tipo Doc', 'Identificacion',
      'Telefono', 'WhatsApp', 'Direccion', 'Ciudad', 'Email',
      'Origen', 'Distribuidor', 'Tipo Evento', 'Estado',
      'WhatsApp Confirmado', 'Jornadas', 'Creada',
    ];
    const esc = (v: string | number | null | undefined) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const fmtJornadas = (ids: string[] | null) => {
      if (!ids || ids.length === 0) return '';
      return ids.map((id) => jornadasEvento.find((j) => j.id === id)?.label || id).join(' | ');
    };
    const rows = detalleFiltrado.map((i) => [
      i.comerciante_nombre,
      i.comerciante_nombre_comercial || '',
      i.tipo_doc || '',
      i.identificacion || '',
      i.comerciante_tel || '',
      i.comerciante_whatsapp || '',
      i.comerciante_direccion || '',
      i.comerciante_ciudad || '',
      i.comerciante_email || '',
      i.origen === 'pre_registro' ? 'Virtual (Pre-registro)' : 'Distribuidor',
      i.distribuidor_nombre,
      i.tipo_evento,
      i.estado,
      i.whatsapp_confirmado ? 'Si' : 'No',
      fmtJornadas(i.jornadas_seleccionadas),
      new Date(i.created_at).toISOString(),
    ].map(esc).join(','));
    const csv = '\ufeff' + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitaciones_detallado_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function openDrawer(dist: ReporteDistribuidorItem) {
    setDrawerDist(dist);
    setDrawerLoading(true);
    const items = await getInvitacionesPorDistribuidorAction(dist.distribuidor_id);
    setDrawerItems(items);
    setDrawerLoading(false);
  }

  function closeDrawer() {
    setDrawerDist(null);
    setDrawerItems([]);
  }

  function estadoInvBadge(estado: string) {
    switch (estado) {
      case 'aceptada': return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'rechazada': return 'bg-red-500/10 border-red-500/20 text-red-400';
      default: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
    }
  }

  function estadoInvLabel(estado: string) {
    switch (estado) {
      case 'aceptada': return 'Aceptada';
      case 'rechazada': return 'Rechazada';
      case 'pendiente': return 'Pendiente';
      default: return estado;
    }
  }

  function exportCSV() {
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

  return (
    <div className="space-y-6">
    {/* Drawer de invitaciones por distribuidor */}
    {drawerDist && (
      <div className="fixed inset-0 z-[200] flex justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
        <div className="relative w-full max-w-xl bg-slate-900 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-slate-950/50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">{drawerDist.distribuidor}</h3>
                <p className="text-[10px] text-admin-gold font-bold uppercase tracking-widest mt-1">
                  {drawerDist.total} invitaciones · {drawerDist.conversion.toFixed(1)}% conversion
                </p>
              </div>
              <button onClick={closeDrawer} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">✕</button>
            </div>
            {/* Mini resumen */}
            <div className="flex gap-3 mt-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-green-500/10 border border-green-500/30 text-green-400">Aceptadas {drawerDist.aceptadas}</span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">Pendientes {drawerDist.pendientes}</span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-red-500/10 border border-red-500/30 text-red-400">Rechazadas {drawerDist.rechazadas}</span>
            </div>
          </div>

          {/* Lista de invitaciones */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {drawerLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />
              </div>
            ) : drawerItems.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">Sin invitaciones encontradas.</p>
            ) : (
              drawerItems.map((inv) => (
                <div key={inv.id} className="bg-slate-950 border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-bold truncate">{inv.comerciante_nombre}</p>
                      {inv.comerciante_nombre_comercial && (
                        <p className="text-admin-gold text-xs font-bold truncate">{inv.comerciante_nombre_comercial}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${estadoInvBadge(inv.estado)}`}>
                      {estadoInvLabel(inv.estado)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">WhatsApp:</span> <span className="text-slate-300 font-mono">{inv.comerciante_whatsapp || '—'}</span></div>
                    <div><span className="text-slate-500">Email:</span> <span className="text-slate-300">{inv.comerciante_email || '—'}</span></div>
                    <div><span className="text-slate-500">Ciudad:</span> <span className="text-slate-300">{inv.comerciante_ciudad || '—'}</span></div>
                    <div><span className="text-slate-500">Origen:</span> <span className="text-slate-300">{inv.origen || 'manual'}</span></div>
                  </div>
                  <div className="flex items-center justify-between">
                    {inv.jornadas_seleccionadas && inv.jornadas_seleccionadas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {inv.jornadas_seleccionadas.map((jId) => {
                          const cfg = jornadasEvento.find(j => j.id === jId);
                          return (
                            <span key={jId} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider">
                              {cfg?.label || jId}
                            </span>
                          );
                        })}
                      </div>
                    ) : <span className="text-slate-600 text-[10px]">Sin jornada</span>}
                    <span className="text-[10px] text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-slate-950/80">
            <button onClick={closeDrawer} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest border border-white/5">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Tabs */}
    <div className="flex gap-2 border-b border-admin-border">
      <button
        onClick={() => setTab('distribuidor')}
        className={`px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors border-b-2 ${
          tab === 'distribuidor' ? 'text-admin-gold border-admin-gold' : 'text-slate-500 border-transparent hover:text-slate-300'
        }`}
      >
        Por Distribuidor
      </button>
      <button
        onClick={() => setTab('listado')}
        className={`px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors border-b-2 ${
          tab === 'listado' ? 'text-admin-gold border-admin-gold' : 'text-slate-500 border-transparent hover:text-slate-300'
        }`}
      >
        Listado Detallado
        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-admin-gold/10 border border-admin-gold/30 text-admin-gold">{detalle.length}</span>
      </button>
    </div>

    {/* Alertas */}
    {tab === 'distribuidor' && alertas.length > 0 && (
      <section className="bg-admin-card rounded-2xl border border-red-500/20 overflow-hidden">
        <button
          onClick={() => setAlertasOpen(!alertasOpen)}
          className="w-full flex items-center justify-between gap-4 p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🚨</span>
            <h2 className="text-white text-sm font-black uppercase tracking-widest">Alertas de Actividad Sospechosa</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 border border-red-500/40 text-red-400">{alertas.length}</span>
          </div>
          <span className="text-slate-500 text-xs">{alertasOpen ? '▼' : '▶'}</span>
        </button>
        {alertasOpen && (
          <div className="px-5 pb-5 space-y-3">
            {alertas.map((a, i) => {
              const meta = alertaTipoLabel[a.tipo] || alertaTipoLabel.sin_confirmacion;
              return (
                <div key={`${a.distribuidor_id}-${a.tipo}-${i}`} className={`flex items-start gap-3 p-4 rounded-xl border ${meta.color}`}>
                  <span className="text-lg flex-shrink-0">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold">{a.distribuidor}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{meta.label}: <span className="text-white font-bold">{a.detalle}</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    )}

    {tab === 'distribuidor' && (
    <section className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-5 border-b border-admin-border">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-admin-gold rounded-full" />
          <h2 className="text-white text-sm font-black uppercase tracking-widest">Reporte por Distribuidor</h2>
          {loading && <div className="w-4 h-4 border-2 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />}
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-admin-border font-black rounded-xl transition-all text-[10px] uppercase tracking-widest"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={exportCSV}
            disabled={reporte.length === 0}
            className="px-4 py-2 bg-admin-blue/10 hover:bg-admin-blue/20 disabled:opacity-40 text-admin-blue border border-admin-blue/20 font-black rounded-xl transition-all text-[10px] uppercase tracking-widest"
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>
      {reporte.length === 0 && !loading ? (
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
                <tr key={r.distribuidor_id} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => openDrawer(r)}>
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
                  <td className={`p-4 text-right text-sm font-black ${conversionColor(r.conversion, r.total)}`}>
                    {r.conversion.toFixed(1)}%
                    {r.total > 5 && r.conversion < 20 && <span className="ml-1">🚨</span>}
                  </td>
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

    {tab === 'listado' && (
    <section className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-admin-border">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-admin-gold rounded-full" />
          <h2 className="text-white text-sm font-black uppercase tracking-widest">Listado Detallado</h2>
          {detalleLoading && <div className="w-4 h-4 border-2 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />}
          <span className="text-slate-500 text-xs">
            {detalleFiltrado.length} de {detalle.length}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={refreshDetalle}
            disabled={detalleLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-admin-border font-black rounded-xl transition-all text-[10px] uppercase tracking-widest"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={exportCSVDetalle}
            disabled={detalleFiltrado.length === 0}
            className="px-4 py-2 bg-admin-blue/10 hover:bg-admin-blue/20 disabled:opacity-40 text-admin-blue border border-admin-blue/20 font-black rounded-xl transition-all text-[10px] uppercase tracking-widest"
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-5 border-b border-admin-border flex flex-wrap gap-3 bg-slate-900/30">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, cédula, WhatsApp, email…"
          className="flex-1 min-w-[240px] bg-slate-950 border border-admin-border rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-admin-gold/50"
        />
        <select
          value={filtroOrigen}
          onChange={(e) => setFiltroOrigen(e.target.value as any)}
          className="bg-slate-950 border border-admin-border rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-admin-gold/50"
        >
          <option value="todos">Todos los orígenes</option>
          <option value="distribuidor">Solo Distribuidor</option>
          <option value="pre_registro">Solo Virtual (Pre-registro)</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
          className="bg-slate-950 border border-admin-border rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-admin-gold/50"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aceptada">Aceptada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </div>

      {detalleFiltrado.length === 0 && !detalleLoading ? (
        <div className="p-10 text-center text-slate-500 text-sm">Sin invitaciones que coincidan con los filtros.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="border-b border-admin-border text-[10px] uppercase text-slate-500 bg-slate-900/50">
                <th className="p-3 font-bold">Comerciante</th>
                <th className="p-3 font-bold">Comercio</th>
                <th className="p-3 font-bold">Cédula</th>
                <th className="p-3 font-bold">Teléfono</th>
                <th className="p-3 font-bold">WhatsApp</th>
                <th className="p-3 font-bold">Dirección</th>
                <th className="p-3 font-bold">Ciudad</th>
                <th className="p-3 font-bold">Email</th>
                <th className="p-3 font-bold">Origen</th>
                <th className="p-3 font-bold">Distribuidor</th>
                <th className="p-3 font-bold">Estado</th>
                <th className="p-3 font-bold">Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {detalleFiltrado.map((i) => (
                <tr key={i.id} className="hover:bg-slate-800/30 transition-colors text-xs">
                  <td className="p-3 text-white font-bold">{i.comerciante_nombre}</td>
                  <td className="p-3 text-admin-gold">{i.comerciante_nombre_comercial || '—'}</td>
                  <td className="p-3 text-slate-300 font-mono">
                    {i.identificacion ? (
                      <span className="flex items-center gap-1">
                        {i.tipo_doc ? `${i.tipo_doc} ` : ''}{i.identificacion}
                        {i.identificacion_fuente === 'pack' && (
                          <span title="Obtenida desde un pack con el mismo WhatsApp" className="text-[9px] text-slate-500">↻</span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3 text-slate-300 font-mono">{i.comerciante_tel || '—'}</td>
                  <td className="p-3 text-slate-300 font-mono">{i.comerciante_whatsapp || '—'}</td>
                  <td className="p-3 text-slate-300 max-w-[200px] truncate" title={i.comerciante_direccion || ''}>
                    {i.comerciante_direccion || '—'}
                  </td>
                  <td className="p-3 text-slate-300">{i.comerciante_ciudad || '—'}</td>
                  <td className="p-3 text-slate-300 max-w-[180px] truncate" title={i.comerciante_email || ''}>
                    {i.comerciante_email || '—'}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      i.origen === 'pre_registro'
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    }`}>
                      {i.origen === 'pre_registro' ? 'Virtual' : 'Distribuidor'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{i.distribuidor_nombre}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${estadoInvBadge(i.estado)}`}>
                      {estadoInvLabel(i.estado)}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 text-[10px]">
                    {new Date(i.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    )}
    </div>
  );
}
