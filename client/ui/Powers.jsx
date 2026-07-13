// Panel de Acciones (poderes): las 6 acciones del juego con su nivel, progreso y qué
// hacen. Usa el panel real de Flare (powers.png). Datos reales (skills del store).
import { useGameStore } from '../store.js'
import { SKILLS, SKILL_CAP, skillXpForLevel } from '../data/progression.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

export default function Powers() {
  const skills = useGameStore((s) => s.skills)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />

        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{t('powers_title')}</div>

        <div className="pw-list">
          {SKILLS.map((k) => {
            const sk = (skills && skills[k]) || { level: 1, xp: 0 }
            const maxed = sk.level >= SKILL_CAP
            const base = skillXpForLevel(sk.level)
            const next = skillXpForLevel(sk.level + 1)
            const pct = maxed ? 1 : (next > base ? (sk.xp - base) / (next - base) : 0)
            return (
              <div className="pw-row" key={k}>
                <div className="pw-head">
                  <b>{t('skill_' + k)}</b>
                  <span>{t('lv')} {sk.level}<em>/{SKILL_CAP}</em></span>
                </div>
                <div className="pw-desc">{t('skilld_' + k)}</div>
                <div className="pw-bar"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
