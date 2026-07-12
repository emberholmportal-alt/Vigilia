// Barra de acción compacta y prolija: correr/stamina + chat + cinturón (consumibles) +
// los 4 botones de menú (con los íconos grabados de Flare). Sin slots vacíos de relleno
// (los hotkeys de poderes llegan con el combate). Un solo bloque centrado.
import Bar from './Bar.jsx'
import ItemIcon from './ItemIcon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const SLOT = `url(${UI}slot_empty.png)`
const MENU = [
  { icon: 'menu_char.png', panel: 'character', title: 'Personaje' },
  { icon: 'menu_powers.png', panel: 'powers', title: 'Acciones' },
  { icon: 'menu_inv.png', panel: 'inventory', title: 'Inventario', gold: true },
]

export default function ActionBar({ belt, gold, running, stamina, staminaMax, onToggleRun, onChat, onPanel }) {
  return (
    <div className="actionbar">
      <button className={'ab-run' + (running ? ' on' : '')} onClick={onToggleRun} title="Caminar/correr">
        {running ? '🏃' : '🚶'}
        <Bar type="xp" value={stamina} max={staminaMax} width={50} />
      </button>
      <button className="ab-icon" onClick={onChat} title="Chat">💬</button>

      <div className="ab-belt">
        {belt.map((it, i) => (
          <div key={i} className="ab-cell" style={{ backgroundImage: SLOT }}>
            {it && <ItemIcon icon={it.icon} fill count={it.count} />}
          </div>
        ))}
      </div>

      <div className="ab-menu">
        {MENU.map((m) => (
          <button key={m.panel} className="ab-mbtn" title={m.title}
                  style={{ backgroundImage: `url(${UI}${m.icon})` }} onClick={() => onPanel(m.panel)}>
            {m.gold && <u>{gold}</u>}
          </button>
        ))}
        <button className="ab-icon" onClick={() => onPanel('settings')} title="Configuración">⚙️</button>
      </div>
    </div>
  )
}
