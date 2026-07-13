// Ícono de ítem recortado del atlas icons.png (8 columnas, 32px por celda escalada).
// `count` muestra el tamaño de pila (consumibles/materiales) en la esquina.
const BASE = import.meta.env.BASE_URL || '/'
const COLS = 8
const CELL = 32

// Atlas combinado: 8 columnas × 65 filas (256×2080). Incluye el set base (0-255), el set
// empyrean (256-263) y el de crafting/materiales (512-519) en sus índices reales de Flare.
const ROWS = 65

export default function ItemIcon({ icon, size = 34, count, fill = false }) {
  const col = icon % COLS
  const row = Math.floor(icon / COLS)
  // `fill`: llena el contenedor (para slots que escalan con la UI); si no, tamaño en px.
  const style = fill
    ? {
        position: 'absolute', inset: '9%',
        backgroundImage: `url(${BASE}assets/icons.png)`,
        backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`,
      }
    : {
        width: size, height: size,
        backgroundImage: `url(${BASE}assets/icons.png)`,
        backgroundSize: `${COLS * CELL * (size / CELL)}px auto`,
        backgroundPosition: `-${col * CELL * (size / CELL)}px -${row * CELL * (size / CELL)}px`,
      }
  return (
    <span className="item-icon" style={style}>
      {count > 1 && <b className="item-count">{count}</b>}
    </span>
  )
}
