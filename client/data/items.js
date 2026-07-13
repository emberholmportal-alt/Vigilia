// Acceso a los 552 ítems reales de Flare (shared/items.json, generado por
// tools/convert_items.py). Vite bundlea el JSON en tiempo de build.
import data from '../../shared/items.json'

// Cinturones (ítems NUESTROS, no de Flare): a más caro, más slots de consumibles (Diablo).
export const BELTS = [
  { id: 90001, name: 'Cinturón de cuero', slot: 'belt', beltSlots: 2, price: 60, icon: 32, rarity: 'comun', tier: 1, stats: {} },
  { id: 90002, name: 'Cinturón reforzado', slot: 'belt', beltSlots: 3, price: 240, icon: 33, rarity: 'fino', tier: 3, stats: {} },
  { id: 90003, name: 'Cinturón de guerra', slot: 'belt', beltSlots: 4, price: 700, icon: 34, rarity: 'encantado', tier: 6, stats: {} },
]

export const ITEMS = data.items.concat(BELTS)

const byId = new Map(ITEMS.map((i) => [i.id, i]))

// Durabilidad: sólo el equipo de armadura/arma se gasta en combate.
const DURABLE_SLOTS = new Set(['head', 'chest', 'legs', 'hands', 'feet', 'off', 'main'])
export const isDurable = (it) => !!it && DURABLE_SLOTS.has(it.slot)
export const durabilityMax = (it) => (isDurable(it) ? 40 + (it.tier || 1) * 8 : 0)
export const isBroken = (it) => isDurable(it) && it.dur != null && it.dur <= 0
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
