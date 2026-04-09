'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LandingPage() {
  // Form Basic States
  const [tokenIntegridad, setTokenIntegridad] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [premioSel, setPremioSel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // App Context States (Branding Dinámico)
  const [campana, setCampana] = useState("Cargando Campaña...");
  const [slogan, setSlogan] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [premiosDisponibles, setPremiosDisponibles] = useState<any[]>([]);
  const [territorios, setTerritorios] = useState<any[]>([]);
  const [errorMSG, setErrorMSG] = useState('');
  const [successMSG, setSuccessMSG] = useState('');

  // Legal & Modal States
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Geography States
  const [ubicacionBusqueda, setUbicacionBusqueda] = useState('');
  const [territorioSel, setTerritorioSel] = useState<any>(null);
  const [otroBarrio, setOtroBarrio] = useState('');
  const [showUbicaciones, setShowUbicaciones] = useState(false);

  // Visualization States
  const [fechaSorteoVisual, setFechaSorteoVisual] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data: config, error } = await supabase.from('configuracion_campana').select('*').single();
        if (error) throw error;
        
        if (config) {
          setCampana(config.nombre_campana);
          setSlogan(config.slogan_principal || '');
          setLogoUrl(config.logo_url || null);
          
          // Traer premios
          const { data: premios } = await supabase
            .from('premios')
            .select('*, sorteos(fecha_sorteo, estado)')
            .eq('campana_id', config.id);

          if (premios) {
             const now = new Date();
             const filtrados = premios.filter(p => {
               if (!p.sorteos || p.sorteos.length === 0) return false;
               const sorteo = p.sorteos[0];
               return sorteo.estado === 'programado' && new Date(sorteo.fecha_sorteo) >= now;
             });
             setPremiosDisponibles(filtrados);
          }

          // Traer territorios oficiales
          const { data: terrs } = await supabase.from('territorios').select('*').order('nombre');
          if (terrs) setTerritorios(terrs);
        }
      } catch (e) {
        setCampana("La Villa del Millón"); 
      }
    };
    fetchConfig();
  }, []);

  // Filtrado de Autocomplete
  const territoriosFiltrados = territorios.filter(t => 
    t.nombre.toLowerCase().includes(ubicacionBusqueda.toLowerCase())
  ).slice(0, 5);

  // Efecto para actualizar la fecha visual cuando cambia el premio
  useEffect(() => {
    if (premioSel) {
      const premio = premiosDisponibles.find(p => p.id === premioSel);
      if (premio && premio.sorteos && premio.sorteos[0]) {
        const fecha = new Date(premio.sorteos[0].fecha_sorteo);
        const formateada = new Intl.DateTimeFormat('es-CO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(fecha);
        setFechaSorteoVisual(formateada);
      }
    } else {
      setFechaSorteoVisual(null);
    }
  }, [premioSel, premiosDisponibles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!territorioSel) {
      setErrorMSG("Por favor selecciona un barrio o corregimiento de la lista oficial.");
      return;
    }

    if (territorioSel.nombre === 'OTRO' && !otroBarrio.trim()) {
      setErrorMSG("Por favor escribe el nombre de tu sector manualmente.");
      return;
    }

    setIsSubmitting(true);
    setErrorMSG('');
    setSuccessMSG('');

    try {
      const { data, error } = await supabase.functions.invoke('registrar-boleta', {
        body: {
          token: tokenIntegridad,
          identificacion,
          nombre,
          celular,
          premioId: premioSel,
          aceptaTerminos: aceptaTerminos,
          territorioId: territorioSel.id,
          ubicacionManual: territorioSel.nombre === 'OTRO' ? otroBarrio : null
        }
      });

      if (error || (data && data.error)) {
        throw new Error((data && data.error) || error.message);
      }

      setSuccessMSG("¡Registrada con éxito! Prepárate para ganar.");
      setTokenIntegridad('');
      setIdentificacion('');
      setNombre('');
      setCelular('');
      setPremioSel('');
      setTerritorioSel(null);
      setOtroBarrio('');
      setUbicacionBusqueda('');
      setAceptaTerminos(false);
    } catch (err: any) {
      setErrorMSG(err.message || 'La boleta proporcionada fue rechazada por seguridad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-marca-darker text-white relative overflow-hidden">
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-marca-gold/10 to-transparent pointer-events-none" />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-6 md:gap-10">
        
        {/* Encabezado Dinámico (Branding) */}
        <header className="flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-1000">
          {logoUrl ? (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-marca-gold/20 to-marca-gold/0 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000"></div>
              <img src={logoUrl} alt={campana} className="relative h-20 md:h-[120px] w-auto object-contain drop-shadow-2xl" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-marca-gold to-marca-goldLight flex items-center justify-center text-marca-darker text-4xl font-black shadow-2xl shadow-marca-gold/20">
              {campana.charAt(0)}
            </div>
          )}
          
          <div className="text-center space-y-2">
            <h2 className="text-marca-gold font-black tracking-[0.4em] uppercase text-[10px] md:text-xs animate-pulse">Palmira 2026</h2>
            <h1 className="text-2xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-marca-goldLight drop-shadow-2xl px-4 text-balance">
              {campana}
            </h1>
            <p className="text-gray-400/80 max-w-md mx-auto text-sm leading-relaxed italic border-t border-white/10 pt-4 px-4">
              {slogan || "Blindaje Legal y Transparencia: Registra tus datos para participar oficialmente."}
            </p>
          </div>
        </header>

        {/* Sección: Grandes Sorteos (Galería Aspiracional) */}
        <div className="w-full space-y-10">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-3">
              <span className="w-1.5 h-6 bg-marca-gold rounded-full" />
              Próximos Grandes Sorteos
            </h3>
            <span className="text-[10px] text-marca-gold font-black uppercase tracking-widest bg-marca-gold/10 px-3 py-1.5 rounded-full border border-marca-gold/20">
              VITRINA DE PREMIOS
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {premiosDisponibles.map((p) => {
              const textPlaceholder = encodeURIComponent(p.nombre_premio || 'Premio');
              const placeholder = `https://via.placeholder.com/600x800/1E293B/F59E0B?text=${textPlaceholder}`;
              const fechaStr = p.sorteos?.[0]?.fecha_sorteo;
              const fSorteo = fechaStr ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(fechaStr)) : 'Pronto';

              return (
                <div key={p.id} className="group relative bg-[#111] rounded-3xl overflow-hidden border border-white/5 hover:border-marca-gold/40 transition-all duration-700 hover:shadow-2xl hover:shadow-marca-gold/10 hover:-translate-y-2 flex flex-col h-full shrink-0">
                  <div className="h-64 md:h-72 w-full overflow-hidden shrink-0 relative">
                    <img 
                      src={p.imagen_url || placeholder} 
                      alt={p.nombre_premio} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-marca-gold/30 shadow-xl">
                      <p className="text-[10px] font-black text-marca-gold uppercase tracking-widest">SORTEA: {fSorteo.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-3 flex flex-col flex-1 bg-gradient-to-b from-[#111] to-black">
                    <h4 className="text-sm font-black text-white group-hover:text-marca-gold transition-colors leading-tight">{p.nombre_premio}</h4>
                    <p className="text-xs text-gray-500 line-clamp-4 flex-1 leading-relaxed font-medium">
                      {p.descripcion}
                    </p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-marca-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección Formulario */}
        <div className="w-full max-w-2xl space-y-8 flex flex-col items-center mt-4">
          <div className="w-full glass-panel rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-marca-gold/20 via-marca-gold to-marca-gold/20" />

            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Registro Oficial de Participante</h3>
              <p className="text-gray-500 text-sm">Completa los datos de tu boleta física para habilitar tu número.</p>
            </div>

            {errorMSG && <div className="mb-8 p-4 rounded-xl bg-red-900/30 border border-red-500/30 text-red-200 text-sm text-center animate-in slide-in-from-top duration-300">{errorMSG}</div>}
            {successMSG && <div className="mb-8 p-4 rounded-xl bg-green-900/30 border border-green-500/30 text-green-200 text-sm text-center animate-in slide-in-from-top duration-300">{successMSG}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-3">
                <label htmlFor="token" className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Número de Boleta</label>
                <input
                  id="token"
                  type="text"
                  placeholder="Ej: 000001"
                  required
                  value={tokenIntegridad}
                  onChange={(e) => setTokenIntegridad(e.target.value)}
                  className="w-full bg-marca-dark/50 border border-gray-700/50 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-marca-gold uppercase font-mono transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label htmlFor="identificacion" className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Cédula</label>
                  <input
                    id="identificacion"
                    type="text"
                    required
                    value={identificacion}
                    onChange={(e) => setIdentificacion(e.target.value)}
                    className="w-full bg-marca-dark/50 border border-gray-700/50 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-marca-gold transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label htmlFor="celular" className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Celular</label>
                  <input
                    id="celular"
                    type="tel"
                    required
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    className="w-full bg-marca-dark/50 border border-gray-700/50 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-marca-gold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="nombre" className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-marca-dark/50 border border-gray-700/50 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-marca-gold transition-all"
                />
              </div>

              {/* Selector de Ubicación (Autocomplete) */}
              <div className="space-y-4">
                <div className="space-y-3 relative">
                  <label htmlFor="ubicacion" className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Barrio / Sector de Residencia</label>
                  <input
                    id="ubicacion"
                    type="text"
                    placeholder="Escribe tu barrio (Rozo, Zamorano...)"
                    required={!territorioSel}
                    value={territorioSel ? territorioSel.nombre : ubicacionBusqueda}
                    onFocus={() => setShowUbicaciones(true)}
                    onChange={(e) => {
                      setUbicacionBusqueda(e.target.value);
                      setTerritorioSel(null);
                      setShowUbicaciones(true);
                    }}
                    autoComplete="off"
                    className="w-full bg-marca-dark/50 border border-gray-700/50 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-marca-gold transition-all"
                  />
                  {showUbicaciones && (ubicacionBusqueda || showUbicaciones) && !territorioSel && (
                    <div className="absolute z-20 w-full mt-2 bg-marca-dark border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 backdrop-blur-xl">
                      {territoriosFiltrados.length > 0 && territoriosFiltrados.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTerritorioSel(t);
                            setShowUbicaciones(false);
                            if (t.nombre !== 'OTRO') setOtroBarrio('');
                          }}
                          className="w-full text-left px-6 py-4 hover:bg-marca-gold hover:text-marca-darker transition-colors text-sm font-bold border-b border-gray-800 last:border-none uppercase tracking-tighter"
                        >
                          <span className="opacity-40 text-[9px] mr-3 bg-white/10 px-2 py-0.5 rounded-full">[{t.tipo}]</span>
                          {t.nombre}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const otro = territorios.find(t => t.nombre === 'OTRO');
                          setTerritorioSel(otro || { id: 'other', nombre: 'OTRO' });
                          setShowUbicaciones(false);
                        }}
                        className="w-full text-left px-6 py-5 bg-marca-gold/10 hover:bg-marca-gold hover:text-marca-darker transition-colors text-[11px] font-black text-marca-gold border-t border-gray-800 uppercase tracking-widest"
                      >
                        ✨ MI BARRIO NO ESTÁ EN LA LISTA (OTRO)
                      </button>
                    </div>
                  )}
                  {territorioSel && (
                    <button 
                      onClick={() => {
                        setTerritorioSel(null);
                        setOtroBarrio('');
                        setUbicacionBusqueda('');
                      }}
                      className="absolute right-5 top-11 text-marca-gold text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Cambiar
                    </button>
                  )}
                </div>

                {territorioSel?.nombre === 'OTRO' && (
                  <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                    <label htmlFor="otroBarrio" className="text-sm font-bold text-marca-goldLight uppercase tracking-widest pl-1">Nombre de tu Sector</label>
                    <input
                      id="otroBarrio"
                      type="text"
                      required
                      placeholder="Escribe el nombre manualmente"
                      value={otroBarrio}
                      onChange={(e) => setOtroBarrio(e.target.value)}
                      className="w-full bg-marca-dark/50 border border-marca-gold/30 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-marca-gold transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <label htmlFor="premio" className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Premio por el cual participas</label>
                  <div className="flex gap-4">
                    <select
                      id="premio"
                      required
                      value={premioSel}
                      onChange={(e) => setPremioSel(e.target.value)}
                      className="flex-1 bg-marca-dark/50 border border-gray-700/50 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-marca-gold appearance-none cursor-pointer transition-all"
                    >
                      <option value="" disabled>-- Selecciona un sorteo --</option>
                      {premiosDisponibles.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre_premio}</option>
                      ))}
                    </select>
                    
                    {premioSel && (
                      <div className="w-16 h-16 rounded-2xl border border-marca-gold/40 overflow-hidden shrink-0 animate-in zoom-in duration-500 shadow-xl">
                        <img 
                          src={premiosDisponibles.find(p => p.id === premioSel)?.imagen_url || `https://via.placeholder.com/100?text=Gift`} 
                          className="w-full h-full object-cover"
                          alt="Premio" 
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {fechaSorteoVisual && (
                  <div className="mt-2 text-marca-goldLight animate-in fade-in slide-in-from-left duration-700">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-marca-gold animate-ping" />
                       Gran Sorteo: <span className="text-white bg-marca-gold/20 px-3 py-1 rounded-full">{fechaSorteoVisual}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Bloque Legal (Mecánica de Sorteo) */}
              <div className="p-6 rounded-3xl bg-marca-darker/50 border border-gray-800/50 space-y-6">
                <div className="flex items-start gap-4">
                  <input
                    id="aceptaTerminos"
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded-lg border-gray-700 bg-marca-dark text-marca-gold focus:ring-marca-gold transition-all cursor-pointer"
                  />
                  <label htmlFor="aceptaTerminos" className="text-sm text-gray-400 leading-relaxed cursor-pointer select-none">
                    He leído y acepto la <button type="button" onClick={() => setShowModal(true)} className="text-marca-gold font-black hover:underline uppercase tracking-tighter">Mecánica del Sorteo</button> y la Política de Privacidad de Datos (Ley 1581).
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 text-[10px] text-gray-500 uppercase tracking-widest font-black border-t border-gray-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-marca-gold text-lg">✔</span> QR OBLIGATORIO
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-marca-gold text-lg">✔</span> PARA MAYORES
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-marca-gold text-lg">✔</span> 100% LEGAL
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-marca-gold text-lg">✔</span> 30 DÍAS PLAZO
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !aceptaTerminos}
                className={`w-full py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl
                  ${isSubmitting || !aceptaTerminos
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700/30' 
                    : 'bg-gradient-to-r from-marca-gold to-marca-goldLight text-marca-darker hover:shadow-marca-gold/40 hover:scale-[1.03] active:scale-95'
                  }`}
              >
                {isSubmitting ? 'Procesando...' : 'Finalizar Registro'}
              </button>
            </form>
          </div>

          <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.4em]">
            © 2026 {campana} • Palmira, Valle del Cauca.
          </p>
        </div>
      </div>

      {/* Modal de Términos y Condiciones */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-marca-dark border border-marca-gold/20 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-marca-dark/50 backdrop-blur-md">
              <h3 className="text-lg font-black text-marca-gold uppercase tracking-widest">Mecánica v1.0</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl transition-transform hover:rotate-90">✕</button>
            </div>
            
            <div className="p-6 md:p-10 overflow-y-auto space-y-8 text-gray-300 leading-relaxed text-sm scrollbar-hide">
              <section className="space-y-3">
                <h4 className="text-white font-black text-base flex items-center gap-3">
                  <span className="text-marca-gold">01.</span> MECÁNICA
                </h4>
                <p>Esta boleta es un obsequio gratuito. Para participar, el poseedor debe escanear el QR y registrar sus datos personales en este portal oficial.</p>
              </section>

              <section className="space-y-3">
                <h4 className="text-white font-black text-base flex items-center gap-3">
                  <span className="text-marca-gold">02.</span> REGLA DE ORO
                </h4>
                <p>Las boletas NO REGISTRADAS antes de la fecha del sorteo quedarán automáticamente excluidas de la tómbola digital.</p>
              </section>

              <section className="space-y-3">
                <h4 className="text-white font-black text-base flex items-center gap-3">
                  <span className="text-marca-gold">03.</span> RESTRICCIONES
                </h4>
                <p>Actividad válida para mayores de 18 años. Premios personales e intransferibles bajo cédula registrada.</p>
              </section>

              <section className="space-y-3">
                <h4 className="text-white font-black text-base flex items-center gap-3">
                  <span className="text-marca-gold">04.</span> EL SORTEO
                </h4>
                <p>Se realizará en las instalaciones de la campaña y se transmitirá por canales oficiales de redes sociales.</p>
              </section>

              <section className="space-y-3">
                <h4 className="text-white font-black text-base flex items-center gap-3">
                  <span className="text-marca-gold">05.</span> CADUCIDAD
                </h4>
                <p>El ganador tiene 30 días calendario para reclamar su premio con boleta física y documento original.</p>
              </section>
            </div>

            <div className="p-8 bg-marca-dark/50 border-t border-gray-800 text-center">
              <button 
                onClick={() => setShowModal(false)}
                className="px-12 py-4 bg-marca-gold text-marca-darker rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-marca-gold/20"
              >
                He Comprendido
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
