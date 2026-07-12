// Slot con el marco de Flare (slot_empty / slot_selected). Se usa en el cinturón,
// el inventario y el equipo. Muestra el ícono del ítem y colorea el borde por rareza.
import ItemIcon from './ItemIcon.jsx'
import { RARITY_COLOR } from '../data/items.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function Slot({ item, size = 46, selected, label, onClick, iconScale = 0.82 }) {
  const bg = selected ? 'slot_selected.png' : 'slot_empty.png'
  return (
    <button
      className="fslot"
      style={{
        width: size, height: size,
        backgroundImage: `url(${UI}${bg})`,
        boxShadow: item ? `inset 0 0 0 1px ${RARITY_COLOR[item.rarity] || 'transparent'}` : 'none',
      }}
      onClick={onClick}
    >
      {item ? <ItemIcon icon={item.icon} size={Math.round(size * iconScale)} />
        : label ? <em className="fslot-label">{label}</em> : null}
    </button>
  )
}
