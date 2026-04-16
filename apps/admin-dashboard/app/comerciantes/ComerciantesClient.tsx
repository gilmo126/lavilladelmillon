'use client';

import { useState, useEffect } from 'react';
import {
  getComerciantesAction, actualizarComercianteAction, eliminarComercianteAction,
  type ComercianteItem,
} from './actions';

function ComercianteDrawer({
  comerciante,
  onClose,
  onUpdated,
}: {
  comerciante: ComercianteItem;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [nombre, setNombre] = useState(comerciante.comerciante_nombre);
  const [nombreComercial, setNombreComercial] = useState(comerciante.comerciante_nombre_comercial || '');
  const [ciudad, setCiudad] = useState(comerciante.comerciante_ciudad || '');
  const [tipoId, setTipoId] = useState(comerciante.comerciante_tipo_id);
  const [tel, setTel] = useState(comerciante.comerciante_tel || '');
  const [wa, setWa] = useState(comerciante.comerciante_whatsapp || '');
  const [email, setEmail] = useState(comerciante.comerciante_email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await actualizarComercianteAction(comerciante.comerciante_identificacion, {
      comerciante_nombre: nombre,
      comerciante_nombre_comercial: nombreComercial,
      comerciante_ciudad: ciudad,
      comerciante_tipo_id: tipoId,
      comerciante_tel: tel,
      comerciante_whatsapp: wa,
      comerciante_email: email,
    });
    setSaving(false);
    setSaved(true);
    onUpdated();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await eliminarComercianteAction(comerciante.comerciante_identificacion);
    setDeleting(false);
    if (res.success) {
      onUpdated();
      onClose();
    } else {
      alert(res.error || 'Error al eliminar');
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-950/50">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{comerciante.comerciante_nombre}</h3>
            <p className="text-[10px] text-admin-gold font-bold uppercase tracking-widest mt-1">
              {comerciante.comerciante_tipo_id} {comerciante.comerciante_identificacion}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Info */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Distribuidor</p>
                <p className="text-slate-300 font-bold">{comerciante.distribuidor_nombre || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Primer registro</p>
                <p className="text-slate-300">{comerciante.fecha_primer_pack ? new Date(comerciante.fecha_primer_pack).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {comerciante.total_packs > 0 && <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-admin-gold/10 border border-admin-gold/30 text-admin-gold">Packs: {comerciante.total_packs}</span>}
              {comerciante.total_invitaciones > 0 && <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-purple-500/10 border border-purple-500/30 text-purple-400">Invitaciones: {comerciante.total_invitaciones}</span>}
              {comerciante.total_pre_registros > 0 && <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">Pre-registro virtual: {comerciante.total_pre_registros}</span>}
            </div>
          </section>

          {/* Datos editables */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-admin-blue rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Datos del Comerciante</h4>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre *</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre Comercial</label>
              <input value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} placeholder="Nombre del negocio"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Ciudad</label>
              <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej: Palmira"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tipo Doc</label>
                <select value={tipoId} onChange={(e) => setTipoId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue appearance-none">
                  <option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option><option value="PP">PP</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Identificación</label>
                <input value={comerciante.comerciante_identificacion} readOnly
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm cursor-not-allowed" />
              </div>
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
              {saving ? 'Guardando...' : saved ? '✓ Actualizado en todos los packs' : 'Guardar Cambios'}
            </button>
          </section>
        </div>

        <div className="p-6 border-t border-white/10 bg-slate-950/80 space-y-3">
          {confirmDelete ? (
            <div className="space-y-3">
              <p className="text-red-400 text-xs font-bold text-center">
                ¿Eliminar a {comerciante.comerciante_nombre}{comerciante.total_packs > 0 ? ` y sus ${comerciante.total_packs} pack${comerciante.total_packs !== 1 ? 's' : ''}` : ''}?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setConfirmDelete(false)} className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase">Cancelar</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase disabled:opacity-50">
                  {deleting ? 'Eliminando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black rounded-2xl transition-all text-xs uppercase tracking-widest">
              Eliminar Comerciante y sus Packs
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

const ITEMS_PER_PAGE = 10;

export default function ComerciantesClient({ initialData }: { initialData: ComercianteItem[] }) {
  const [data, setData] = useState<ComercianteItem[]>(initialData);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ComercianteItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  async function reload() {
    setLoading(true);
    const res = await getComerciantesAction();
    setData(res);
    setPage(1);
    setLoading(false);
  }

  const filtered = data.filter((c) => {
    const s = search.toLowerCase();
    return c.comerciante_nombre.toLowerCase().includes(s) ||
      (c.comerciante_nombre_comercial || '').toLowerCase().includes(s) ||
      c.comerciante_identificacion.includes(search) ||
      (c.comerciante_whatsapp || '').includes(search);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  function handleExportCSV() {
    if (filtered.length === 0) return;
    const headers = ['Nombre', 'Nombre Comercial', 'Ciudad', 'Tipo Doc', 'Identificación', 'Teléfono', 'WhatsApp', 'Email', 'Distribuidor', 'Packs', 'Invitaciones', 'Pre-Registros', 'Origen', 'Fecha Registro'];
    const rows = filtered.map((c) => [
      c.comerciante_nombre,
      c.comerciante_nombre_comercial || '',
      c.comerciante_ciudad || '',
      c.comerciante_tipo_id,
      c.comerciante_identificacion,
      c.comerciante_tel || '',
      c.comerciante_whatsapp || '',
      c.comerciante_email || '',
      c.distribuidor_nombre || '',
      String(c.total_packs),
      String(c.total_invitaciones),
      String(c.total_pre_registros),
      c.origenes.join(', '),
      c.fecha_primer_pack ? new Date(c.fecha_primer_pack).toLocaleDateString('es-CO') : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comerciantes.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {selected && (
        <ComercianteDrawer comerciante={selected} onClose={() => setSelected(null)} onUpdated={() => { reload(); setSelected(null); }} />
      )}

      {/* Search + Export */}
      <div className="flex flex-wrap gap-4 items-end bg-admin-card p-6 rounded-2xl border border-admin-border">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Buscar Comerciante</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o identificación..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-admin-blue transition-colors text-sm" />
        </div>
        <button onClick={handleExportCSV} disabled={filtered.length === 0}
          className="px-5 py-2.5 bg-admin-gold hover:bg-yellow-500 text-slate-900 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:grayscale">
          Exportar CSV
        </button>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
          <p className="text-2xl font-black text-white">{filtered.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                <th className="p-4 font-bold">Comerciante</th>
                <th className="p-4 font-bold">Identificación</th>
                <th className="p-4 font-bold">WhatsApp</th>
                <th className="p-4 font-bold">Distribuidor</th>
                <th className="p-4 font-bold text-center">Origen</th>
                <th className="p-4 font-bold">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-slate-500 italic">Sin comerciantes registrados.</td></tr>
              ) : (
                paged.map((c) => (
                  <tr key={c.comerciante_identificacion} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{c.comerciante_nombre}</p>
                      {c.comerciante_nombre_comercial && <p className="text-[10px] text-admin-gold font-bold mt-0.5">{c.comerciante_nombre_comercial}</p>}
                      {c.comerciante_ciudad && <p className="text-[10px] text-slate-500 mt-0.5">{c.comerciante_ciudad}</p>}
                    </td>
                    <td className="p-4 text-sm text-slate-300 font-mono">{c.comerciante_tipo_id} {c.comerciante_identificacion || '—'}</td>
                    <td className="p-4 text-sm text-slate-400 font-mono">{c.comerciante_whatsapp || '—'}</td>
                    <td className="p-4 text-sm text-slate-300 font-bold uppercase">{c.distribuidor_nombre || '—'}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap justify-center gap-1">
                        {c.total_packs > 0 && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-admin-gold/10 border border-admin-gold/30 text-admin-gold">Pack {c.total_packs}</span>}
                        {c.total_invitaciones > 0 && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 border border-purple-500/30 text-purple-400">Inv {c.total_invitaciones}</span>}
                        {c.total_pre_registros > 0 && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">Virtual {c.total_pre_registros}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {c.fecha_primer_pack ? new Date(c.fecha_primer_pack).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-admin-border">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Página {page} de {totalPages} · {filtered.length} comerciantes
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
  );
}
