'use client';

import { useState, useEffect } from 'react';
import { updatePerfilAction, deleteDistribuidorAction } from './actions';
import { getPacksDistribuidorAction } from '../../lib/actions';

type Perfil = {
  id: string;
  nombre: string;
  rol: string;
  cedula?: string;
  movil?: string;
  direccion?: string;
  zona_id?: string;
  zonas?: { id: string, nombre: string };
};

function EditModal({ perfil, zonas, onClose }: { perfil: Perfil; zonas: any[]; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>(perfil.zona_id || '');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    fd.set('target_id', perfil.id);
    if (selectedZone) fd.set('zona_id', selectedZone);

    const resp = await updatePerfilAction(fd);
    setLoading(false);
    if (resp.success) {
      setMsg('✅ Perfil y zonas actualizadas correctamente.');
      setTimeout(onClose, 1500);
    } else {
      setMsg(`❌ ${resp.error}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-admin-gold/30 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-admin-gold to-transparent" />

        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Editar Agente</h3>
            <p className="text-[10px] text-admin-gold font-bold uppercase tracking-widest mt-1">{perfil.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">✕</button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl mb-6 border text-xs font-bold animate-in zoom-in-95 ${
            msg.startsWith('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1 block">Nombre Completo</label>
              <input name="nombre" defaultValue={perfil.nombre} required className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1 block">Celular / Móvil</label>
              <input name="movil" defaultValue={perfil.movil || ''} className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-admin-blue transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1 block">Cédula / NIT</label>
              <input defaultValue={perfil.cedula || ''} disabled className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1 block">Zona Territorial Asignada</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-2xl border border-white/5 custom-scrollbar">
              {zonas.map(z => (
                <label key={z.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedZone === z.id ? 'bg-admin-blue/10 border-admin-blue text-white' : 'border-white/5 text-slate-500 hover:bg-white/5'
                }`}>
                  <input
                    type="radio"
                    name="zona_id"
                    value={z.id}
                    checked={selectedZone === z.id}
                    onChange={() => setSelectedZone(z.id)}
                    className="hidden"
                  />
                  <span className="text-[10px] font-bold uppercase truncate">{z.nombre}</span>
                  {selectedZone === z.id && <span className="ml-auto text-admin-blue">✓</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all outline-none">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-2 bg-admin-blue hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 flex-[2]">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InventoryDrawer({ dist, onClose }: { dist: Perfil; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await getPacksDistribuidorAction(dist.id);
      if (res.success) setPacks(res.packs);
      setLoading(false);
    }
    load();
  }, [dist.id]);

  const totalPacks = packs.length;
  const totalNumeros = totalPacks * 25;
  const pagados = packs.filter(p => p.estado_pago === 'pagado').length;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-admin-gold/20 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col h-full">
        <div className="p-8 border-b border-white/5 flex justify-between items-start bg-slate-950/30">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">{dist.nombre}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-admin-gold/10 border border-admin-gold/20 text-admin-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                📍 {dist.zonas?.nombre || 'Zona General'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-admin-gold gap-4">
              <div className="w-10 h-10 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-tighter">Consultando packs...</p>
            </div>
          ) : (
            <>
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-3 bg-admin-blue rounded-full" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resumen</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-white">{totalPacks}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Packs</p>
                  </div>
                  <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-white">{totalNumeros}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Números</p>
                  </div>
                  <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-green-400">{pagados}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Pagados</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-3 bg-admin-gold rounded-full" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Packs Vendidos</h4>
                </div>
                <div className="space-y-3">
                  {packs.map((p) => (
                    <div key={p.id} className="bg-slate-950 border border-white/5 p-4 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-white">{p.comerciante_nombre}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          p.estado_pago === 'pagado' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                          p.estado_pago === 'pendiente' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                          'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>{p.estado_pago}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold">
                        <span>{p.tipo_pago === 'inmediato' ? '✅' : '⏳'} {p.tipo_pago}</span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span>{p.fecha_venta ? new Date(p.fecha_venta).toLocaleDateString('es-CO') : '—'}</span>
                      </div>
                    </div>
                  ))}
                  {packs.length === 0 && <p className="text-center text-slate-600 text-xs py-10 italic">Sin packs vendidos aún.</p>}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="p-8 bg-slate-950/80 border-t border-white/5">
          <button onClick={onClose} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all">
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonalTable({ personas, zonas, canDelete, onInspect }: { personas: Perfil[]; zonas: any[]; canDelete: boolean, onInspect: (p: Perfil) => void }) {
  const [editing, setEditing] = useState<Perfil | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('¿Confirma que desea dar de baja este perfil? Esta acción es irreversible.')) return;
    setDeletingId(id);
    await deleteDistribuidorAction(id);
    setDeletingId(null);
  }

  if (personas.length === 0) {
    return <div className="p-20 text-center text-slate-600 uppercase text-xs font-bold tracking-widest">No hay registros en esta sección.</div>;
  }

  return (
    <>
      {editing && <EditModal perfil={editing} zonas={zonas} onClose={() => setEditing(null)} />}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-admin-border text-[10px] uppercase text-slate-500 bg-slate-900/30 font-black tracking-tighter">
              <th className="p-5">Agente / Documento</th>
              <th className="p-5">Contacto</th>
              <th className="p-5">Zonas Autorizadas</th>
              <th className="p-5 text-right">Audit Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {personas.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/20 transition-all group">
                <td className="p-5">
                  <p className="font-bold text-white group-hover:text-admin-gold transition-colors">{p.nombre}</p>
                  {p.cedula && <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {p.cedula}</p>}
                </td>
                <td className="p-5">
                  <p className="text-xs text-white/80">{p.movil || '—'}</p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[150px]" title={p.direccion}>{p.direccion || '—'}</p>
                </td>
                <td className="p-5">
                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                    {p.zonas ? (
                      <span className="bg-admin-blue/5 text-admin-blue border border-admin-blue/10 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                        {p.zonas.nombre}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-600 uppercase font-bold italic">Sin Zona</span>
                    )}
                  </div>
                </td>
                <td className="p-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onInspect(p)}
                      className="w-10 h-10 flex items-center justify-center bg-admin-gold/10 hover:bg-admin-gold text-admin-gold hover:text-slate-900 rounded-xl transition-all border border-admin-gold/20 shadow-lg shadow-admin-gold/5"
                      title="Auditar Inventario"
                    >
                      🎫
                    </button>
                    <button onClick={() => setEditing(p)} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase rounded-lg transition-all">Editar</button>
                    {canDelete && (
                      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all border border-red-500/20 group/del">
                        {deletingId === p.id ? '...' : '✕'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function GestionPersonalClient({
  distribuidores, zonas
}: {
  distribuidores: Perfil[];
  zonas: any[];
}) {
  const [inspecting, setInspecting] = useState<Perfil | null>(null);

  return (
    <div>
      {inspecting && <InventoryDrawer dist={inspecting} onClose={() => setInspecting(null)} />}
      <div className="bg-admin-card rounded-3xl border border-admin-border overflow-hidden shadow-2xl relative">
        <PersonalTable
          personas={distribuidores}
          zonas={zonas}
          canDelete={true}
          onInspect={setInspecting}
        />
      </div>
    </div>
  );
}
