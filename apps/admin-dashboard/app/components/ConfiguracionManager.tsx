'use client';

import React, { useState, useEffect } from 'react';
import { getConfiguracion, updateConfiguracion, uploadPublicImagenAction } from '../../lib/actions';
import { supabase } from '../../lib/supabaseClient';

export default function ConfiguracionManager() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form States
  const [formNombre, setFormNombre] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSlogan, setFormSlogan] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState<string | null>(null);
  const [formActiva, setFormActiva] = useState(false);
  const [formDiasVencPago, setFormDiasVencPago] = useState(8);
  const [formDiasValidezQr, setFormDiasValidezQr] = useState(8);
  const [formDiasValidezPagina, setFormDiasValidezPagina] = useState(30);
  const [formTiposEvento, setFormTiposEvento] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getConfiguracion();
      if (data) {
        setConfig(data);
        setFormNombre(data.nombre_campana);
        setFormSlug(data.landing_slug);
        setFormSlogan(data.slogan_principal || '');
        setFormLogoUrl(data.logo_url || null);
        setFormActiva(data.activa);
        setFormDiasVencPago(data.dias_vencimiento_pago ?? 8);
        setFormDiasValidezQr(data.dias_validez_qr ?? 8);
        setFormDiasValidezPagina(data.dias_validez_pagina_comerciante ?? 30);
        setFormTiposEvento(data.tipos_evento ?? ['Lanzamiento', 'Capacitación', 'Feria Comercial', 'Premiación', 'Networking']);
      }
    } catch (e) {
      console.error(e);
      alert('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Validación de Tamaño (2MB para logos)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('⚠️ El logo es muy pesado. Por favor sube uno de menos de 2MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await uploadPublicImagenAction(formData, 'brand');

      if (!resp.success) throw new Error(resp.error);

      setFormLogoUrl(resp.url || null);
    } catch (err: any) {
      alert('Error subiendo logo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await updateConfiguracion(config.id, {
        nombre_campana: formNombre,
        landing_slug: formSlug,
        activa: formActiva,
        slogan_principal: formSlogan,
        logo_url: formLogoUrl,
        dias_vencimiento_pago: formDiasVencPago,
        dias_validez_qr: formDiasValidezQr,
        dias_validez_pagina_comerciante: formDiasValidezPagina,
        tipos_evento: formTiposEvento,
      });
      alert('Configuración guardada exitosamente.');
      loadData();
    } catch (err: any) {
      alert('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-admin-dark p-6 md:p-10 w-full overflow-y-auto">
      <header className="flex justify-between items-end mb-10 shrink-0">
        <div>
          <h2 className="text-3xl font-bold">Llaves Maestras (Branding)</h2>
          <p className="text-slate-400 mt-1">Controla la identidad visual y el pulso de la operación.</p>
        </div>
      </header>

      {loading ? (
        <p className="text-admin-gold animate-pulse">Consultando oráculo de configuración...</p>
      ) : config ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
          {/* Formulario de Configuración */}
          <div className="table-glass rounded-xl border border-admin-gold/30 p-8 shadow-2xl space-y-8 animate-in slide-in-from-left duration-500">
             <form onSubmit={handleSave} className="space-y-8">
               
               <section className="space-y-6">
                 <h3 className="text-xl font-bold text-white border-l-4 border-admin-gold pl-4">Identidad Visual</h3>
                 
                 <div className="space-y-4">
                   <label className="block text-sm text-slate-400">Logotipo de Campaña</label>
                   <div className="flex items-center gap-6 p-4 bg-slate-900/50 rounded-xl border border-admin-border">
                     <div className="w-20 h-20 rounded-lg border border-admin-border flex items-center justify-center bg-admin-dark overflow-hidden relative group">
                        {formLogoUrl ? (
                          <img src={formLogoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="text-2xl">🏛️</span>
                        )}
                        {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px]">Cargando...</div>}
                     </div>
                     <div className="flex-1 space-y-2">
                       <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-admin-gold/10 file:text-admin-gold hover:file:bg-admin-gold/20 cursor-pointer" />
                       <p className="text-[10px] text-slate-500">PNG transparente recomendado. Máx 2MB.</p>
                     </div>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Nombre Oficial</label>
                     <input required type="text" value={formNombre} onChange={e=>setFormNombre(e.target.value)} className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-lg font-medium text-white focus:border-admin-gold outline-none" />
                   </div>
                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Landing Slug</label>
                     <input required type="text" value={formSlug} onChange={e=>setFormSlug(e.target.value)} className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 font-mono text-admin-blue focus:border-admin-gold outline-none" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm text-slate-400 mb-1">Slogan o Bajada Legal de Bienvenida</label>
                   <textarea 
                    rows={3} 
                    value={formSlogan} 
                    onChange={e=>setFormSlogan(e.target.value)} 
                    className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-white focus:border-admin-gold outline-none" 
                    placeholder="Ej: Registra tus datos para participar oficialmente..."
                   />
                 </div>
               </section>

               <section className="space-y-6">
                 <h3 className="text-xl font-bold text-white border-l-4 border-admin-green pl-4">Estado de Operación</h3>
                 <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-admin-border">
                    <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${formActiva ? 'bg-admin-green' : 'bg-slate-600'}`} onClick={() => setFormActiva(!formActiva)}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formActiva ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                    <div>
                      <p className="font-bold text-white">{formActiva ? 'EN VIVO - Recibiendo Registros' : 'PAUSADA - Landing Oculta'}</p>
                      <p className="text-xs text-slate-400">Controla la visibilidad pública de la pasarela de participación.</p>
                    </div>
                 </div>
               </section>

               <section className="space-y-6">
                 <h3 className="text-xl font-bold text-white border-l-4 border-admin-blue pl-4">Plazos y Vencimientos</h3>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-slate-900/50 rounded-xl border border-admin-border p-5 space-y-3">
                     <label className="block text-sm text-slate-400">Validez página del comerciante</label>
                     <div className="flex items-center gap-3">
                       <input
                         type="number"
                         min={1}
                         max={365}
                         value={formDiasValidezPagina}
                         onChange={e => setFormDiasValidezPagina(parseInt(e.target.value) || 30)}
                         className="w-20 bg-slate-900 border border-admin-border rounded-lg px-3 py-2 text-white text-center font-mono font-bold focus:border-admin-blue outline-none"
                       />
                       <span className="text-xs text-slate-500">días</span>
                     </div>
                     <p className="text-[10px] text-slate-600">Tiempo que el comerciante puede ver y compartir sus números desde /pack/[token]</p>
                   </div>

                   <div className="bg-slate-900/50 rounded-xl border border-admin-border p-5 space-y-3">
                     <label className="block text-sm text-slate-400">Validez QR de beneficio</label>
                     <div className="flex items-center gap-3">
                       <input
                         type="number"
                         min={1}
                         max={365}
                         value={formDiasValidezQr}
                         onChange={e => setFormDiasValidezQr(parseInt(e.target.value) || 8)}
                         className="w-20 bg-slate-900 border border-admin-border rounded-lg px-3 py-2 text-white text-center font-mono font-bold focus:border-admin-blue outline-none"
                       />
                       <span className="text-xs text-slate-500">días</span>
                     </div>
                     <p className="text-[10px] text-slate-600">Duración del QR para invitación al evento recreativo</p>
                   </div>

                   <div className="bg-slate-900/50 rounded-xl border border-admin-border p-5 space-y-3">
                     <label className="block text-sm text-slate-400">Plazo de pago pendiente</label>
                     <div className="flex items-center gap-3">
                       <input
                         type="number"
                         min={1}
                         max={365}
                         value={formDiasVencPago}
                         onChange={e => setFormDiasVencPago(parseInt(e.target.value) || 8)}
                         className="w-20 bg-slate-900 border border-admin-border rounded-lg px-3 py-2 text-white text-center font-mono font-bold focus:border-admin-blue outline-none"
                       />
                       <span className="text-xs text-slate-500">días</span>
                     </div>
                     <p className="text-[10px] text-slate-600">Tiempo límite para que el comerciante pague un pack pendiente</p>
                   </div>
                 </div>
               </section>

               <section className="space-y-6">
                 <h3 className="text-xl font-bold text-white border-l-4 border-purple-500 pl-4">Tipos de Evento</h3>
                 <div className="space-y-2">
                   {formTiposEvento.map((tipo, idx) => (
                     <div key={idx} className="flex items-center gap-2">
                       <input
                         value={tipo}
                         onChange={(e) => {
                           const updated = [...formTiposEvento];
                           updated[idx] = e.target.value;
                           setFormTiposEvento(updated);
                         }}
                         className="flex-1 bg-slate-900 border border-admin-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
                       />
                       <button
                         type="button"
                         onClick={() => setFormTiposEvento(formTiposEvento.filter((_, i) => i !== idx))}
                         className="text-red-400 hover:text-red-300 text-sm font-bold px-2"
                       >
                         ✕
                       </button>
                     </div>
                   ))}
                   <button
                     type="button"
                     onClick={() => setFormTiposEvento([...formTiposEvento, ''])}
                     className="text-purple-400 hover:text-purple-300 text-xs font-bold uppercase tracking-widest"
                   >
                     + Agregar tipo de evento
                   </button>
                 </div>
               </section>

               <div className="pt-6 border-t border-admin-border flex justify-end">
                  <button type="submit" disabled={saving || uploading} className="bg-admin-gold text-admin-dark font-bold px-10 py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:scale-105 transition-all disabled:opacity-50">
                    {saving ? 'Guardando Cambios...' : 'Guardar Configuración Maestra'}
                  </button>
               </div>
             </form>
          </div>

          {/* VISTA PREVIA EN TIEMPO REAL */}
          <div className="sticky top-10 space-y-6 animate-in slide-in-from-right duration-700">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-gold/60 items-center flex gap-2">
              <span className="w-2 h-2 rounded-full bg-admin-gold animate-ping" />
              Vista Previa en Tiempo Real (Landing)
            </h3>
            
            <div className="bg-admin-darker border border-admin-gold/20 rounded-3xl overflow-hidden shadow-2xl">
              {/* Simulación Header Landing */}
              <div className="p-8 space-y-6 text-center">
                <div className="flex justify-center mb-6">
                  {formLogoUrl ? (
                    <img src={formLogoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                  ) : (
                    <h2 className="text-2xl font-black text-white">{formNombre || 'LA VILLA'}</h2>
                  )}
                </div>
                
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-admin-gold leading-tight">
                  {formNombre}
                </h1>
                
                <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed italic">
                  "{formSlogan || 'Escribe un slogan para verlo aquí'}"
                </p>

                <div className="w-full h-40 bg-slate-900/50 rounded-2xl border border-dashed border-admin-border flex items-center justify-center text-admin-border text-xs">
                  Área del Formulario de Registro
                </div>
              </div>
              <div className="bg-admin-gold/10 p-3 text-center text-[10px] text-admin-gold font-bold uppercase tracking-widest border-t border-admin-gold/10">
                Reserva de Diseño Premium 2026
              </div>
            </div>
            
            <div className="bg-admin-blue/10 border border-admin-blue/20 p-4 rounded-xl text-[11px] text-admin-blue leading-relaxed">
              <p><strong>💡 Nota del Sistema:</strong> Los cambios realizados aquí se reflejarán instantáneamente en la Landing Page una vez que presiones "Guardar". Los logos se sirven desde el bucket optimizado.</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-red-400 bg-red-900/10 p-6 rounded-xl border border-red-500/20">
          ⚠️ <strong>Error de Integridad:</strong> No se encontró la fila maestra de configuración en la base de datos. Verifica el seed inicial de Supabase.
        </p>
      )}
    </div>
  );
}
