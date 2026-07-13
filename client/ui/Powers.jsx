// Panel de Acciones/Poderes con dos pestañas sobre el panel real de Flare (powers.png):
//  · Oficios: las 6 acciones del juego (combate, minería, etc.) con nivel y progreso.
//  · Árbol: árbol de habilidades (3 ramas gateadas por atributo) + puntos que ganás al
//    subir de nivel. Datos reales del store.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { SKILLS, SKILL_CAP, skillXpForLevel } from '../data/progression.js'
import { BRANCHES, NODES, skillEarned, skillSpent } from '../data/skilltree.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

// Pestaña "Oficios": las 6 acciones con su barra de progreso.
function TradesTab({ skills, t }) {
  return (
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
  )
}

// Pestaña "Árbol": ramas con nodos rankeables. Un nodo se puede subir si hay puntos y el
// atributo de su rama llega al requisito.
function TreeTab({ stats, skillRanks, rankSkill, respec, respecCost, t }) {
  const s = stats || {}
  const pts = skillEarned(s.level || 1) - skillSpent(skillRanks)
  return (
    <div className="tree-body">
      <div className="tree-head">
        <span className="tree-pts">{t('skill_points_n', { n: Math.max(0, pts) })}</span>
        <button className="tree-respec" onClick={respec}>{t('respec_cost', { n: respecCost })}</button>
      </div>
      <div className="tree-hint">{t('tree_hint')}</div>
      {BRANCHES.map((br) => {
        const attrVal = s[br.attr] || 0
        return (
          <div className="tree-branch" key={br.id}>
            <div className="tree-branch-h">
              <span className="tree-branch-ic">{br.icon}</span>
              <b>{t('branch_' + br.id)}</b>
              <em>{t('abbr_' + br.attr)} {attrVal}</em>
            </div>
            <div className="tree-nodes">
              {NODES.filter((n) => n.branch === br.id).map((n) => {
                const rank = skillRanks[n.id] || 0
                const maxed = rank >= n.max
                const locked = attrVal < n.req
                const canRank = !maxed && !locked && pts > 0
                return (
                  <div className={`tree-node${locked ? ' locked' : ''}${maxed ? ' maxed' : ''}`} key={n.id}>
                    <div className="tree-node-ic">{n.icon}</div>
                    <div className="tree-node-info">
                      <div className="tree-node-top">
                        <b>{t('node_' + n.id)}</b>
                        <span className="tree-node-rank">
                          {Array.from({ length: n.max }).map((_, i) => (
                            <i key={i} className={i < rank ? 'on' : ''} />
                          ))}
                        </span>
                      </div>
                      <div className="tree-node-desc">{t('noded_' + n.id)}</div>
                      {locked && (
                        <div className="tree-node-req">{t('node_req_short', { attr: t('abbr_' + n.attr), n: n.req })}</div>
                      )}
                    </div>
                    <button className="tree-node-add" disabled={!canRank}
                            onClick={() => rankSkill(n.id)} aria-label={t('node_' + n.id)}>
                      {maxed ? '✓' : '+'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Powers() {
  const skills = useGameStore((s) => s.skills)
  const stats = useGameStore((s) => s.stats)
  const skillRanks = useGameStore((s) => s.skillRanks)
  const rankSkill = useGameStore((s) => s.rankSkill)
  const respec = useGameStore((s) => s.respec)
  const respecCost = useGameStore((s) => s.respecCost)()
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()
  const [tab, setTab] = useState('tree')

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />

        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{t('powers_title')}</div>

        <div className="pw-tabs">
          <button className={tab === 'tree' ? 'on' : ''} onClick={() => setTab('tree')}>{t('tab_tree')}</button>
          <button className={tab === 'trades' ? 'on' : ''} onClick={() => setTab('trades')}>{t('tab_actions')}</button>
        </div>

        {tab === 'trades'
          ? <TradesTab skills={skills} t={t} />
          : <TreeTab stats={stats} skillRanks={skillRanks} rankSkill={rankSkill} respec={respec} respecCost={respecCost} t={t} />}
      </div>
    </div>
  )
}
