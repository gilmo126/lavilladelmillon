'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

function estadoPagoBadge(estado: string) {
  switch (estado) {
    case 'pagado':
      return 'bg-green-500/10 border-green-500/20 text-green-400';
    case 'pendiente':
      return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
    case 'vencido':
      return 'bg-red-500/10 border-red-500/20 text-red-400';
    default:
      return 'bg-slate-100/10 border-white/5 text-slate-300';
  }
}

export default function VentasClient({
  initialData,
  total,
  currentPage,
  query,
  totalPages,
}: {
  initialData: any[];
  total: number;
  currentPage: number;
  query: string;
  totalPages: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/ventas?query=${search}&page=1`);
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-admin-card p-6 rounded-2xl border border-admin-border">
        <form onSubmit={handleSearch} className="md:col-span-3">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Buscar Comerciante (Nombre o Teléfono)
          </label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: Tienda El Progreso..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-admin-blue transition-colors text-sm"
            />
            <button
              type="submit"
              className="bg-admin-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-colors text-sm"
            >
              Buscar
            </button>
          </div>
        </form>
        <div className="md:col-span-1 text-right pb-1">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Packs</p>
          <p className="text-2xl font-black text-white">{total}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                <th className="p-4 font-bold">Comerciante</th>
                <th className="p-4 font-bold">Distribuidor</th>
                <th className="p-4 font-bold">Tipo Pago</th>
                <th className="p-4 font-bold">Estado Pago</th>
                <th className="p-4 font-bold">Fecha Venta</th>
                <th className="p-4 font-bold">Vencimiento</th>
                <th className="p-4 font-bold text-center"># Números</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-500 italic">
                    No se encontraron packs vendidos.
                  </td>
                </tr>
              ) : (
                initialData.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{p.comerciante_nombre}</p>
                      {p.comerciante_tel && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {p.comerciante_tel}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-300 font-bold uppercase">
                      {p.distribuidor?.nombre || '—'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-sm font-bold ${
                          p.tipo_pago === 'inmediato' ? 'text-green-400' : 'text-yellow-400'
                        }`}
                      >
                        {p.tipo_pago === 'inmediato' ? '✅ Inmediato' : '⏳ Pendiente'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${estadoPagoBadge(
                          p.estado_pago
                        )}`}
                      >
                        {p.estado_pago}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {p.fecha_venta
                        ? new Date(p.fecha_venta).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {p.fecha_vencimiento_pago
                        ? new Date(p.fecha_vencimiento_pago).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-800 text-white font-mono font-bold text-xs px-3 py-1 rounded-lg">
                        {p.numeros_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-admin-border">
        <div className="text-xs text-slate-500">
          Página {currentPage} de {totalPages || 1}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/ventas?query=${query}&page=${currentPage - 1}`)}
            disabled={currentPage <= 1}
            className="p-2 bg-admin-card border border-admin-border rounded-lg text-white disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-800 text-sm font-bold"
          >
            ← Anterior
          </button>
          <button
            onClick={() => router.push(`/ventas?query=${query}&page=${currentPage + 1}`)}
            disabled={currentPage >= totalPages}
            className="p-2 bg-admin-card border border-admin-border rounded-lg text-white disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-800 text-sm font-bold"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
