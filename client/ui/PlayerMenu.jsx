// Menú de jugador: al tocar a otro jugador aparece este menú (comerciar / inspeccionar), con nuestro
// diseño. La cercanía habilita "Comerciar" (el server la revalida). "Ver stats" pide al server la
// tarjeta pública del objetivo (estilo "look" de Tibia) y la muestra: vitales, combate, set, gremio
// y las 6 skills de oficio. Es de display — la arma el propio cliente del objetivo, server-relayed.
import { useState, useEffect } from 'react'
import { useT } from './useT.js'
import { useGameStore } from '../store.js'
import { RACES } from '../data/characters.js'
import { SKILLS } from '../data/progression.js'
import { zoneName } from '../i18n.js'
import { Swap, Stats } from './Icon.jsx'

const pct = (v, max) => Math.max(0, Math.min(100, ((v || 0) / (max || 1)) * 100))

export default function PlayerMenu() {
  const t = useT()
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const pm = useGameStore((s) => s.playerMenu)
  const close = useGameStore((s) => s.closePlayerMenu)
  const requestTrade = useGameStore((s) => s.requestTrade)
  const requestInspect = useGameStore((s) => s.requestInspect)
  const inspectCard = useGameStore((s) => s.inspectCard)
  const [view, setView] = useState('menu')
  useEffect(() => { setView('menu') }, [pm?.id])   // al abrir otro jugador, arranca en el menú
  // Al entrar a la vista de stats, pedí la tarjeta pública al server (una vez por objetivo/apertura).
  useEffect(() => { if (view === 'stats' && pm) requestInspect(pm.id) }, [view, pm?.id])

  if (!pm) return null
  const raceOf = (id) => RACES.find((r) => r.id === id)
  const doTrade = () => { requestTrade(pm.id, pm.name); close() }

  // La tarjeta ya llegó si inspectCard es de este jugador. `card` puede ser null (objetivo sin stats).
  const info = inspectCard && inspectCard.id === pm.id ? inspectCard : null
  const c = info?.card || null
  const raceId = (info?.race) || pm.race
  const race = raceOf(raceId)
  const archetype = race ? (lang === 'es' ? race.archetype : race.archetype_en) : ''
  const raceName = race ? (lang === 'es' ? race.name : race.name_en) : ''
  const hp = c ? c.hp : pm.hp, hpMax = c ? c.hpMax : pm.hpMax

  const skillName = (k) => t('skill_' + k)

  return (
    <div className="pm-backdrop" onClick={close}>
      <div className="pm-card" onClick={(e) => e.stopPropagation()}>
        <div className="pm-head">
          <span className="pm-name">
            {c?.guild && <span className="pm-guild" style={{ color: c.guild.color }}>[{c.guild.tag}]</span>}
            {pm.name}
          </span>
          <span className="pm-lvl">{t('pm_lvl')} {(info?.level) || pm.level || 1}</span>
        </div>

        {view === 'stats' ? (
          <div className="pm-stats">
            {archetype && <div className="pm-row"><span>{t('pm_class')}</span><b>{archetype}{raceName ? ' · ' + raceName : ''}</b></div>}
            <div className="pm-row"><span>{t('pm_hp')}</span><b>{hp ?? '—'} / {hpMax ?? '—'}</b></div>
            <div className="pm-hpbar"><i style={{ width: pct(hp, hpMax) + '%' }} /></div>

            {info?.feats && (
              <>
                <div className="pm-sec">{t('pm_feats')}</div>
                <div className="pm-row"><span>{t('feat_bosses')}</span><b className="pm-good">{info.feats.bosses}/{info.feats.bossTotal}</b></div>
                {info.feats.deepest?.level > 0 && (
                  <div className="pm-row"><span>{t('feat_deepest')}</span><b>{zoneName(info.feats.deepest.map, lang)} · {t('pm_lvl')} {info.feats.deepest.level}</b></div>
                )}
              </>
            )}

            {view === 'stats' && !info ? (
              <p className="pm-far">{t('pm_loading')}</p>
            ) : c ? (
              <>
                <div className="pm-row"><span>{t('stat_mp')}</span><b>{c.mp} / {c.mpMax}</b></div>
                <div className="pm-sec">{t('pm_combat')}</div>
                <div className="pm-row"><span>{t('stat_dmg')}</span><b>{c.dmgMin}–{c.dmgMax}</b></div>
                <div className="pm-row"><span>{t('stat_def')}</span><b>{c.defense}</b></div>
                {c.crit > 0 && <div className="pm-row"><span>{t('stat_crit')}</span><b>{c.crit}%</b></div>}
                {c.itemFind > 0 && <div className="pm-row"><span>{t('stat_magicfind')}</span><b className="pm-good">+{c.itemFind}%</b></div>}
                {c.hpRegen > 0 && <div className="pm-row"><span>{t('stat_hpregen')}</span><b>{c.hpRegen}/s</b></div>}
                {(c.fireResist > 0 || c.iceResist > 0) && (
                  <div className="pm-row"><span>{t('pm_res')}</span><b>{c.fireResist > 0 ? `🔥${c.fireResist}%` : ''} {c.iceResist > 0 ? `❄${c.iceResist}%` : ''}</b></div>
                )}
                <div className="pm-row"><span>{t('stat_speed')}</span><b>×{(c.speedMul || 1).toFixed(2)}</b></div>
                {c.set && <div className="pm-row"><span>{t('stat_set')}</span><b className="pm-good">{c.set.label} {c.set.pieces}/6</b></div>}

                <div className="pm-sec">{t('pm_skills')}</div>
                {SKILLS.map((k) => {
                  const lv = (c.skills && c.skills[k]) || 1
                  return (
                    <div className="pm-skill" key={k}>
                      <span className="pm-skill-nm">{skillName(k)}</span>
                      <span className="pm-skill-bar"><i style={{ width: pct(lv, 20) + '%' }} /></span>
                      <b className="pm-skill-lv">{lv}</b>
                    </div>
                  )
                })}
              </>
            ) : (
              <p className="pm-far">{t('pm_noinfo')}</p>
            )}

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
