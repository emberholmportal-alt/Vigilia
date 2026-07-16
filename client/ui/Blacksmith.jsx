// Herrero: repara el equipo por oro y lo FORJA (mejora) con cristales de las minas + oro,
// subiendo la skill de forja. Dos pestañas. Usa el panel real de Flare (powers.png).
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { isDurable, durabilityMax, RARITY_COLOR } from '../data/items.js'
import { armorDefense, upgradeLevel } from '../data/stats.js'
import ItemIcon from './ItemIcon.jsx'
import { Gem, Sword, Shield } from './Icon.jsx'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

export default function Blacksmith() {
  const equipment = useGameStore((s) => s.equipment)
  const gold = useGameStore((s) => s.gold)
  const smithName = useGameStore((s) => s.smithName)
  const repairCost = useGameStore((s) => s.repairCost)
  const repairAll = useGameStore((s) => s.repairAll)
  const upgradeCost = useGameStore((s) => s.upgradeCost)
  const upgradeGear = useGameStore((s) => s.upgradeGear)
  const crystals = useGameStore((s) => s.inventory.reduce((n, it) => n + (it && it.id === 752 ? (it.count || 1) : 0), 0))
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()
  const [tab, setTab] = useState('repair')

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
          <div className="smith-tabs">
            <button className={tab === 'repair' ? 'on' : ''} onClick={() => setTab('repair')}>{t('repair_tab')}</button>
            <button className={tab === 'forge' ? 'on' : ''} onClick={() => setTab('forge')}>{t('forge_tab')}</button>
          </div>

          {tab === 'repair' && (
            <>
              {durables.length === 0 && <div className="smith-empty">{t('smith_empty')}</div>}
              {durables.map(([sl, it]) => {
                const max = durabilityMax(it)
                const dur = it.dur != null ? it.dur : max
                const pct = Math.max(0, Math.min(1, dur / max))
                return (
                  <div className="smith-row" key={sl}>
                    <span className="smith-ico" title={t.item(it)}><ItemIcon icon={it.icon} size={30} /></span>
                    <span className="smith-name" style={{ color: RARITY_COLOR[it.rarity] || '#f2ead6' }}>
                      {t.item(it)}{upgradeLevel(it) ? ` +${upgradeLevel(it)}` : ''} <em>{t.slot(sl)}</em>
                    </span>
                    <div className="smith-bar"><i className={dur <= 0 ? 'broken' : ''} style={{ width: `${pct * 100}%` }} /></div>
                    <span className="smith-dur">{dur <= 0 ? t('broken') : `${dur}/${max}`}</span>
                  </div>
                )
              })}
              <button className="smith-repair" disabled={cost <= 0 || gold < cost} onClick={() => repairAll()}>
                {cost <= 0 ? t('smith_perfect') : gold < cost ? t('smith_nogold', { n: cost }) : t('smith_repair', { n: cost })}
              </button>
            </>
          )}

          {tab === 'forge' && (
            <>
              <div className="forge-hint">{t('forge_hint')} · <Gem /> {crystals}</div>
              {durables.length === 0 && <div className="smith-empty">{t('forge_none')}</div>}
              {durables.map(([sl, it]) => {
                const up = upgradeLevel(it)
                const c = upgradeCost(it)
                const dmax = c.max
                const can = !dmax && crystals >= c.crystals && gold >= c.gold
                return (
                  <div className="forge-row" key={sl}>
                    <span className="smith-ico" title={t.item(it)}><ItemIcon icon={it.icon} size={30} /></span>
                    <div className="forge-info">
                      <span className="smith-name" style={{ color: RARITY_COLOR[it.rarity] || '#f2ead6' }}>
                        {t.item(it)}{up ? ` +${up}` : ''} <em>{t.slot(sl)}</em>
                      </span>
                      <span className="forge-stat">
                        {it.slot === 'main' ? <Sword /> : <Shield />} {it.slot === 'main' ? '' : armorDefense(it)}
                        {!dmax && <em> · {t('forge_cost', { c: c.crystals, g: c.gold })}</em>}
                      </span>
                    </div>
                    <button className="forge-btn" disabled={!can} onClick={() => upgradeGear(sl)}>
                      {dmax ? t('forge_maxed') : t('forge_upgrade')}
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
