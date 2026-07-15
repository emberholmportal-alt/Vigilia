// Panel de Acciones/Poderes con dos pestañas sobre el panel real de Flare (powers.png):
//  · Oficios: las 6 acciones del juego (combate, minería, etc.) con nivel y progreso.
//  · Árbol: árbol de habilidades (3 ramas gateadas por atributo) + puntos que ganás al
//    subir de nivel. Datos reales del store.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { SKILLS, SKILL_CAP, skillXpForLevel } from '../data/progression.js'
import { BRANCHES, NODES, skillEarned, skillSpent } from '../data/skilltree.js'
import ItemIcon from './ItemIcon.jsx'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

// Candado dibujado (SVG), sin emojis, para los nodos aún bloqueados.
function LockIcon() {
  return (
    <svg className="tree-slot-lock" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" strokeWidth="2.2" />
    </svg>
  )
}

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

const UISLOT = UI + 'slot_empty.png'
// Posición de cada nodo en el grafo (columna por rama, fila por orden). En % del área.
const COL_X = (ci) => (ci + 0.5) / BRANCHES.length * 100        // centro de la columna
const ROW_Y = (ri) => 20 + ri * 27                              // filas: 20, 47, 74

// Pestaña "Árbol": grafo posicionado estilo Flare —una columna por rama (Guerrero/Cazador/
// Mago), nodos enmarcados unidos por líneas que se encienden al desbloquearse, y una tira de
// detalle abajo con el nodo elegido (efecto, rango, requisito y botón de mejora).
function TreeTab({ stats, skillRanks, rankSkill, respec, respecCost, t }) {
  const s = stats || {}
  const pts = Math.max(0, skillEarned(s.level || 1) - skillSpent(skillRanks))
  const byBranch = BRANCHES.map((br) => NODES.filter((n) => n.branch === br.id))
  const [sel, setSel] = useState(NODES[0].id)
  const selNode = NODES.find((n) => n.id === sel) || NODES[0]
  const selRank = skillRanks[selNode.id] || 0
  const selAttr = s[selNode.attr] || 0
  const selLocked = selAttr < selNode.req
  const selMaxed = selRank >= selNode.max
  const selCanRank = !selLocked && !selMaxed && pts > 0

  // Centros de nodo (en escala 0..100) para dibujar las líneas conectoras.
  const center = (ci, ri) => ({ x: COL_X(ci), y: ROW_Y(ri) })

  return (
    <div className="tree-body">
      <div className="tree-head">
        <span className="tree-pts">{t('skill_points_n', { n: pts })}</span>
        <button className="tree-respec" onClick={respec}>{t('respec_cost', { n: respecCost })}</button>
      </div>

      <div className="tree-graph">
        {/* líneas conectoras: espina de cada rama (se encienden si el nodo inferior está desbloqueado) */}
        <svg className="tree-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {byBranch.map((nodes, ci) =>
            nodes.slice(1).map((n, k) => {
              const a = center(ci, k), b = center(ci, k + 1)
              const lit = (s[n.attr] || 0) >= n.req
              return <line key={n.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                           className={'tree-link' + (lit ? ' lit' : '')} vectorEffect="non-scaling-stroke" />
            }),
          )}
        </svg>

        {/* encabezado de rama (arriba de cada columna) */}
        {BRANCHES.map((br, ci) => (
          <div key={br.id} className="tree-col-h" style={{ left: COL_X(ci) + '%' }}>
            <span className="tree-col-ic"><ItemIcon icon={br.icon} size={22} /></span>
            <em>{t('abbr_' + br.attr)} {s[br.attr] || 0}</em>
          </div>
        ))}

        {/* nodos enmarcados */}
        {byBranch.map((nodes, ci) =>
          nodes.map((n, ri) => {
            const rank = skillRanks[n.id] || 0
            const maxed = rank >= n.max
            const locked = (s[n.attr] || 0) < n.req
            const p = center(ci, ri)
            return (
              <button key={n.id}
                      className={'tree-slot' + (locked ? ' locked' : '') + (maxed ? ' maxed' : '') + (rank > 0 && !maxed ? ' ranked' : '') + (sel === n.id ? ' sel' : '')}
                      style={{ left: p.x + '%', top: p.y + '%', backgroundImage: `url(${UISLOT})` }}
                      onClick={() => setSel(n.id)} title={t('node_' + n.id)}>
                <span className="tree-slot-ic"><ItemIcon icon={n.icon} size={30} /></span>
                {rank > 0 && <span className="tree-slot-rank">{rank}</span>}
                {locked && <LockIcon />}
              </button>
            )
          }),
        )}
      </div>

      {/* tira de detalle del nodo elegido */}
      <div className="tree-detail">
        <div className="tree-detail-head">
          <b>{t('node_' + selNode.id)}</b>
          <span className="tree-node-rank">
            {Array.from({ length: selNode.max }).map((_, i) => (
              <i key={i} className={i < selRank ? 'on' : ''} />
            ))}
          </span>
        </div>
        <div className="tree-detail-desc">{t('noded_' + selNode.id)}</div>
        <div className="tree-detail-foot">
          {selLocked
            ? <span className="tree-detail-req">{t('node_req_short', { attr: t('abbr_' + selNode.attr), n: selNode.req })}</span>
            : <span className="tree-detail-rankn">{selRank}/{selNode.max}</span>}
          <button className="tree-detail-btn" disabled={!selCanRank} onClick={() => rankSkill(selNode.id)}>
            {selMaxed ? t('forge_maxed') : '＋ ' + t('forge_upgrade')}
          </button>
        </div>
      </div>
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
