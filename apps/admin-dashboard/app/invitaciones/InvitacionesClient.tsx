'use client';

import { useState } from 'react';
import { crearInvitacionAction, getInvitacionesAction, reenviarInvitacionAction, type InvitacionItem } from './actions';

const LANDING_URL = 'https://landing-page.guillaumer-orion.workers.dev';

function estadoBadge(estado: string) {
  switch (estado) {
    case 'aceptada': return 'bg-green-500/10 border-green-500/20 text-green-400';
    case 'rechazada': return 'bg-red-500/10 border-red-500/20 text-red-400';
    default: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
  }
}

export default function InvitacionesClient({
  initialData,
  tiposEvento,
  isDist,
  userId,
}: {
  initialData: InvitacionItem[];
  tiposEvento: string[];
  isDist: boolean;
  userId: string;
}) {
  const [tab, setTab] = useState<'todas' | 'aceptada' | 'pendiente'>('todas');
  const [data, setData] = useState<InvitacionItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);

  async function handleTabChange(t: 'todas' | 'aceptada' | 'pendiente') {
    setTab(t);
    setLoading(true);
    const res = await getInvitacionesAction(t, isDist ? userId : undefined);
    setData(res);
    setLoading(false);
  }

  async function handleCrear(formData: FormData) {
    setFormLoading(true);
    setFormMsg(null);
    const res = await crearInvitacionAction(formData);
    if (res.success) {
      setFormMsg({ type: 'success', text: `Invitación enviada a ${res.comercianteNombre}` });
      (document.getElementById('invForm') as HTMLFormElement)?.reset();
      const updated = await getInvitacionesAction(tab, isDist ? userId : undefined);
      setData(updated);
    } else {
      setFormMsg({ type: 'error', text: res.error });
    }
    setFormLoading(false);
  }

  async function handleReenviar(id: string) {
    setReenviando(id);
    await reenviarInvitacionAction(id);
    const updated = await getInvitacionesAction(tab, isDist ? userId : undefined);
    setData(updated);
    setReenviando(null);
  }

  const filtered = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Lista */}
      <div className="lg:col-span-2 space-y-4">
        {/* Tabs */}
        <div className="flex border border-admin-border rounded-2xl overflow-hidden">
          {[
            { id: 'todas' as const, label: 'Todas' },
            { id: 'aceptada' as const, label: 'Aceptadas' },
            { id: 'pendiente' as const, label: 'Pendientes' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t.id
                  ? 'bg-admin-gold text-slate-900'
                  : 'bg-slate-900 text-slate-500 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-admin-card rounded-2xl border border-admin-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">Sin invitaciones en esta categoría.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-admin-border text-xs uppercase text-slate-500 bg-slate-900/50">
                    <th className="p-4 font-bold">Comerciante</th>
                    <th className="p-4 font-bold">Evento</th>
                    {!isDist && <th className="p-4 font-bold">Distribuidor</th>}
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Estado</th>
                    <th className="p-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white text-sm">{inv.comerciante_nombre}</p>
                        {inv.comerciante_tel && <p className="text-[10px] text-slate-500 mt-0.5">{inv.comerciante_tel}</p>}
                      </td>
                      <td className="p-4 text-sm text-slate-300">{inv.tipo_evento}</td>
                      {!isDist && (
                        <td className="p-4 text-sm text-slate-400 font-bold uppercase">{inv.distribuidor?.nombre || '—'}</td>
                      )}
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(inv.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${estadoBadge(inv.estado)}`}>
                          {inv.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Hola ${inv.comerciante_nombre}, estás invitado(a) a ${inv.tipo_evento} de La Villa del Millón. Confirma aquí: ${LANDING_URL}/invitacion/${inv.token}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 text-xs font-bold"
                        >
                          WhatsApp
                        </a>
                        {inv.estado !== 'aceptada' && (
                          <button
                            onClick={() => handleReenviar(inv.id)}
                            disabled={reenviando === inv.id}
                            className="text-admin-blue hover:text-blue-300 text-xs font-bold disabled:opacity-50"
                          >
                            {reenviando === inv.id ? '...' : 'Reenviar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Formulario */}
      <div className="lg:col-span-1">
        <div className="bg-admin-card rounded-2xl border border-admin-border p-6 sticky top-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-admin-gold/10 flex items-center justify-center border border-admin-gold/20 text-xl">🎪</div>
            <h2 className="text-lg font-bold text-white">Nueva Invitación</h2>
          </div>

          {formMsg && (
            <div className={`p-3 rounded-lg mb-4 text-sm font-bold ${formMsg.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {formMsg.text}
            </div>
          )}

          <form id="invForm" action={handleCrear} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo de Evento *</label>
              <select name="tipo_evento" required defaultValue="" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-gold appearance-none">
                <option value="" disabled>-- Selecciona --</option>
                {tiposEvento.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre Comerciante *</label>
              <input name="comerciante_nombre" required placeholder="Ej: Tienda El Progreso" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Dirección</label>
              <input name="comerciante_direccion" placeholder="Cra 10 #20-30" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Teléfono</label>
                <input name="comerciante_tel" placeholder="3001234567" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">WhatsApp</label>
                <input name="comerciante_whatsapp" placeholder="3001234567" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email</label>
              <input name="comerciante_email" type="email" placeholder="comercio@ejemplo.com" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
            </div>
            <button type="submit" disabled={formLoading} className="w-full py-3 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-xl transition-all text-sm uppercase tracking-widest">
              {formLoading ? 'Enviando...' : 'Enviar Invitación'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
