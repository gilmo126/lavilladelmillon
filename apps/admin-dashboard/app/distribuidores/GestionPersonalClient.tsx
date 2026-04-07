'use client';

import { useState, useEffect } from 'react';
import { updatePerfilAction, deleteDistribuidorAction } from './actions';

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
             <p className="text-[9px] text-slate-600 mt-2 px-1 uppercase font-bold">* El agente operará bajo esta zona territorial central.</p>
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

import { getInventarioDistribuidorAction } from '../../lib/actions';

function InventoryDrawer({ dist, onClose }: { dist: Perfil; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ resumen: any, lotes: any[], frentes: any[] } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getInventarioDistribuidorAction(dist.id);
      if (res.success) setData({ resumen: res.resumen, lotes: res.lotes, frentes: res.frentes });
      setLoading(false);
    }
    load();
  }, [dist.id]);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-admin-gold/20 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col h-full">
        {/* Header Drawer */}
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
              <p className="text-xs font-bold uppercase tracking-tighter">Consultando Bóveda...</p>
            </div>
          ) : data ? (
            <>
              {/* Resumen Multizona (Frentes) */}
              <section>
                 <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-3 bg-admin-blue rounded-full" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Inventario por Frente</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    {data.frentes.map((f, i) => (
                        <div key={i} className="bg-slate-950 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">📦</div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 truncate">{f.zona_nombre}</p>
                           <div className="flex justify-between items-end">
                              <p className="text-2xl font-black text-white">{f.total_asignado}</p>
                              <div className="text-right">
                                 <p className="text-[9px] font-bold text-green-400">Act: {f.total_activado}</p>
                                 <p className="text-[9px] font-bold text-slate-600">Disp: {f.total_asignado - f.total_activado}</p>
                              </div>
                           </div>
                        </div>
                    ))}
                    {data.frentes.length === 0 && <p className="col-span-2 text-center text-slate-600 text-[10px] py-4 uppercase">Sin stock activo por zona.</p>}
                 </div>
              </section>

              {/* Listado de Lotes (Rangos) con Zona */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historial de Despachos</h4>
                  <span className="text-[9px] font-bold text-admin-gold bg-admin-gold/10 px-2 py-0.5 rounded-full">Stock Total: {data.resumen.total_asignado}</span>
                </div>
                <div className="space-y-3">
                  {data.lotes.map((lote, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950 border border-white/5 hover:border-admin-blue/30 p-5 rounded-2xl transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="text-center">
                           <p className="text-[8px] font-bold text-slate-600 uppercase mb-1">Lot</p>
                           <p className="text-xs font-bold text-white">#{String(data.lotes.length - idx).padStart(3, '0')}</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white font-mono">{lote.rango_inicio} — {lote.rango_fin}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[9px] font-bold text-admin-blue uppercase">{lote.zona_nombre || 'Nacional'}</span>
                             <span className="w-1 h-1 bg-slate-700 rounded-full" />
                             <span className="text-[9px] text-slate-500 uppercase">{lote.cantidad} boletas</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] text-slate-500 font-bold mb-1">{new Date(lote.fecha_asignacion).toLocaleDateString()}</p>
                         <span className="text-[8px] font-bold text-white/40 border border-white/10 px-1.5 py-0.5 rounded uppercase">Verificado</span>
                      </div>
                    </div>
                  ))}
                  {data.lotes.length === 0 && <p className="text-center text-slate-600 text-xs py-10 italic">Sin lotes asignados aún.</p>}
                </div>
              </section>
            </>
          ) : (
            <p className="text-center text-red-400 py-20 font-bold">Error al cargar inventario.</p>
          )}
        </div>

        {/* Footer Drawer */}
        <div className="p-8 bg-slate-950/80 border-t border-white/5 flex gap-4">
           <button onClick={onClose} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all">
              Cerrar Expediente
           </button>
           <button className="flex-1 py-4 bg-admin-blue hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20">
              Imprimir Reporte
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
                        {p.rol === 'distribuidor' && (
                            <button 
                            onClick={() => onInspect(p)} 
                            className="w-10 h-10 flex items-center justify-center bg-admin-gold/10 hover:bg-admin-gold text-admin-gold hover:text-slate-900 rounded-xl transition-all border border-admin-gold/20 shadow-lg shadow-admin-gold/5"
                            title="Auditar Inventario"
                            >
                            🎫
                            </button>
                        )}
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
  operativos, distribuidores, zonas, catalogoZonas
}: {
  operativos: Perfil[];
  distribuidores: Perfil[];
  zonas: any[];
  catalogoZonas: any[];
}) {
  const [tab, setTab] = useState<'distribuidores' | 'operativos'>('distribuidores');
  const [inspecting, setInspecting] = useState<Perfil | null>(null);

  return (
    <div>
      {inspecting && <InventoryDrawer dist={inspecting} onClose={() => setInspecting(null)} />}
      
      <div className="flex gap-4 mb-8">
        {(['distribuidores', 'operativos'] as const).map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t)} 
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-3 ${
                tab === t 
                ? 'bg-admin-blue border-admin-blue text-white shadow-xl shadow-blue-500/20' 
                : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${tab === t ? 'bg-white animate-pulse' : 'bg-slate-700'}`} />
            {t === 'distribuidores' ? `Distribuidores (${distribuidores.length})` : `Operativos (${operativos.length})`}
          </button>
        ))}
      </div>

      <div className="bg-admin-card rounded-3xl border border-admin-border overflow-hidden shadow-2xl relative">
        <PersonalTable
            personas={tab === 'distribuidores' ? distribuidores : operativos}
            zonas={zonas}
            canDelete={true}
            onInspect={setInspecting}
        />
      </div>
    </div>
  );
}
