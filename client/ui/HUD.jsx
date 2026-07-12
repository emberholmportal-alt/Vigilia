// HUD permanente. Barras de vida/maná (arte de Flare), stats siempre visibles,
// cinturón de 4 consumibles, correr/caminar con stamina y chat sobre la cabeza.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { playerProgress } from '../data/progression.js'
import Bar from './Bar.jsx'
import Globe from './Globe.jsx'
import ActionBar from './ActionBar.jsx'

export default function HUD() {
  const [chatOpen, setChatOpen] = useState(false)
  const [chatText, setChatText] = useState('')
  const say = useGameStore((s) => s.say)

  function sendChat(e) {
    e.preventDefault()
    say(chatText)
    setChatText('')
    setChatOpen(false)
  }

  const mapTitle = useGameStore((s) => s.mapTitle)
  const playerName = useGameStore((s) => s.playerName)
  const fps = useGameStore((s) => s.fps)
  const gold = useGameStore((s) => s.gold)
  const race = useGameStore((s) => s.race)
  const stats = useGameStore((s) => s.stats)
  const belt = useGameStore((s) => s.belt)
  const running = useGameStore((s) => s.running)
  const stamina = useGameStore((s) => s.stamina)
  const staminaMax = useGameStore((s) => s.staminaMax)
  const toggleRun = useGameStore((s) => s.toggleRun)
  const xp = useGameStore((s) => s.xp)
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

      <div className="hud-bottom">
        <div className="globe-row">
          <Globe type="hp" value={s.hp} max={s.hpMax} label={`${s.hp}/${s.hpMax}`} />

          <div className="hud-aux">
            <button className={'run-btn' + (running ? ' on' : '')} onClick={toggleRun} title="Caminar/correr">
              {running ? '🏃' : '🚶'}
              <Bar type="xp" value={stamina} max={staminaMax} width={48} />
            </button>
            <button className="icon-btn" onClick={() => setChatOpen((v) => !v)} title="Chat">💬</button>
          </div>

          <ActionBar belt={belt} gold={gold} onPanel={togglePanel} />

          <Globe type="mp" value={s.mp} max={s.mpMax} label={`${s.mp}/${s.mpMax}`} />
        </div>

        <div className="xp-strip" title={`XP ${prog.into}/${prog.need}`}>
          <div className="xp-strip-fill" style={{ width: `${Math.round(prog.pct * 100)}%` }} />
        </div>
      </div>

      {chatOpen && (
        <form className="chat-bar" onSubmit={sendChat}>
          <input
            autoFocus
            value={chatText}
            maxLength={120}
            placeholder="Decí algo…"
            onChange={(e) => setChatText(e.target.value)}
            onBlur={() => !chatText && setChatOpen(false)}
          />
          <button type="submit">Decir</button>
        </form>
      )}
    </>
  )
}
