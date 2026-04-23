type Props = {
  logoUrl: string | null;
  titulo: string;
  subtitulo: string;
  mensaje: string;
  auspiciantes: string[];
  ubicacion?: string;
  ubicacionMapsUrl?: string;
};

function resaltarAuspiciantes(texto: string, auspiciantes: string[]) {
  if (!texto || auspiciantes.length === 0) return texto;
  let result = texto;
  for (const a of auspiciantes) {
    if (a.trim()) {
      result = result.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), `**${a}**`);
    }
  }
  return result;
}

export default function BienvenidaLanding({
  logoUrl,
  titulo,
  subtitulo,
  mensaje,
  auspiciantes,
  ubicacion,
  ubicacionMapsUrl,
}: Props) {
  const auspiciantesValidos = auspiciantes.filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-b from-marca-gold/10 to-transparent rounded-3xl p-8 text-center space-y-4 border border-marca-gold/20">
        {logoUrl && (
          <div className="flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="h-20 w-auto object-contain" />
          </div>
        )}
        {titulo && (
          <h2 className="text-2xl font-black text-white leading-tight">
            {titulo.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
          </h2>
        )}
        {subtitulo && (
          <p className="text-marca-gold/80 text-sm font-bold italic">{subtitulo}</p>
        )}
      </div>

      {mensaje && (
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
          {resaltarAuspiciantes(mensaje, auspiciantesValidos).split('\n').filter(Boolean).map((parrafo, i) => (
            <p key={i} className="text-slate-300 text-sm leading-relaxed">
              {parrafo.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                j % 2 === 1
                  ? <strong key={j} className="text-marca-gold font-black">{part}</strong>
                  : part
              )}
            </p>
          ))}
        </div>
      )}

      {auspiciantesValidos.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {auspiciantesValidos.map((a) => (
            <span key={a} className="bg-marca-gold/10 border border-marca-gold/30 px-5 py-2.5 rounded-full text-sm font-black text-marca-gold uppercase tracking-wider">
              {a}
            </span>
          ))}
        </div>
      )}

      {ubicacion && (
        <div className="bg-slate-900/60 border border-marca-gold/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-2xl">📍</div>
          <div className="flex-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Ubicación</p>
            <p className="text-white text-sm font-bold">{ubicacion}</p>
            {ubicacionMapsUrl && (
              <a
                href={ubicacionMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-marca-gold text-xs font-bold hover:underline"
              >
                Ver en Google Maps →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
