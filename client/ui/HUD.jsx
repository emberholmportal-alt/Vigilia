// HUD permanente estilo Diablo: orbe de vida (izq) y maná (der) siempre visibles,
// stats del personaje siempre a la vista, y acceso al inventario.
// Vida/maná son pozos llenos hasta que exista el combate.
import { useGameStore } from '../store.js'

export default function HUD() {
  const fps = useGameStore((s) => s.fps)
  const mapTitle = useGameStore((s) => s.mapTitle)
  const debug = useGameStore((s) => s.debug)
  const gold = useGameStore((s) => s.gold)
  const race = useGameStore((s) => s.race)
  const stats = useGameStore((s) => s.stats)
  const togglePanel = useGameStore((s) => s.togglePanel)

  const s = stats || { level: 1, str: 0, dex: 0, int: 0, vit: 0, hp: 0, hpMax: 1, mp: 0, mpMax: 1 }
  const hpPct = Math.round((s.hp / s.hpMax) * 100)
  const mpPct = Math.round((s.mp / s.mpMax) * 100)

  return (
    <>
      <div className="hud">
        <div className="who">
          <b>Vigilante {race ? '· ' + race.name : ''}</b>
          <div className="attrs">
            <span>Nv {s.level}</span>
            <span>FUE {s.str}</span>
            <span>DES {s.dex}</span>
            <span>INT {s.int}</span>
            <span>VIT {s.vit}</span>
          </div>
        </div>
        <div className="telemetry">
          <span className={fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}>{fps} fps</span>
          <span className="dim2">{mapTitle}</span>
        </div>
      </div>

      <div className="orbs">
        <div className="orb hp" style={{ '--fill': hpPct + '%' }}>
          <span>{s.hp}</span>
        </div>
        <div className="belt">
          <button className="bag" onClick={() => togglePanel('inventory')}>
            <i>🎒</i>
            <u>{gold} oro</u>
          </button>
        </div>
        <div className="orb mp" style={{ '--fill': mpPct + '%' }}>
          <span>{s.mp}</span>
        </div>
      </div>
    </>
  )
}
