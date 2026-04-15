'use client';

import { useState } from 'react';
import { getReporteInvitacionesAction, type ReporteDistribuidorItem } from '../actions';

type JornadaConfig = { id: string; fecha: string; hora: string; label: string };

export default function ReporteClient({
  initial,
  jornadasEvento,
}: {
  initial: ReporteDistribuidorItem[];
  jornadasEvento: JornadaConfig[];
}) {
  const [reporte, setReporte] = useState<ReporteDistribuidorItem[]>(initial);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await getReporteInvitacionesAction();
    setReporte(res);
    setLoading(false);
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
  );
}
