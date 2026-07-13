// Cinturón de acción compuesto con piezas reales de Flare (Demonic UI). En vez de una sola
// imagen con huecos negros inutilizables, mostramos sólo lo que SÍ existe: los 4 slots de
// consumibles (con la textura real de Flare) y el oro. Cada slot es un elemento real.
// Los botones de menú van aparte (MenuRow), para que en móvil no los tapen los globos.
import { useState, useEffect, useRef } from 'react'
import ItemIcon from './ItemIcon.jsx'
import { useGameStore } from '../store.js'
import { unlockedAbilities } from '../data/abilities.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

// Indicador de potencias temporales activas (Vigor): ícono + segundos restantes.
export function BuffBar() {
  const activeBuffs = useGameStore((s) => s.activeBuffs)
  const t = useT()
  const [, tick] = useState(0)
  const timer = useRef()
  useEffect(() => {
    if (!activeBuffs || !activeBuffs.length) return
    let alive = true
    const loop = () => { if (!alive) return; tick((n) => n + 1); timer.current = setTimeout(loop, 200) }
    loop()
    return () => { alive = false; clearTimeout(timer.current) }
  }, [activeBuffs])
  const now = Date.now()
  const live = (activeBuffs || []).filter((b) => b.until > now)
  if (!live.length) return null
  return (
    <div className="buff-row">
      {live.map((b) => (
        <div key={b.id} className="buff-chip" title={t('ab_' + b.id)}>
          <span className="buff-ic">{b.icon}</span>
          <span className="buff-sec">{Math.ceil((b.until - now) / 1000)}s</span>
        </div>
      ))}
    </div>
  )
}

// Barra de habilidades activas: botones redondos con la habilidad desbloqueada (por atributo),
// su costo de maná y el barrido de recarga. Tocar una pide al loop que la lance sobre el objetivo.
export function AbilityBar() {
  const stats = useGameStore((s) => s.stats)
  const abilityCd = useGameStore((s) => s.abilityCd)
  const requestCast = useGameStore((s) => s.requestCast)
  const t = useT()
  const abils = unlockedAbilities(stats)
  const [, tick] = useState(0)
  const timer = useRef()

  // Barrido de recarga: re-render ~10fps mientras alguna habilidad esté en recarga.
  useEffect(() => {
    const anyCd = Object.values(abilityCd || {}).some((end) => end > Date.now())
    if (!anyCd) return
    let alive = true
    const loop = () => { if (!alive) return; tick((n) => n + 1); timer.current = setTimeout(loop, 100) }
    loop()
    return () => { alive = false; clearTimeout(timer.current) }
  }, [abilityCd])

  if (!abils.length) return null
  const mp = stats?.mp || 0
  const now = Date.now()
  return (
    <div className="ability-row">
      {abils.map((a) => {
        const end = abilityCd?.[a.id] || 0
        const remain = Math.max(0, end - now)
        const frac = remain > 0 ? Math.min(1, remain / (a.cd * 1000)) : 0
        const noMana = mp < a.mp
        return (
          <button key={a.id} className={'abil-btn' + (noMana ? ' nomana' : '')} disabled={remain > 0}
                  onClick={() => requestCast(a.id)}
                  title={`${t('ab_' + a.id)} · ${a.mp} ${t('stat_mp')}`}>
            <span className="abil-ic">{a.icon}</span>
            <span className="abil-mp">{a.mp}</span>
            {remain > 0 && <span className="abil-cd" style={{ height: `${Math.round(frac * 100)}%` }} />}
            {remain > 0 && <span className="abil-cd-txt">{Math.ceil(remain / 1000)}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function ActionBar({ belt, gold, onUseBelt, beltCap = 4 }) {
  const t = useT()
  return (
    <div className="actionbar">
      <div className="ab-belt">
        {belt.map((it, i) => {
          const locked = i >= beltCap
          return (
            <div key={i} className={'ab-cell' + (it && !locked ? ' usable' : '') + (locked ? ' locked' : '')}
                 style={{ backgroundImage: `url(${UI}slot_empty.png)` }}
                 title={locked ? t('bigger_belt') : undefined}
                 onClick={it && !locked ? () => onUseBelt?.(i) : undefined}>
              {it && !locked && <ItemIcon icon={it.icon} fill count={it.count} />}
              {locked && <span className="ab-lock">🔒</span>}
            </div>
          )
        })}
      </div>
      <div className="ab-gold" title={t('gold_word')}>
        <span className="ab-coin" />
        <b>{gold}</b>
      </div>
    </div>
  )
}

// Fila de botones de menú (personaje / inventario / acciones / ajustes) con los íconos
// grabados de la action bar de Flare. Va arriba de la barra, centrada.
const MENU = [
  { icon: 'btn_char', panel: 'character' },
  { icon: 'btn_inv', panel: 'inventory' },
  { icon: 'btn_pow', panel: 'powers' },
  { icon: 'btn_log', panel: 'settings' },
]

export function MenuRow({ onPanel }) {
  const t = useT()
  return (
    <div className="menu-row">
      {MENU.map((m) => (
        <button key={m.panel} className="ab-btn" title={t(m.panel)}
                style={{ backgroundImage: `url(${UI}${m.icon}.png)` }}
                onClick={() => onPanel(m.panel)} />
      ))}
    </div>
  )
}

// --- Barra completa de Flare (Demonic UI) para ESCRITORIO ---------------------------
// El marco real actionbar_trim.png (1280×70) en UNA sola fila, con los slots texturizados
// dibujados encima (el marco trae la zona como bloque; le ponemos slot_empty para que se
// vea como la Demonic UI original). 10 slots de acción (los primeros 4 = cinturón) + 2
// slots M1/M2 + los 4 botones de menú grabados. Los slots vacíos se llenan con combate.
const AW = 1280
const pc = (x) => (x / AW * 100) + '%'
const HOT_CX = [96, 160, 224, 288, 352, 416, 480, 544, 608, 672] // 10 slots de acción
const M_CX = [800, 864]                                           // M1 / M2 (mano/mano sec.)
const MENU_CX = [
  { cx: 992, panel: 'character' },
  { cx: 1056, panel: 'inventory' },
  { cx: 1120, panel: 'powers' },
  { cx: 1184, panel: 'settings' },
]

export function DesktopBar({ belt, onPanel, onUseBelt, beltCap = 4 }) {
  const t = useT()
  return (
    <div className="desktop-bar" style={{ backgroundImage: `url(${UI}actionbar_trim.png)` }}>
      {HOT_CX.map((cx, i) => {
        const it = belt[i]
        // sólo los primeros `beltCap` slots del hotbar son del cinturón; el resto quedan
        // como slots vacíos de la barra (futuros poderes), no bloqueados con candado.
        const isBelt = i < 4
        const locked = isBelt && i >= beltCap
        return (
          <div key={'h' + i} className={'db-slot' + (it && !locked ? ' usable' : '') + (locked ? ' locked' : '')}
               style={{ left: pc(cx), backgroundImage: `url(${UI}slot_empty.png)` }}
               title={locked ? t('bigger_belt') : undefined}
               onClick={it && !locked ? () => onUseBelt?.(i) : undefined}>
            {it && !locked && <ItemIcon icon={it.icon} fill count={it.count} />}
            {locked && <span className="ab-lock">🔒</span>}
          </div>
        )
      })}
      {M_CX.map((cx, i) => (
        <div key={'m' + i} className="db-slot" style={{ left: pc(cx), backgroundImage: `url(${UI}slot_empty.png)` }} />
      ))}
      {MENU_CX.map((m) => (
        <button key={m.panel} className="db-menu" style={{ left: pc(m.cx) }}
                title={t(m.panel)} onClick={() => onPanel(m.panel)} />
      ))}
    </div>
  )
}
