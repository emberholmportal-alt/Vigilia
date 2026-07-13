// Modal (panel real de Flare) para elegir qué habilidad va en el botón derecho (slot M2).
// Lista las habilidades desbloqueadas con su ícono real, costo de maná y recarga. Tocar una
// la liga; "Ninguna" la desliga. Estética del resto de los paneles (powers.png).
import { useGameStore } from '../store.js'
import { unlockedAbilities } from '../data/abilities.js'
import ItemIcon from './ItemIcon.jsx'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

export default function MouseBind() {
  const stats = useGameStore((s) => s.stats)
  const special = useGameStore((s) => s.specialAbility)
  const setSpecial = useGameStore((s) => s.setSpecial)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()
  const abils = unlockedAbilities(stats)

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />
        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{t('mousebind_title')}</div>

        <div className="mb-body">
          <div className="mb-hint">{t('mousebind_hint')}</div>
          <div className="mb-list">
            {!abils.length && <div className="mb-empty">{t('mousebind_none_unlocked')}</div>}
            {abils.map((a) => (
              <button key={a.id} className={'mb-row' + (special === a.id ? ' sel' : '')}
                      onClick={() => setSpecial(a.id)}>
                <span className="mb-ic"><ItemIcon icon={a.icon} size={30} /></span>
                <span className="mb-info">
                  <b>{t('ab_' + a.id)}</b>
                  <em>{t('abd_' + a.id)}</em>
                </span>
                <span className="mb-cost">{a.mp} {t('stat_mp')} · {a.cd}s</span>
              </button>
            ))}
          </div>
          <button className={'mb-clear' + (special == null ? ' sel' : '')} onClick={() => setSpecial(null)}>
            {t('bind_none')}
          </button>
        </div>
      </div>
    </div>
  )
}
