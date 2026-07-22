// Registro: dos pestañas sobre el panel real de Flare (powers.png).
//  · Diarias: las 3 misiones del día con progreso y recompensa (reclamar da XP + oro + sellos).
//  · Historia: quests narrativas (banderas de estado) con su objetivo actual + completadas.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { QUESTS, ZONE_REVEALS, questActive, questComplete, activeStage } from '../data/quests.js'
import { questName, stageText } from '../i18n.js'
import { Seal, Chest, Scroll } from './Icon.jsx'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

// Pestaña Diarias: misiones del día + cofre de sellos.
function DailyTab({ t }) {
  const missions = useGameStore((s) => s.missions)
  const claimMission = useGameStore((s) => s.claimMission)
  const seals = useGameStore((s) => s.seals)
  const sealCost = useGameStore((s) => s.sealChestCost())
  const openSealChest = useGameStore((s) => s.openSealChest)
  return (
    <div className="ms-body">
      <div className="ms-seals"><Seal /> {t('seals_word')}: <b>{seals || 0}</b></div>
      <div className="ms-hint">{t('missions_hint')}</div>
      <div className="ms-list">
        {(missions || []).map((m, i) => {
          const done = m.progress >= m.target
          const pct = Math.max(0, Math.min(1, m.progress / m.target))
          return (
            <div className={'ms-row' + (m.claimed ? ' claimed' : done ? ' done' : '')} key={m.id}>
              <div className="ms-head">
                <b>{t('mission_' + m.type, { n: m.target })}</b>
                <span className="ms-where">
                  {t('mission_in', { zone: t.zone(m.map) })}
                  {m.giver ? ' · ' + t('mission_for', { npc: t.lang === 'en' ? m.giver_en : m.giver }) : ''}
                </span>
              </div>
              <div className="ms-bar"><i style={{ width: `${pct * 100}%` }} /></div>
              <div className="ms-foot">
                <span className="ms-count">{Math.min(m.progress, m.target)}/{m.target}</span>
                <span className="ms-reward">{t('mission_reward_line', { xp: m.xp, gold: m.gold || 0, seals: m.seals || 0 })}</span>
                <button className="ms-claim" disabled={!done || m.claimed} onClick={() => claimMission(i)}>
                  {m.claimed ? t('mission_claimed') : t('mission_claim')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <button className="ms-sealchest" disabled={(seals || 0) < sealCost} onClick={() => openSealChest()}>
<Chest /> {t('seal_chest_open', { n: sealCost })}
      </button>
    </div>
  )
}

// Checklist de nombres para la quest de los Guardianes (toque narrativo extra).
function NameChecklist({ flags }) {
  return (
    <div className="q-names">
      {Object.values(ZONE_REVEALS).map((r) => (
        <span key={r.flag} className={'q-name' + (flags[r.flag] ? ' got' : '')}>
          {flags[r.flag] ? '✓ ' + r.name : '✦ ¿?'}
        </span>
      ))}
    </div>
  )
}

// Pestaña Historia: quests activas (objetivo actual) + completadas.
function StoryTab({ t }) {
  const flags = useGameStore((s) => s.questFlags) || {}
  const active = QUESTS.filter((q) => questActive(flags, q))
  const completed = QUESTS.filter((q) => questComplete(flags, q))
  return (
    <div className="ms-body">
      {!active.length && !completed.length && <div className="q-empty">{t('quests_none')}</div>}
      <div className="q-list">
        {active.map((q) => {
          const st = activeStage(flags, q)
          return (
            <div className="q-row" key={q.id}>
              <div className="q-title"><Scroll /> {questName(q, t.lang)}</div>
              <div className="q-stage">{stageText(st, t.lang)}</div>
              {q.id === 'guardianes' && <NameChecklist flags={flags} />}
            </div>
          )
        })}
      </div>
      {completed.length > 0 && (
        <div className="q-done-wrap">
          <div className="q-done-h">{t('quests_completed')} ({completed.length})</div>
          {completed.map((q) => (
            <div className="q-done" key={q.id}>✓ {questName(q, t.lang)}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Missions() {
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()
  const [tab, setTab] = useState('daily')

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />
        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{t('missions_menu')}</div>

        <div className="pw-tabs">
          <button className={tab === 'daily' ? 'on' : ''} onClick={() => setTab('daily')}>{t('tab_daily')}</button>
          <button className={tab === 'story' ? 'on' : ''} onClick={() => setTab('story')}>{t('tab_story')}</button>
        </div>

        {tab === 'daily' ? <DailyTab t={t} /> : <StoryTab t={t} />}
      </div>
    </div>
  )
}
