// HUD permanente estilo Diablo: globos de vida/maná en las esquinas, la barra de acción
// real de Flare al centro (cinturón + botones de menú) y la barra de XP abajo. Los stats
// arriba a la izquierda (tocables abren el panel de personaje). Sin stamina ni chat.
import { useGameStore } from '../store.js'
import { playerProgress } from '../data/progression.js'
import Globe from './Globe.jsx'
import ActionBar, { MenuRow } from './ActionBar.jsx'

export default function HUD() {
  const mapTitle = useGameStore((s) => s.mapTitle)
  const playerName = useGameStore((s) => s.playerName)
  const fps = useGameStore((s) => s.fps)
  const gold = useGameStore((s) => s.gold)
  const race = useGameStore((s) => s.race)
  const stats = useGameStore((s) => s.stats)
  const belt = useGameStore((s) => s.belt)
  const xp = useGameStore((s) => s.xp)
  const nearby = useGameStore((s) => s.nearby)
  const requestInteract = useGameStore((s) => s.requestInteract)
  const togglePanel = useGameStore((s) => s.togglePanel)

  const s = stats || { level: 1, str: 0, dex: 0, int: 0, vit: 0, hp: 0, hpMax: 1, mp: 0, mpMax: 1 }
  const prog = playerProgress(xp || 0)

  return (
    <>
      <div className="hud">
        <button className="who" onClick={() => togglePanel('character')} title="Ver personaje">
          <b>{playerName} {race ? '· ' + race.name : ''}</b>
          <div className="attrs">
            <span>Nv {s.level}</span>
            <span>FUE {s.str}</span>
            <span>DES {s.dex}</span>
            <span>INT {s.int}</span>
            <span>VIT {s.vit}</span>
          </div>
        </button>
        <div className="telemetry">
          <span className={fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}>{fps} fps</span>
          <span className="dim2">{mapTitle}</span>
        </div>
      </div>

      {nearby && (
        <button className="interact-btn" onClick={requestInteract}>
          {nearby.shop ? '🛒 Comerciar con ' : '💬 Hablar con '}{nearby.name}
        </button>
      )}

      <div className="hud-bottom">
        <MenuRow onPanel={togglePanel} />
        <div className="globe-row">
          <Globe type="hp" value={s.hp} max={s.hpMax} label={`${s.hp}/${s.hpMax}`} />
          <ActionBar belt={belt} gold={gold} />
          <Globe type="mp" value={s.mp} max={s.mpMax} label={`${s.mp}/${s.mpMax}`} />
        </div>

        <div className="xp-strip" title={`XP ${prog.into}/${prog.need}`}>
          <div className="xp-strip-fill" style={{ width: `${Math.round(prog.pct * 100)}%` }} />
        </div>
      </div>
    </>
  )
}
