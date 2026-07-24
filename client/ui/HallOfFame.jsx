// Salón de la Fama: rankings públicos de TODOS los jugadores (online y offline), sobre datos
// server-autoritativos (nivel por XP, hazañas persistidas). Tres tablas: por nivel, por jefes
// derrotados y por zona más profunda alcanzada. Es el hermano del ranking de gremios, pero para
// personas: el mundo compite. Solo lectura.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { useT } from './useT.js'
import { raceName, zoneName } from '../i18n.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const MEDAL = ['#d8b552', '#c7ccd4', '#c08457']   // oro / plata / bronce para el top 3

export default function HallOfFame() {
  const t = useT()
  const setPanel = useGameStore((s) => s.setPanel)
  const hall = useGameStore((s) => s.hallData)
  const busy = useGameStore((s) => s.hallBusy)
  const me = useGameStore((s) => s.playerName)
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const [tab, setTab] = useState('level')
  const close = () => setPanel(null)

  const rows = hall ? (tab === 'level' ? hall.byLevel : tab === 'bosses' ? hall.byBosses : hall.byDeepest) : []
  const metric = (r) => {
    if (tab === 'level') return `${t('pm_lvl')} ${r.level}`
    if (tab === 'bosses') return `${r.bosses}/${hall.bossTotal} ${t('hof_bosses_u')}`
    return `${zoneName(r.deepest.map, lang)} · ${t('pm_lvl')} ${r.deepest.level}`
  }

  return (
    <div className="gframe-backdrop" onClick={close}>
      <div className="gframe hof-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={close} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title">{t('hof_title')}</h2>
            <p className="gframe-sub">{t('hof_sub')}</p>
          </div>
        </div>

        <div className="market-tabs">
          <button className={tab === 'level' ? 'on' : ''} onClick={() => setTab('level')}>{t('hof_tab_level')}</button>
          <button className={tab === 'bosses' ? 'on' : ''} onClick={() => setTab('bosses')}>{t('hof_tab_bosses')}</button>
          <button className={tab === 'deepest' ? 'on' : ''} onClick={() => setTab('deepest')}>{t('hof_tab_deepest')}</button>
        </div>

        <div className="gframe-body hof-body">
          {(busy && !hall) ? <div className="hof-empty">…</div>
            : !rows.length ? <div className="hof-empty">{t('hof_empty')}</div>
            : rows.map((r, i) => (
              <div key={i} className={'hof-row' + (r.name === me ? ' mine' : '')}>
                <span className="hof-n" style={i < 3 ? { color: MEDAL[i] } : undefined}>{i + 1}</span>
                <span className="hof-name">{r.name}{r.race ? <em> · {raceName(r.race, lang)}</em> : ''}
                  {r.name === me ? <b className="hof-you"> · {t('guild_you_tag')}</b> : ''}</span>
                <span className="hof-metric">{metric(r)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
