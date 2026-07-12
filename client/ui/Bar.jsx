// Barra de vida/maná/stamina usando el arte de Flare (bar_*_background + bar_* de relleno).
// El relleno se recorta con clip-path (no se estira la textura).
const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

const ART = {
  hp: { bg: 'bar_hp_background.png', fill: 'bar_hp.png', ratio: 512 / 32 },
  mp: { bg: 'bar_mp_background.png', fill: 'bar_mp.png', ratio: 512 / 32 },
  xp: { bg: 'bar_xp_background.png', fill: 'bar_xp.png', ratio: 246 / 6 },
}

export default function Bar({ type = 'hp', value = 0, max = 1, label, width = 150 }) {
  const pct = Math.max(0, Math.min(1, value / (max || 1)))
  const a = ART[type] || ART.hp
  return (
    <div
      className={`fbar fbar-${type}`}
      style={{ width, height: width / a.ratio, backgroundImage: `url(${UI}${a.bg})` }}
    >
      <div
        className="fbar-inner"
        style={{ backgroundImage: `url(${UI}${a.fill})`, clipPath: `inset(0 ${(1 - pct) * 100}% 0 0)` }}
      />
      {label && <span className="fbar-label">{label}</span>}
    </div>
  )
}
