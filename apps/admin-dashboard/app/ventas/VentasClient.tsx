'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getPackDetail } from '../../lib/actions';
import { confirmarPagoAction, actualizarDatosPackAction } from '../activar/actions';

const LANDING_URL = 'https://landing-page.guillaumer-orion.workers.dev';
const ADMIN_URL = 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';

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

function estadoBoletaBadge(estado: number) {
  switch (estado) {
    case 0: return { label: 'Generado', cls: 'bg-slate-100/10 border-white/5 text-slate-400' };
    case 1: return { label: 'Activado', cls: 'bg-admin-blue/10 border-admin-blue/20 text-admin-blue' };
    case 2: return { label: 'Registrado', cls: 'bg-admin-green/10 border-admin-green/20 text-admin-green' };
    case 3: return { label: 'Anulado', cls: 'bg-red-500/10 border-red-500/20 text-red-500' };
    case 4: return { label: 'Sorteado', cls: 'bg-admin-gold/10 border-admin-gold/20 text-admin-gold' };
    default: return { label: '?', cls: 'bg-slate-100/10 border-white/5 text-slate-300' };
  }
}

function PackDetailDrawer({ packId, onClose }: { packId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{ pack: any; boletas: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTipoId, setEditTipoId] = useState('CC');
  const [editIdent, setEditIdent] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editWa, setEditWa] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [formInitialized, setFormInitialized] = useState(false);

  function reloadDetail() {
    setLoading(true);
    getPackDetail(packId)
      .then((d) => {
        setDetail(d);
        if (!formInitialized) {
          setEditNombre(d.pack.comerciante_nombre || '');
          setEditTipoId(d.pack.comerciante_tipo_id || 'CC');
          setEditIdent(d.pack.comerciante_identificacion || '');
          setEditTel(d.pack.comerciante_tel || '');
          setEditWa(d.pack.comerciante_whatsapp || '');
          setEditEmail(d.pack.comerciante_email || '');
          setFormInitialized(true);
        }
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { reloadDetail(); }, [packId]);

  async function handleConfirmarPago() {
    setConfirmando(true);
    setConfirmError(null);
    const res = await confirmarPagoAction(packId, {
      comerciante_nombre: editNombre,
      comerciante_tipo_id: editTipoId,
      comerciante_identificacion: editIdent,
      comerciante_tel: editTel,
      comerciante_whatsapp: editWa,
      comerciante_email: editEmail,
    });
    if (res.success) {
      setFormInitialized(false);
      reloadDetail();
    } else {
      setConfirmError(res.error);
    }
    setConfirmando(false);
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="fixed inset-0 z-[200] flex justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-400 font-bold mb-4">Error cargando detalle</p>
            <p className="text-slate-500 text-sm">{error}</p>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold">Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const p = detail.pack;
  const packUrl = `${LANDING_URL}/pack/${p.token_pagina}`;
  const qrDataUrl = `${ADMIN_URL}/validar-qr/${p.token_qr}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;
  const qrUsado = !!p.qr_usado_at;

  const waNumber = p.comerciante_whatsapp || p.comerciante_tel || '';
  const waQrText = encodeURIComponent(
    `Hola ${p.comerciante_nombre}, aquí está tu QR de beneficio recreativo para La Villa del Millón.\n\nPresenta este código en el evento: ${qrImageUrl}`
  );

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-950/50">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{p.comerciante_nombre}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-admin-gold font-bold uppercase tracking-widest">
                PACK-{String(p.numero_pack || '').padStart(3, '0')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* Datos del comerciante — siempre editable */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-admin-blue rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Comerciante <span className="text-admin-gold ml-1">(editable)</span>
              </h4>
            </div>
            {true ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre *</label>
                  <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tipo Doc</label>
                    <select value={editTipoId} onChange={(e) => setEditTipoId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue appearance-none">
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="NIT">NIT</option>
                      <option value="PP">PP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Identificación *</label>
                    <input value={editIdent} onChange={(e) => setEditIdent(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">WhatsApp *</label>
                    <input value={editWa} onChange={(e) => setEditWa(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Teléfono <span className="text-slate-600 normal-case">(opcional)</span></label>
                    <input value={editTel} onChange={(e) => setEditTel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Email</label>
                  <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-blue" />
                </div>
                {p.estado_pago !== 'pendiente' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await actualizarDatosPackAction(packId, {
                        comerciante_nombre: editNombre,
                        comerciante_tipo_id: editTipoId,
                        comerciante_identificacion: editIdent,
                        comerciante_tel: editTel,
                        comerciante_whatsapp: editWa,
                        comerciante_email: editEmail,
                      });
                      if (res.success) reloadDetail();
                    }}
                    className="w-full py-2.5 bg-admin-blue hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                  >
                    Guardar Cambios
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-600 uppercase font-bold">Identificación</p>
                  <p className="text-slate-300">{p.comerciante_tipo_id || 'CC'} {p.comerciante_identificacion || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase font-bold">Teléfono</p>
                  <p className="text-slate-300">{p.comerciante_tel || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase font-bold">WhatsApp</p>
                  <p className="text-slate-300">{p.comerciante_whatsapp || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-600 uppercase font-bold">Email</p>
                  <p className="text-slate-300">{p.comerciante_email || '—'}</p>
                </div>
              </div>
            )}
          </section>

          {/* Pago */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-admin-gold rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Pago</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Tipo</p>
                <p className={p.tipo_pago === 'inmediato' ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>
                  {p.tipo_pago === 'inmediato' ? '✅ Inmediato' : '⏳ Pendiente'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Estado</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${estadoPagoBadge(p.estado_pago)}`}>
                  {p.estado_pago}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Fecha venta</p>
                <p className="text-slate-300">{p.fecha_venta ? new Date(p.fecha_venta).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase font-bold">Vencimiento pago</p>
                <p className="text-slate-300">{p.fecha_vencimiento_pago ? new Date(p.fecha_vencimiento_pago).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
            </div>
          </section>

          {/* Link del comerciante */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-admin-blue rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Link del Comerciante</h4>
            </div>
            <div className="flex items-center gap-3 bg-slate-900 border border-white/5 rounded-xl p-3">
              <p className="flex-1 text-admin-blue font-mono text-[10px] truncate">{packUrl}</p>
              <button
                onClick={() => handleCopy(packUrl)}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex-shrink-0 ${
                  copied ? 'bg-green-500 text-white' : 'bg-admin-blue hover:bg-blue-600 text-white'
                }`}
              >
                {copied ? '✓' : 'Copiar'}
              </button>
            </div>
          </section>

          {/* QR de beneficio */}
          {p.tipo_pago === 'inmediato' && (
            <section className="bg-slate-950 border border-admin-gold/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-admin-gold rounded-full" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">QR de Beneficio</h4>
                {qrUsado ? (
                  <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
                    Canjeado {new Date(p.qr_usado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                ) : p.qr_valido_hasta ? (
                  <span className="ml-auto text-[10px] font-bold text-admin-gold bg-admin-gold/10 px-2 py-1 rounded-lg">
                    Válido hasta {new Date(p.qr_valido_hasta).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                ) : null}
              </div>

              {qrUsado ? (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-center">
                  <p className="text-red-400 text-sm font-bold">QR ya utilizado el {new Date(p.qr_usado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="bg-white p-2 rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImageUrl} alt="QR de beneficio" width={150} height={150} className="rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`https://wa.me/${waNumber}?text=${waQrText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-all text-[10px] uppercase tracking-widest active:scale-95"
                    >
                      📲 Reenviar WhatsApp
                    </a>
                    <button
                      onClick={() => handleCopy(qrImageUrl)}
                      className="flex items-center justify-center gap-2 py-3 bg-admin-blue hover:bg-blue-600 text-white font-black rounded-xl transition-all text-[10px] uppercase tracking-widest active:scale-95"
                    >
                      📋 Copiar URL QR
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* 25 números */}
          <section className="bg-slate-950 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-admin-green rounded-full" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Números del Pack</h4>
              <span className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                {detail.boletas.length} números
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {detail.boletas.map((b: any) => {
                const badge = estadoBoletaBadge(b.estado);
                return (
                  <div key={b.id_boleta} className="flex flex-col items-center gap-1">
                    <div className="w-full bg-slate-900 border border-white/5 rounded-lg p-2 text-center font-mono font-black text-white text-xs">
                      {String(b.id_boleta).padStart(6, '0')}
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Distribuidor */}
          {p.distribuidor?.nombre && (
            <section className="bg-slate-950 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-slate-500 rounded-full" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Distribuidor</h4>
              </div>
              <p className="text-slate-300 font-bold">{p.distribuidor.nombre}</p>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-slate-950/80 space-y-3">
          {p.estado_pago === 'pendiente' && (
            <>
              {confirmError && (
                <p className="text-red-400 text-xs font-bold text-center">{confirmError}</p>
              )}
              <button
                onClick={handleConfirmarPago}
                disabled={confirmando}
                className="w-full py-4 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-admin-gold/20 flex items-center justify-center gap-3"
              >
                {confirmando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    Generando números...
                  </>
                ) : (
                  'Confirmar Pago y Generar Pack'
                )}
              </button>
            </>
          )}
          <button onClick={onClose} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest border border-white/5">
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VentasClient({
  initialData,
  total,
  currentPage,
  query,
  totalPages,
  isDist,
}: {
  initialData: any[];
  total: number;
  currentPage: number;
  query: string;
  totalPages: number;
  isDist: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/ventas?query=${search}&page=1`);
  }

  return (
    <div className="space-y-6">
      {selectedPackId && (
        <PackDetailDrawer packId={selectedPackId} onClose={() => setSelectedPackId(null)} />
      )}

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
                <th className="p-4 font-bold">Pack</th>
                <th className="p-4 font-bold">Comerciante</th>
                {!isDist && <th className="p-4 font-bold">Distribuidor</th>}
                <th className="p-4 font-bold">Tipo Pago</th>
                <th className="p-4 font-bold">Estado Pago</th>
                <th className="p-4 font-bold">Fecha Venta</th>
                <th className="p-4 font-bold text-center"># Números</th>
                <th className="p-4 font-bold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={isDist ? 7 : 8} className="text-center py-20 text-slate-500 italic">
                    No se encontraron packs vendidos.
                  </td>
                </tr>
              ) : (
                initialData.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedPackId(p.id)}
                  >
                    <td className="p-4">
                      <span className="text-admin-gold font-black text-xs">PACK-{String(p.numero_pack || '').padStart(3, '0')}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{p.comerciante_nombre}</p>
                      {p.comerciante_tel && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {p.comerciante_tel}
                        </p>
                      )}
                    </td>
                    {!isDist && (
                      <td className="p-4 text-sm text-slate-300 font-bold uppercase">
                        {p.distribuidor?.nombre || '—'}
                      </td>
                    )}
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
                    <td className="p-4 text-center">
                      <span className="bg-slate-800 text-white font-mono font-bold text-xs px-3 py-1 rounded-lg">
                        {p.numeros_count}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="w-8 h-8 flex items-center justify-center bg-slate-800/50 hover:bg-admin-blue text-slate-500 hover:text-white rounded-lg transition-all border border-white/5 active:scale-90 ml-auto">
                        →
                      </button>
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
