// Menú de jugador: al tocar a otro jugador aparece este menú (comerciar / ver stats), con nuestro
// diseño. Reemplaza el trade directo. La cercanía habilita "Comerciar" (el server la revalida).
import { useState, useEffect } from 'react'
import { useT } from './useT.js'
import { useGameStore } from '../store.js'
import { RACES } from '../data/characters.js'
import { Swap, Stats } from './Icon.jsx'

export default function PlayerMenu() {
  const t = useT()
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const pm = useGameStore((s) => s.playerMenu)
  const close = useGameStore((s) => s.closePlayerMenu)
  const requestTrade = useGameStore((s) => s.requestTrade)
  const [view, setView] = useState('menu')
  useEffect(() => { setView('menu') }, [pm?.id])   // al abrir otro jugador, arranca en el menú (no en stats)

  if (!pm) return null
  const race = RACES.find((r) => r.id === pm.race)
  const archetype = race ? (lang === 'es' ? race.archetype : race.archetype_en) : ''
  const raceName = race ? (lang === 'es' ? race.name : race.name_en) : ''
  const hpPct = pm.hpMax ? Math.max(0, Math.min(100, (pm.hp / pm.hpMax) * 100)) : 100
  const doTrade = () => { requestTrade(pm.id, pm.name); close() }

  return (
    <div className="pm-backdrop" onClick={close}>
      <div className="pm-card" onClick={(e) => e.stopPropagation()}>
        <div className="pm-head">
          <span className="pm-name">{pm.name}</span>
          <span className="pm-lvl">{t('pm_lvl')} {pm.level || 1}</span>
        </div>

        {view === 'stats' ? (
          <div className="pm-stats">
            {archetype && <div className="pm-row"><span>{t('pm_class')}</span><b>{archetype}{raceName ? ' · ' + raceName : ''}</b></div>}
            <div className="pm-row"><span>{t('pm_hp')}</span><b>{pm.hp ?? '—'} / {pm.hpMax ?? '—'}</b></div>
            <div className="pm-hpbar"><i style={{ width: hpPct + '%' }} /></div>
            <div className="pm-actions">
              <button className="pm-btn" onClick={() => setView('menu')}>← {t('pm_back')}</button>
              <button className="pm-btn primary" disabled={!pm.near} onClick={doTrade}><Swap /> {t('pm_trade')}</button>
            </div>
          </div>
        ) : (
          <div className="pm-actions col">
            <button className="pm-btn primary" disabled={!pm.near} onClick={doTrade}><Swap /> {t('pm_trade')}</button>
            <button className="pm-btn" onClick={() => setView('stats')}><Stats /> {t('pm_stats')}</button>
            {!pm.near && <p className="pm-far">{t('trade_too_far')}</p>}
          </div>
        )}

        <button className="pm-close" onClick={close}>{t('pm_close')}</button>
      </div>
    </div>
  )
}
