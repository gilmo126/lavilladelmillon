'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function VentasClient({ initialData, total, currentPage, query, totalPages }: { initialData: any[]; total: number; currentPage: number; query: string; totalPages: number }) {
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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Buscar Cliente (CC o Nombre)</label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: 1114..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-admin-blue transition-colors text-sm"
            />
            <button type="submit" className="bg-admin-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-colors text-sm">Buscar</button>
          </div>
        </form>
        <div className="md:col-span-1 text-right pb-1">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Registros</p>
          <p className="text-2xl font-black text-white">{total}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden shadow-2xl">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
              <th className="p-4 font-bold">Fecha Venta</th>
              <th className="p-4 font-bold">Cliente / CC</th>
              <th className="p-4 font-bold">Boleta Token</th>
              <th className="p-4 font-bold">Comercio</th>
              <th className="p-4 font-bold">Vendedor</th>
              <th className="p-4 font-bold text-center">Legal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {initialData.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-20 text-slate-500 italic">No se encontraron ventas registradas.</td></tr>
            ) : (
              initialData.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-xs text-slate-400">
                    {new Date(v.created_at).toLocaleDateString('es-CO')}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-white text-sm">{v.cliente_nombre}</p>
                    <p className="text-[10px] text-slate-500 font-mono">CC: {v.cliente_id}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-admin-gold font-mono text-sm font-bold">{v.boleta?.token_integridad}</span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{v.comercio_nombre}</td>
                  <td className="p-4">
                    <p className="text-xs text-white font-medium">{v.distribuidor?.nombre}</p>
                  </td>
                  <td className="p-4 text-center">
                    {v.acepta_tratamiento_datos ? (
                      <span className="inline-flex items-center justify-center p-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 group relative" title="Habeas Data Aceptado">
                        🛡️
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 p-3 bg-slate-900 border border-admin-green rounded-xl shadow-2xl">
                          <p className="text-[10px] font-bold text-admin-green uppercase">Consentimiento Legal</p>
                          <p className="text-[10px] text-white mt-1">Aceptó política de privacidad el {new Date(v.fecha_consentimiento).toLocaleDateString()}</p>
                        </div>
                      </span>
                    ) : (
                      <span className="text-red-400/30" title="No aceptó">🚫</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Container */}
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-admin-border">
         <div className="text-xs text-slate-500">Página {currentPage} de {totalPages}</div>
         <div className="flex gap-2">
            <button
               onClick={() => router.push(`/ventas?query=${query}&page=${currentPage - 1}`)}
               disabled={currentPage <= 1}
               className="p-2 bg-admin-card border border-admin-border rounded-lg text-white disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-800"
            >
               ← Anterior
            </button>
            <button
               onClick={() => router.push(`/ventas?query=${query}&page=${currentPage + 1}`)}
               disabled={currentPage >= totalPages}
               className="p-2 bg-admin-card border border-admin-border rounded-lg text-white disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-800"
            >
               Siguiente →
            </button>
         </div>
      </div>
    </div>
  );
}
