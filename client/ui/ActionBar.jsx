// Cinturón de acción compuesto con piezas reales de Flare (Demonic UI). En vez de una sola
// imagen con huecos negros inutilizables, mostramos sólo lo que SÍ existe: los 4 slots de
// consumibles (con la textura real de Flare) y el oro. Cada slot es un elemento real.
// Los botones de menú van aparte (MenuRow), para que en móvil no los tapen los globos.
import ItemIcon from './ItemIcon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function ActionBar({ belt, gold }) {
  return (
    <div className="actionbar">
      <div className="ab-belt">
        {belt.map((it, i) => (
          <div key={i} className="ab-cell" style={{ backgroundImage: `url(${UI}slot_empty.png)` }}>
            {it && <ItemIcon icon={it.icon} fill count={it.count} />}
          </div>
        ))}
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
