// HUD permanente. Barras de vida/maná (arte de Flare), stats siempre visibles,
// cinturón de 4 consumibles, y correr/caminar con barra de stamina.
import { useGameStore } from '../store.js'
import Bar from './Bar.jsx'
import Slot from './Slot.jsx'

export default function HUD() {
  const mapTitle = useGameStore((s) => s.mapTitle)
  const fps = useGameStore((s) => s.fps)
  const gold = useGameStore((s) => s.gold)
  const race = useGameStore((s) => s.race)
  const stats = useGameStore((s) => s.stats)
  const belt = useGameStore((s) => s.belt)
  const running = useGameStore((s) => s.running)
  const stamina = useGameStore((s) => s.stamina)
  const staminaMax = useGameStore((s) => s.staminaMax)
  const toggleRun = useGameStore((s) => s.toggleRun)
  const togglePanel = useGameStore((s) => s.togglePanel)

  const s = stats || { level: 1, str: 0, dex: 0, int: 0, vit: 0, hp: 0, hpMax: 1, mp: 0, mpMax: 1 }

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

      <div className="hud-bottom">
        <div className="hud-belt-row">
          <div className="belt">
            {belt.map((it, i) => (
              <Slot key={i} item={it} size={42} />
            ))}
          </div>
          <button className={'run-btn' + (running ? ' on' : '')} onClick={toggleRun}>
            {running ? '🏃' : '🚶'}
            <Bar type="xp" value={stamina} max={staminaMax} width={70} />
          </button>
          <button className="bag" onClick={() => togglePanel('inventory')}>
            <i>🎒</i>
            <u>{gold}</u>
          </button>
        </div>
        <div className="hud-bars-row">
          <Bar type="hp" value={s.hp} max={s.hpMax} label={`${s.hp}/${s.hpMax}`} width={165} />
          <Bar type="mp" value={s.mp} max={s.mpMax} label={`${s.mp}/${s.mpMax}`} width={165} />
        </div>
      </div>
    </>
  )
}
