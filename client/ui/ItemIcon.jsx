// Ícono de ítem recortado del atlas icons.png (8 columnas, 32px por celda escalada).
const BASE = import.meta.env.BASE_URL || '/'
const COLS = 8
const CELL = 32

export default function ItemIcon({ icon, size = 34 }) {
  const col = icon % COLS
  const row = Math.floor(icon / COLS)
  const k = size / CELL
  return (
    <span
      className="item-icon"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${BASE}assets/icons.png)`,
        backgroundSize: `${COLS * CELL * k}px auto`,
        backgroundPosition: `-${col * CELL * k}px -${row * CELL * k}px`,
      }}
    />
  )
}
