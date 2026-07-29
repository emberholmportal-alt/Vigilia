// Ranking de gremios en su PROPIO modal (antes iba apretado abajo de la hoja de personaje). Solo
// lectura, datos server-autoritativos (guildRanking). Hermano del Salón de la Fama pero para gremios.
import { useGameStore } from '../store.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const MEDAL = ['#d8b552', '#c7ccd4', '#c08457']   // oro / plata / bronce para el top 3

export default function GuildRanking() {
  const t = useT()
  const setPanel = useGameStore((s) => s.setPanel)
  const ranking = useGameStore((s) => s.guildRanking) || []
  const guild = useGameStore((s) => s.guild)
  const close = () => setPanel(null)

  return (
    <div className="gframe-backdrop" onClick={close}>
      <div className="gframe" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={close} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title">{t('guildrank_title')}</h2>
            <p className="gframe-sub">{t('guildrank_sub')}</p>
          </div>
        </div>

        <div className="gframe-body grank-body">
          {!ranking.length ? (
            <div className="hof-empty">{t('guildrank_empty')}</div>
          ) : ranking.map((g, i) => (
            <div key={g.id} className={'grank-row' + (guild && g.id === guild.id ? ' mine' : '')}>
              <span className="grank-n" style={{ color: MEDAL[i] || 'var(--dim)' }}>{i + 1}</span>
              <span className="grank-chip" style={{ background: g.color }}>{g.tag}</span>
              <span className="grank-name">{g.name}</span>
              <span className="grank-meta">
                <b>{t('guild_power_n', { n: g.power ?? 0 })}</b>
                <i>{t('guild_members_n', { n: g.members })}</i>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
