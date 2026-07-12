// Barra de acción estilo Flare/Diablo: usa el frame real (actionbar_trim.png, 1280×70)
// que ya trae los 4 botones de menú grabados (personaje/inventario/poderes/registro).
// Encima ponemos el cinturón (consumibles) en los primeros slots y hotspots sobre los
// íconos de menú. Un solo elemento prolijo, como la imagen de referencia.
import ItemIcon from './ItemIcon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const AW = 1280

// Centros (en px del frame de 1280) de los primeros 4 slots (cinturón).
const BELT_CX = [96, 160, 224, 288]
// Centros de los 4 botones de menú grabados + a qué panel abren.
const MENU = [
  { cx: 992, panel: 'character', title: 'Personaje' },
  { cx: 1056, panel: 'inventory', title: 'Inventario', gold: true },
  { cx: 1120, panel: 'powers', title: 'Acciones' },
  { cx: 1184, panel: 'settings', title: 'Configuración' },
]
const pc = (x) => (x / AW * 100) + '%'

export default function ActionBar({ belt, gold, onPanel }) {
  return (
    <div className="actionbar" style={{ backgroundImage: `url(${UI}actionbar_trim.png)` }}>
      {belt.map((it, i) => (
        <div key={i} className="ab-slot" style={{ left: pc(BELT_CX[i]) }}>
          {it && <ItemIcon icon={it.icon} fill count={it.count} />}
        </div>
      ))}
      {MENU.map((m) => (
        <button key={m.panel} className="ab-menu" style={{ left: pc(m.cx) }}
                title={m.title} onClick={() => onPanel(m.panel)}>
          {m.gold && <u>{gold}</u>}
        </button>
      ))}
    </div>
  )
}
