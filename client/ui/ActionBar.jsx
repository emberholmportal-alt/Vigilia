// Cinturón de acción compuesto con piezas reales de Flare (Demonic UI). En vez de una sola
// imagen con huecos negros inutilizables, mostramos sólo lo que SÍ existe: los 4 slots de
// consumibles (con la textura real de Flare) y el oro. Cada slot es un elemento real.
// Los botones de menú van aparte (MenuRow), para que en móvil no los tapen los globos.
import ItemIcon from './ItemIcon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function ActionBar({ belt, gold, onUseBelt, beltCap = 4 }) {
  return (
    <div className="actionbar">
      <div className="ab-belt">
        {belt.map((it, i) => {
          const locked = i >= beltCap
          return (
            <div key={i} className={'ab-cell' + (it && !locked ? ' usable' : '') + (locked ? ' locked' : '')}
                 style={{ backgroundImage: `url(${UI}slot_empty.png)` }}
                 title={locked ? 'Comprá un cinturón más grande' : undefined}
                 onClick={it && !locked ? () => onUseBelt?.(i) : undefined}>
              {it && !locked && <ItemIcon icon={it.icon} fill count={it.count} />}
              {locked && <span className="ab-lock">🔒</span>}
            </div>
          )
        })}
      </div>
      <div className="ab-gold" title="Oro">
        <span className="ab-coin" />
        <b>{gold}</b>
      </div>
    </div>
  )
}

// Fila de botones de menú (personaje / inventario / acciones / ajustes) con los íconos
// grabados de la action bar de Flare. Va arriba de la barra, centrada.
const MENU = [
  { icon: 'btn_char', panel: 'character', title: 'Personaje' },
  { icon: 'btn_inv', panel: 'inventory', title: 'Inventario' },
  { icon: 'btn_pow', panel: 'powers', title: 'Acciones' },
  { icon: 'btn_log', panel: 'settings', title: 'Ajustes' },
]

export function MenuRow({ onPanel }) {
  return (
    <div className="menu-row">
      {MENU.map((m) => (
        <button key={m.panel} className="ab-btn" title={m.title}
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
  { cx: 992, panel: 'character', title: 'Personaje' },
  { cx: 1056, panel: 'inventory', title: 'Inventario' },
  { cx: 1120, panel: 'powers', title: 'Acciones' },
  { cx: 1184, panel: 'settings', title: 'Ajustes' },
]

export function DesktopBar({ belt, onPanel, onUseBelt, beltCap = 4 }) {
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
               title={locked ? 'Comprá un cinturón más grande' : undefined}
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
                title={m.title} onClick={() => onPanel(m.panel)} />
      ))}
    </div>
  )
}
