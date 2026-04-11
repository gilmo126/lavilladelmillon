'use client';

import { useState } from 'react';
import { getAsistenciaAction, type AsistenciaItem } from '../scanner/actions';

export default function AsistenciaClient({ initialData }: { initialData: AsistenciaItem[] }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<AsistenciaItem[]>(initialData);
  const [loading, setLoading] = useState(false);

  async function handleFechaChange(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setLoading(true);
    const result = await getAsistenciaAction(nuevaFecha);
    setData(result);
    setLoading(false);
  }

  async function handleRefresh() {
    setLoading(true);
    const result = await getAsistenciaAction(fecha);
    setData(result);
    setLoading(false);
  }

  function handleExportCSV() {
    if (data.length === 0) return;

    const headers = ['Pack', 'Comerciante', 'Teléfono', 'WhatsApp', 'Hora Llegada', 'Distribuidor'];
    const rows = data.map((a) => [
      a.numero_pack ? `PACK-${String(a.numero_pack).padStart(3, '0')}` : '',
      a.comerciante_nombre,
      a.comerciante_tel || '',
      a.comerciante_whatsapp || '',
      new Date(a.qr_usado_at).toLocaleString('es-CO'),
      a.distribuidor?.nombre || '',
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencia-${fecha}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 bg-admin-card p-6 rounded-2xl border border-admin-border">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => handleFechaChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-admin-blue transition-colors text-sm"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-5 py-2.5 bg-admin-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>

        <button
          onClick={handleExportCSV}
          disabled={data.length === 0}
          className="px-5 py-2.5 bg-admin-gold hover:bg-yellow-500 text-slate-900 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:grayscale"
        >
          Exportar CSV
        </button>

        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Asistentes</p>
          <p className="text-2xl font-black text-white">{data.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                <th className="p-4 font-bold">Hora</th>
                <th className="p-4 font-bold">Comerciante</th>
                <th className="p-4 font-bold">Teléfono</th>
                <th className="p-4 font-bold">WhatsApp</th>
                <th className="p-4 font-bold">Distribuidor</th>
                <th className="p-4 font-bold">Pack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-500 italic">
                    Sin asistentes registrados para esta fecha.
                  </td>
                </tr>
              ) : (
                data.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 text-admin-gold font-bold text-sm">
                      {new Date(a.qr_usado_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{a.comerciante_nombre}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-400 font-mono">{a.comerciante_tel || '—'}</td>
                    <td className="p-4 text-sm text-slate-400 font-mono">{a.comerciante_whatsapp || '—'}</td>
                    <td className="p-4 text-sm text-slate-300 font-bold uppercase">
                      {a.distribuidor?.nombre || '—'}
                    </td>
                    <td className="p-4 text-admin-gold font-black text-xs">{a.numero_pack ? `PACK-${String(a.numero_pack).padStart(3, '0')}` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
