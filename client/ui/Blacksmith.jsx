// Herrero: repara el equipo por oro. Muestra las piezas durables equipadas con su barra
// de durabilidad y el costo total de reparar todo. Usa el panel de Flare (powers.png).
import { useGameStore } from '../store.js'
import { isDurable, durabilityMax, RARITY_COLOR } from '../data/items.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

export default function Blacksmith() {
  const equipment = useGameStore((s) => s.equipment)
  const gold = useGameStore((s) => s.gold)
  const smithName = useGameStore((s) => s.smithName)
  const repairCost = useGameStore((s) => s.repairCost)
  const repairAll = useGameStore((s) => s.repairAll)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()

  const durables = Object.entries(equipment).filter(([, it]) => isDurable(it))
  const cost = repairCost()

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />
        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{smithName}</div>

        <div className="smith-body">
          {durables.length === 0 && <div className="smith-empty">{t('smith_empty')}</div>}
          {durables.map(([sl, it]) => {
            const max = durabilityMax(it)
            const dur = it.dur != null ? it.dur : max
            const pct = Math.max(0, Math.min(1, dur / max))
            return (
              <div className="smith-row" key={sl}>
                <span className="smith-name" style={{ color: RARITY_COLOR[it.rarity] || '#f2ead6' }}>
                  {t.item(it)} <em>{t.slot(sl)}</em>
                </span>
                <div className="smith-bar"><i className={dur <= 0 ? 'broken' : ''} style={{ width: `${pct * 100}%` }} /></div>
                <span className="smith-dur">{dur <= 0 ? t('broken') : `${dur}/${max}`}</span>
              </div>
            )
          })}

          <button className="smith-repair" disabled={cost <= 0 || gold < cost} onClick={() => repairAll()}>
            {cost <= 0 ? t('smith_perfect') : gold < cost ? t('smith_nogold', { n: cost }) : t('smith_repair', { n: cost })}
          </button>
        </div>
      </div>
    </div>
  )
}
