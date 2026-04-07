'use client';

import { useState } from 'react';
import { buscarTrazabilidadAction } from './actions';

type TrackResult = {
  id_boleta: number;
  token_boleta: string;
  estado: number;
  estado_label: string;
  asignado_por_nombre: string | null;
  asignado_por_rol: string | null;
  distribuidor_nombre: string | null;
  distribuidor_zona: string | null;
  distribuidor_movil: string | null;
  comercio_nombre: string | null;
  zona_comercio: string | null;
  fecha_activacion: string | null;
  nombre_cliente: string | null;
  cedula_cliente: string | null;
  telefono_cliente: string | null;
  fecha_registro: string | null;
  premio_nombre: string | null;
};

function StepBadge({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
      done ? 'bg-green-500/10 border-green-500/30 text-green-400'
      : active ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      : 'bg-slate-800/60 border-slate-700 text-slate-500'
    }`}>
      <span>{done ? '✓' : active ? '●' : '○'}</span>
      {label}
    </div>
  );
}

function ResultCard({ r }: { r: TrackResult }) {
  const estado = r.estado;
  return (
    <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-admin-border flex items-center justify-between">
        <div>
          <p className="font-mono text-admin-blue font-bold text-lg">{r.token_boleta}</p>
          <p className="text-xs text-slate-400">ID numérico: {r.id_boleta}</p>
        </div>
        <span className="bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded-full">{r.estado_label}</span>
      </div>

      {/* Cadena de Estados */}
      <div className="p-5 border-b border-admin-border">
        <p className="text-xs text-slate-500 uppercase font-bold mb-3">Cadena Logística</p>
        <div className="flex flex-wrap gap-2">
          <StepBadge done={estado >= 1} active={estado === 0} label="📦 Bodega" />
          <StepBadge done={estado >= 2} active={estado === 1} label="🚚 Despachada" />
          <StepBadge done={estado >= 3} active={estado === 2} label="🏪 En Comercio" />
          <StepBadge done={estado >= 3} active={false} label="✅ Registrada" />
        </div>
      </div>

      {/* Detalles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-admin-border">
        {/* Quién despachó */}
        <div className="p-5">
          <p className="text-xs text-slate-500 uppercase font-bold mb-3">👤 Despachado Por</p>
          {r.asignado_por_nombre ? (
            <div className="space-y-1">
              <p className="text-white font-semibold">{r.asignado_por_nombre}</p>
              <p className="text-xs text-slate-400 capitalize">Rol: {r.asignado_por_rol}</p>
            </div>
          ) : <p className="text-slate-500 text-sm italic">Aún no despachada</p>}
        </div>

        {/* Distribuidor */}
        <div className="p-5">
          <p className="text-xs text-slate-500 uppercase font-bold mb-3">🚚 Distribuidor Receptor</p>
          {r.distribuidor_nombre ? (
            <div className="space-y-1">
              <p className="text-white font-semibold">{r.distribuidor_nombre}</p>
              <p className="text-xs text-slate-400">📍 {r.distribuidor_zona || '—'}</p>
              {r.distribuidor_movil && <p className="text-xs text-slate-400">📱 {r.distribuidor_movil}</p>}
            </div>
          ) : <p className="text-slate-500 text-sm italic">Sin distribuidor asignado</p>}
        </div>

        {/* Comercio */}
        <div className="p-5">
          <p className="text-xs text-slate-500 uppercase font-bold mb-3">🏪 Punto de Activación</p>
          {r.comercio_nombre ? (
            <div className="space-y-1">
              <p className="text-white font-semibold">{r.comercio_nombre}</p>
              {r.zona_comercio && <p className="text-xs text-slate-400">📍 {r.zona_comercio}</p>}
              {r.fecha_activacion && <p className="text-xs text-slate-400">🕐 {new Date(r.fecha_activacion).toLocaleString('es-CO')}</p>}
            </div>
          ) : <p className="text-slate-500 text-sm italic">Pendiente de activación</p>}
        </div>

        {/* Cliente / Ganador */}
        <div className="p-5">
          <p className="text-xs text-slate-500 uppercase font-bold mb-3">🏆 Titular / Ganador</p>
          {r.nombre_cliente ? (
            <div className="space-y-1">
              <p className="text-white font-semibold">{r.nombre_cliente}</p>
              {r.cedula_cliente && <p className="text-xs text-slate-400 font-mono">CC: {r.cedula_cliente}</p>}
              {r.telefono_cliente && <p className="text-xs text-slate-400">📱 {r.telefono_cliente}</p>}
              {r.fecha_registro && <p className="text-xs text-slate-400">🕐 {new Date(r.fecha_registro).toLocaleString('es-CO')}</p>}
              {r.premio_nombre && (
                <p className="text-xs text-admin-gold font-bold mt-2">🎁 Premio: {r.premio_nombre}</p>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm italic">Sin registro de cliente</p>}
        </div>
      </div>
    </div>
  );
}

export default function TrazabilidadClient({ userProfile }: { userProfile: any }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrackResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResults = results.slice(startIndex, startIndex + itemsPerPage);

  const isDist = userProfile?.rol === 'distribuidor';

  async function handleSearch(formData: FormData) {
    setLoading(true);
    setError(null);
    setSearched(false);
    setCurrentPage(1); // Reset a primera página en cada búsqueda

    const resp = await buscarTrazabilidadAction(formData);
    setLoading(false);
    setSearched(true);

    if (resp.success) {
      setResults(resp.results as TrackResult[]);
    } else {
      setError(resp.error || 'Error desconocido.');
      setResults([]);
    }
  }

  return (
    <div>
      {/* Buscador */}
      <div className="bg-admin-card rounded-2xl border border-admin-border p-6 mb-8">
        <form action={handleSearch} className="flex gap-3">
          <input
            name="query"
            type="text"
            placeholder="Número de boleta (ej: 5005) o Cédula del cliente..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-admin-blue transition-colors text-sm"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-admin-blue text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔎'}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-3">
          Puedes buscar por el <strong className="text-slate-400">número numérico de la boleta</strong> o por la <strong className="text-slate-400">cédula del cliente registrado</strong>.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm font-medium">{error}</div>
      )}

      {/* Resultados */}
      {searched && results.length === 0 && !error && (
        <div className="text-center text-slate-500 py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p>No se encontraron boletas con ese criterio.</p>
        </div>
      )}

      <div className="space-y-6">
        {paginatedResults.map(r => <ResultCard key={r.id_boleta} r={r} />)}
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="mt-10 mb-20 p-6 bg-admin-card border border-admin-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="text-sm font-medium text-slate-400">
             Viendo <span className="text-white font-bold">{startIndex + 1}</span> - <span className="text-white font-bold">{Math.min(startIndex + itemsPerPage, results.length)}</span> de <span className="text-white font-bold">{results.length}</span> resultados de auditoría
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-white disabled:opacity-30 disabled:grayscale hover:border-admin-blue transition-all"
            >
              ←
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i + 1;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-12 h-12 flex items-center justify-center rounded-xl font-bold text-sm transition-all border ${
                    currentPage === pageNum 
                      ? 'bg-admin-blue border-admin-blue text-white shadow-lg shadow-admin-blue/20' 
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-white disabled:opacity-30 disabled:grayscale hover:border-admin-blue transition-all"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
