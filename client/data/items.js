// Acceso a los 552 ítems reales de Flare (shared/items.json, generado por
// tools/convert_items.py). Vite bundlea el JSON en tiempo de build.
import data from '../../shared/items.json'

export const ITEMS = data.items

const byId = new Map(ITEMS.map((i) => [i.id, i]))
export const itemById = (id) => byId.get(id)
export const itemsBySlot = (slot) => ITEMS.filter((i) => i.slot === slot)
export const itemByGfx = (gfx) => ITEMS.find((i) => i.gfx === gfx)

// Colores de borde por rareza (para el inventario).
export const RARITY_COLOR = {
  comun: '#8b8194',
  fino: '#4f9d6b',
  encantado: '#3a63c4',
  legendario: '#c9a227',
  unico: '#c2551f',
}
export const RARITY_LABEL = {
  comun: 'Común',
  fino: 'Fino',
  encantado: 'Encantado',
  legendario: 'Legendario',
  unico: 'Único',
}
