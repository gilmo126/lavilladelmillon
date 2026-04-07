'use client';

import { useState } from 'react';
import { updatePerfilAction } from '../distribuidores/actions';

type Dist = {
  id: string; nombre: string; cedula?: string;
  movil?: string; direccion?: string; zonas?: { nombre: string };
};

function EditInline({ dist, onDone }: { dist: Dist; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set('target_id', dist.id);
    const resp = await updatePerfilAction(fd);
    setLoading(false);
    if (resp.success) { setMsg('✅ Guardado'); setTimeout(onDone, 1200); }
    else setMsg(`❌ ${resp.error}`);
  }

  return (
    <div className="bg-slate-800/60 rounded-xl p-4 mt-2 border border-slate-700">
      {msg && <p className={`text-xs mb-3 font-medium ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <input name="movil" defaultValue={dist.movil || ''} placeholder="Celular" className="col-span-2 md:col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
        <input name="direccion" defaultValue={dist.direccion || ''} placeholder="Dirección" className="col-span-2 md:col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
        <div className="col-span-2 flex gap-2 justify-end">
          <button type="button" onClick={onDone} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:border-slate-500">Cancelar</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-admin-blue text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function MisDistribuidoresClient({ distribuidores }: { distribuidores: Dist[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  if (distribuidores.length === 0) {
    return (
      <div className="bg-admin-card rounded-2xl border border-admin-border p-12 text-center text-slate-500">
        <p className="text-4xl mb-3">📭</p>
        <p>No hay distribuidores registrados en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {distribuidores.map(d => (
        <div key={d.id} className="bg-admin-card rounded-2xl border border-admin-border p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-white">{d.nombre}</p>
              {d.cedula && <p className="text-xs text-slate-400 font-mono">CC: {d.cedula}</p>}
            </div>
            <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
              {d.zonas?.nombre || '—'}
            </span>
          </div>
          <div className="space-y-1 text-sm text-slate-400 mb-4">
            <p>📱 {d.movil || 'Sin móvil'}</p>
            <p>📍 {d.direccion || 'Sin dirección'}</p>
          </div>

          {editing === d.id ? (
            <EditInline dist={d} onDone={() => setEditing(null)} />
          ) : (
            <button
              onClick={() => setEditing(d.id)}
              className="w-full py-2 text-sm font-bold text-admin-blue border border-admin-blue/20 rounded-lg hover:bg-admin-blue/10 transition-colors"
            >
              Editar Contacto
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
