// Globo de vida/maná estilo Diablo (Demonic UI de Flare, CC-BY-SA — orbe original de
// itsmars en OpenGameArt). El fondo es el globo vacío + marco; el líquido (círculo de
// color) se recorta verticalmente según el porcentaje: sube desde abajo como en Diablo.
const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function Globe({ type, value, max, label }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const fill = type === 'hp' ? 'globe_hp_fill.png' : 'globe_mp_fill.png'
  const bg = type === 'hp' ? 'globe_hp_bg.png' : 'globe_mp_bg.png'
  return (
    <div className="globe" style={{ backgroundImage: `url(${UI}${bg})` }}>
      <div className="globe-liquid"
           style={{ height: (pct * 100) + '%', backgroundImage: `url(${UI}${fill})` }} />
      {label && <span className="globe-label">{label}</span>}
    </div>
  )
}
