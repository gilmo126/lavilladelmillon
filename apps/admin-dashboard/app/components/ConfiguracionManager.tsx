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
  const [formSesionTimeoutMin, setFormSesionTimeoutMin] = useState(30);
  const [formTiposEvento, setFormTiposEvento] = useState<string[]>([]);
  const [formEventoLogoUrl, setFormEventoLogoUrl] = useState<string | null>(null);
  const [formEventoTitulo, setFormEventoTitulo] = useState('');
  const [formEventoSubtitulo, setFormEventoSubtitulo] = useState('');
  const [formEventoMensaje, setFormEventoMensaje] = useState('');
  const [formEventoAuspiciantes, setFormEventoAuspiciantes] = useState<string[]>([]);
  const [uploadingEvento, setUploadingEvento] = useState(false);
  const [formJornadas, setFormJornadas] = useState<Array<{ id: string; fecha: string; hora: string; label: string }>>([]);
  const [formUbicacionEvento, setFormUbicacionEvento] = useState('');
  const [formUbicacionMapsUrl, setFormUbicacionMapsUrl] = useState('');
  const [formNequiLlave, setFormNequiLlave] = useState('');
  const [formMontoPack, setFormMontoPack] = useState(0);
  const [formInstruccionesPago, setFormInstruccionesPago] = useState('');

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
        setFormSesionTimeoutMin(data.sesion_timeout_minutos ?? 30);
        setFormTiposEvento(data.tipos_evento ?? ['Lanzamiento', 'Capacitación', 'Feria Comercial', 'Premiación', 'Networking']);
        setFormEventoLogoUrl(data.evento_logo_url || null);
        setFormEventoTitulo(data.evento_titulo || '¡Bienvenidos a La Villa del Millón!');
        setFormEventoSubtitulo(data.evento_subtitulo || 'El escenario donde tu esfuerzo encuentra su recompensa.');
        setFormEventoMensaje(data.evento_mensaje || '');
        setFormEventoAuspiciantes(data.evento_auspiciantes || ['KIA', 'YAMAHA', 'ODONTO PROTECT']);
        setFormJornadas(data.jornadas_evento || []);
        setFormUbicacionEvento(data.ubicacion_evento || '');
        setFormUbicacionMapsUrl(data.ubicacion_maps_url || '');
        setFormNequiLlave(data.nequi_llave || '');
        setFormMontoPack(data.monto_pack ?? 0);
        setFormInstruccionesPago(data.instrucciones_pago || '');
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
        sesion_timeout_minutos: formSesionTimeoutMin,
        tipos_evento: formTiposEvento,
        evento_logo_url: formEventoLogoUrl,
        evento_titulo: formEventoTitulo,
        evento_subtitulo: formEventoSubtitulo,
        evento_mensaje: formEventoMensaje,
        evento_auspiciantes: formEventoAuspiciantes,
        jornadas_evento: formJornadas,
        ubicacion_evento: formUbicacionEvento,
        ubicacion_maps_url: formUbicacionMapsUrl,
        nequi_llave: formNequiLlave.trim() || null,
        monto_pack: formMontoPack,
        instrucciones_pago: formInstruccionesPago.trim() || null,
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

                   <div className="bg-slate-900/50 rounded-xl border border-admin-border p-5 space-y-3">
                     <label className="block text-sm text-slate-400">Timeout de sesión por inactividad</label>
                     <div className="flex items-center gap-3">
                       <input
                         type="number"
                         min={5}
                         max={240}
                         value={formSesionTimeoutMin}
                         onChange={e => setFormSesionTimeoutMin(parseInt(e.target.value) || 30)}
                         className="w-20 bg-slate-900 border border-admin-border rounded-lg px-3 py-2 text-white text-center font-mono font-bold focus:border-admin-blue outline-none"
                       />
                       <span className="text-xs text-slate-500">minutos</span>
                     </div>
                     <p className="text-[10px] text-slate-600">Cierra la sesión automáticamente tras X minutos sin actividad. Aviso 60s antes.</p>
                   </div>
                 </div>
               </section>

               <section className="space-y-6">
                 <h3 className="text-xl font-bold text-white border-l-4 border-pink-500 pl-4">Pagos (Nequi)</h3>
                 <p className="text-[11px] text-slate-500">Estos datos se muestran al comerciante en el landing cuando su pack está pendiente de pago.</p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-slate-900/50 rounded-xl border border-admin-border p-5 space-y-3">
                     <label className="block text-sm text-slate-400">Llave Nequi para pagos</label>
                     <input
                       type="text"
                       value={formNequiLlave}
                       onChange={e => setFormNequiLlave(e.target.value)}
                       placeholder="Ej: 3001234567 o @lavilla"
                       className="w-full bg-slate-900 border border-admin-border rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:border-pink-500 outline-none"
                     />
                     <p className="text-[10px] text-slate-600">Número o alias que el comerciante usará para transferir.</p>
                   </div>

                   <div className="bg-slate-900/50 rounded-xl border border-admin-border p-5 space-y-3">
                     <label className="block text-sm text-slate-400">Monto del pack (COP)</label>
                     <div className="flex items-center gap-3">
                       <span className="text-pink-400 font-bold">$</span>
                       <input
                         type="number"
                         min={0}
                         step={1000}
                         value={formMontoPack}
                         onChange={e => setFormMontoPack(parseInt(e.target.value) || 0)}
                         placeholder="25000"
                         className="flex-1 bg-slate-900 border border-admin-border rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:border-pink-500 outline-none"
                       />
                     </div>
                     <p className="text-[10px] text-slate-600">Se muestra formateado al comerciante (ej: $25.000).</p>
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm text-slate-400 mb-1">Instrucciones de pago personalizadas</label>
                   <textarea
                     rows={4}
                     value={formInstruccionesPago}
                     onChange={e => setFormInstruccionesPago(e.target.value)}
                     placeholder="Opcional. Ej: Realiza la transferencia por Nequi y sube el comprobante. El pago se verifica en 24 horas hábiles."
                     className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-white focus:border-pink-500 outline-none text-sm leading-relaxed"
                   />
                   <p className="text-[10px] text-slate-600 mt-1">Texto libre multi-línea. Aparece arriba del botón de subir comprobante en el landing.</p>
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

               <section className="space-y-6">
                 <h3 className="text-xl font-bold text-white border-l-4 border-marca-gold pl-4">Contenido Landing Evento</h3>

                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Logo del Evento</label>
                     <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-admin-border">
                       <div className="w-16 h-16 rounded-lg border border-admin-border flex items-center justify-center bg-admin-dark overflow-hidden">
                         {formEventoLogoUrl ? (
                           <img src={formEventoLogoUrl} alt="Logo evento" className="w-full h-full object-contain p-1" />
                         ) : (
                           <span className="text-xl">🎪</span>
                         )}
                       </div>
                       <input type="file" accept="image/*" onChange={async (e) => {
                         if (!e.target.files?.[0]) return;
                         setUploadingEvento(true);
                         const fd = new FormData();
                         fd.append('file', e.target.files[0]);
                         const resp = await uploadPublicImagenAction(fd, 'eventos');
                         if (resp.success) setFormEventoLogoUrl(resp.url || null);
                         setUploadingEvento(false);
                       }} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-admin-gold/10 file:text-admin-gold hover:file:bg-admin-gold/20 cursor-pointer" />
                       {uploadingEvento && <span className="text-xs text-admin-gold animate-pulse">Subiendo...</span>}
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Título Principal</label>
                     <input value={formEventoTitulo} onChange={e => setFormEventoTitulo(e.target.value)}
                       className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-white focus:border-admin-gold outline-none" />
                   </div>

                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Subtítulo</label>
                     <input value={formEventoSubtitulo} onChange={e => setFormEventoSubtitulo(e.target.value)}
                       className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-white focus:border-admin-gold outline-none" />
                   </div>

                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Mensaje de Bienvenida (texto completo)</label>
                     <textarea rows={8} value={formEventoMensaje} onChange={e => setFormEventoMensaje(e.target.value)}
                       placeholder="Escribe aquí el mensaje completo que verá el comerciante al abrir la invitación..."
                       className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-white focus:border-admin-gold outline-none text-sm leading-relaxed" />
                     <p className="text-[10px] text-slate-600 mt-1">Los nombres de auspiciantes se resaltarán automáticamente en dorado.</p>
                   </div>

                   <div>
                     <label className="block text-sm text-slate-400 mb-2">Auspiciantes (se resaltan en dorado)</label>
                     <div className="space-y-2">
                       {formEventoAuspiciantes.map((a, idx) => (
                         <div key={idx} className="flex items-center gap-2">
                           <input value={a} onChange={(e) => {
                             const updated = [...formEventoAuspiciantes];
                             updated[idx] = e.target.value;
                             setFormEventoAuspiciantes(updated);
                           }} className="flex-1 bg-slate-900 border border-admin-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-admin-gold" />
                           <button type="button" onClick={() => setFormEventoAuspiciantes(formEventoAuspiciantes.filter((_, i) => i !== idx))}
                             className="text-red-400 hover:text-red-300 text-sm font-bold px-2">✕</button>
                         </div>
                       ))}
                       <button type="button" onClick={() => setFormEventoAuspiciantes([...formEventoAuspiciantes, ''])}
                         className="text-admin-gold hover:text-yellow-300 text-xs font-bold uppercase tracking-widest">+ Agregar auspiciante</button>
                     </div>
                   </div>
                 </div>
               </section>

               <section className="space-y-6">
                 <h3 className="text-xl font-bold text-white border-l-4 border-emerald-500 pl-4">Jornadas y Ubicación del Evento</h3>

                 <div>
                   <label className="block text-sm text-slate-400 mb-2">Jornadas del evento (el comerciante elige a cuáles asistir)</label>
                   <div className="space-y-3">
                     {formJornadas.map((j, idx) => (
                       <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1.5fr_auto] gap-2 items-center bg-slate-900/50 border border-admin-border rounded-lg p-3">
                         <input
                           placeholder="id (ej: sabado_manana)"
                           value={j.id}
                           onChange={e => {
                             const updated = [...formJornadas];
                             updated[idx] = { ...updated[idx], id: e.target.value };
                             setFormJornadas(updated);
                           }}
                           className="bg-slate-900 border border-admin-border rounded px-2 py-2 text-white text-xs font-mono outline-none focus:border-emerald-500"
                         />
                         <input
                           placeholder="Fecha"
                           value={j.fecha}
                           onChange={e => {
                             const updated = [...formJornadas];
                             updated[idx] = { ...updated[idx], fecha: e.target.value };
                             setFormJornadas(updated);
                           }}
                           className="bg-slate-900 border border-admin-border rounded px-2 py-2 text-white text-xs outline-none focus:border-emerald-500"
                         />
                         <input
                           placeholder="Hora"
                           value={j.hora}
                           onChange={e => {
                             const updated = [...formJornadas];
                             updated[idx] = { ...updated[idx], hora: e.target.value };
                             setFormJornadas(updated);
                           }}
                           className="bg-slate-900 border border-admin-border rounded px-2 py-2 text-white text-xs outline-none focus:border-emerald-500"
                         />
                         <input
                           placeholder="Label visible"
                           value={j.label}
                           onChange={e => {
                             const updated = [...formJornadas];
                             updated[idx] = { ...updated[idx], label: e.target.value };
                             setFormJornadas(updated);
                           }}
                           className="bg-slate-900 border border-admin-border rounded px-2 py-2 text-white text-xs outline-none focus:border-emerald-500"
                         />
                         <button
                           type="button"
                           onClick={() => setFormJornadas(formJornadas.filter((_, i) => i !== idx))}
                           className="text-red-400 hover:text-red-300 text-sm font-bold px-2"
                         >
                           ✕
                         </button>
                       </div>
                     ))}
                     <button
                       type="button"
                       onClick={() => setFormJornadas([...formJornadas, { id: '', fecha: '', hora: '', label: '' }])}
                       className="text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase tracking-widest"
                     >
                       + Agregar jornada
                     </button>
                   </div>
                   <p className="text-[10px] text-slate-600 mt-2">El <code>id</code> debe ser único (slug en minúsculas, sin espacios). El <code>label</code> se muestra al comerciante.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Nombre de la ubicación</label>
                     <input
                       value={formUbicacionEvento}
                       onChange={e => setFormUbicacionEvento(e.target.value)}
                       placeholder="Ej: Finca El Samán De Mi Familia V180C"
                       className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-white focus:border-emerald-500 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-sm text-slate-400 mb-1">URL de Google Maps</label>
                     <input
                       type="url"
                       value={formUbicacionMapsUrl}
                       onChange={e => setFormUbicacionMapsUrl(e.target.value)}
                       placeholder="https://share.google/..."
                       className="w-full bg-slate-900 border border-admin-border rounded-md px-4 py-3 text-white focus:border-emerald-500 outline-none font-mono text-xs"
                     />
                   </div>
                 </div>
               </section>

               <div className="pt-6 border-t border-admin-border flex justify-end">
                  <button type="submit" disabled={saving || uploading || uploadingEvento} className="bg-admin-gold text-admin-dark font-bold px-10 py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:scale-105 transition-all disabled:opacity-50">
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
