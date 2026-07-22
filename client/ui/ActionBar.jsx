// Cinturón de acción compuesto con piezas reales de Flare (Demonic UI). En vez de una sola
// imagen con huecos negros inutilizables, mostramos sólo lo que SÍ existe: los 4 slots de
// consumibles (con la textura real de Flare) y el oro. Cada slot es un elemento real.
// Los botones de menú van aparte (MenuRow), para que en móvil no los tapen los globos.
import { useState, useEffect, useRef } from 'react'
import ItemIcon from './ItemIcon.jsx'
import { useGameStore } from '../store.js'
import { ABILITY_BY_ID } from '../data/abilities.js'
import { Lock, Fist, Gear } from './Icon.jsx'
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

// Slot del mouse (estilo Flare): M1 = ataque normal (clic izq., muestra el arma equipada) y
// M2 = habilidad especial (clic der., configurable). El M2 se puede tocar para lanzarlo (móvil)
// y tiene un engranaje para elegir qué habilidad va ahí. Muestra el barrido de recarga.
export function MouseSlot({ which, className = '', style }) {
  const equipment = useGameStore((s) => s.equipment)
  const special = useGameStore((s) => s.specialAbility)
  const abilityCd = useGameStore((s) => s.abilityCd)
  const requestCast = useGameStore((s) => s.requestCast)
  const openMouseBind = useGameStore((s) => s.openMouseBind)
  const t = useT()
  const [, tick] = useState(0)
  const timer = useRef()
  const isM2 = which === 'm2'
  const ab = isM2 && special ? ABILITY_BY_ID[special] : null
  // Suscribir al BOOLEANO derivado (¿sin maná?), no al objeto stats entero: así la regen de maná
  // (que reescribe stats cada tick) sólo re-renderiza este botón cuando el estado realmente cambia,
  // no en cada tick. (El selector debe ir antes del early-return de M1 por las reglas de hooks.)
  const noMana = useGameStore((s) => (ab ? (s.stats?.mp || 0) < ab.mp : false))

  // Barrido de recarga del M2 mientras su habilidad esté en recarga.
  useEffect(() => {
    if (!ab) return
    if ((abilityCd?.[ab.id] || 0) <= Date.now()) return
    let alive = true
    const loop = () => { if (!alive) return; tick((n) => n + 1); timer.current = setTimeout(loop, 100) }
    loop()
    return () => { alive = false; clearTimeout(timer.current) }
  }, [ab, abilityCd])

  const bg = { backgroundImage: `url(${UI}slot_empty.png)`, ...style }

  if (!isM2) {
    const wIcon = equipment?.main?.icon
    return (
      <button className={'mouse-slot m1 ' + className} style={bg} title={t('m1_normal')}>
        {wIcon != null ? <ItemIcon icon={wIcon} fill /> : <span className="mouse-fist"><Fist /></span>}
        <span className="mouse-tag">M1</span>
      </button>
    )
  }

  const end = ab ? (abilityCd?.[ab.id] || 0) : 0
  const remain = Math.max(0, end - Date.now())
  const frac = ab && remain > 0 ? Math.min(1, remain / (ab.cd * 1000)) : 0
  return (
    <button className={'mouse-slot m2 ' + className + (noMana ? ' nomana' : '')} style={bg}
            title={ab ? t('ab_' + ab.id) : t('bind_special')}
            onClick={() => (ab ? requestCast(ab.id) : openMouseBind())}>
      {ab ? <ItemIcon icon={ab.icon} fill /> : <span className="mouse-plus">＋</span>}
      <span className="mouse-tag">M2</span>
      {ab && remain > 0 && <span className="mouse-cd" style={{ height: `${Math.round(frac * 100)}%` }} />}
      {ab && remain > 0 && <span className="mouse-cd-txt">{Math.ceil(remain / 1000)}</span>}
      <span className="mouse-gear" onClick={(e) => { e.stopPropagation(); openMouseBind() }} title={t('bind_special')}><Gear /></span>
    </button>
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
              {locked && <span className="ab-lock"><Lock /></span>}
            </div>
          )
        })}
      </div>
      <div className="ab-mouse">
        {/* En móvil, tocar la pantalla ya es el ataque normal (M1); acá va sólo el especial (M2). */}
        <MouseSlot which="m2" className="mouse-mobile" />
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
            {locked && <span className="ab-lock"><Lock /></span>}
          </div>
        )
      })}
      <MouseSlot which="m1" className="mouse-desktop" style={{ left: pc(M_CX[0]) }} />
      <MouseSlot which="m2" className="mouse-desktop" style={{ left: pc(M_CX[1]) }} />
      {MENU_CX.map((m) => (
        <button key={m.panel} className="db-menu" style={{ left: pc(m.cx) }}
                title={t(m.panel)} onClick={() => onPanel(m.panel)} />
      ))}
    </div>
  )
}
