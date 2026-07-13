// Misiones diarias: 3 del día con su progreso y recompensa. Al completarlas, "Reclamar" da
// XP + oro. Usa el panel real de Flare (powers.png), como el resto de los modales.
import { useGameStore } from '../store.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

export default function Missions() {
  const missions = useGameStore((s) => s.missions)
  const claimMission = useGameStore((s) => s.claimMission)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />
        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{t('missions_title')}</div>

        <div className="ms-body">
          <div className="ms-hint">{t('missions_hint')}</div>
          <div className="ms-list">
            {(missions || []).map((m, i) => {
              const done = m.progress >= m.target
              const pct = Math.max(0, Math.min(1, m.progress / m.target))
              return (
                <div className={'ms-row' + (m.claimed ? ' claimed' : done ? ' done' : '')} key={m.id}>
                  <div className="ms-head">
                    <b>{t('mission_' + m.type, { n: m.target })}</b>
                    <span className="ms-where">{t('mission_in', { zone: t.zone(m.map) })}</span>
                  </div>
                  <div className="ms-bar"><i style={{ width: `${pct * 100}%` }} /></div>
                  <div className="ms-foot">
                    <span className="ms-count">{Math.min(m.progress, m.target)}/{m.target}</span>
                    <span className="ms-reward">{t('mission_reward_line', { xp: m.xp, gold: m.gold })}</span>
                    <button className="ms-claim" disabled={!done || m.claimed} onClick={() => claimMission(i)}>
                      {m.claimed ? t('mission_claimed') : t('mission_claim')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
