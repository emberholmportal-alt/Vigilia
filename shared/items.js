// Tabla de ítems + PRECIOS compartida entre cliente y servidor. El servidor la usa para computar
// el valor de venta / costo de compra de forma AUTORITATIVA (el cliente no puede inventar el oro).
// Los 552 ítems reales salen de items.json; los 4 ítems NUESTROS (cinturones + piedra de retorno)
// se definen acá y en client/data/items.js — son constantes estáticas; si cambia el precio de uno,
// hay que tocarlo en los dos lugares (bajo riesgo, son 4).
import data from './items.json' with { type: 'json' }

export const BELTS = [
  { id: 90001, name: 'Cinturón de cuero', slot: 'belt', beltSlots: 2, price: 60, icon: 32, rarity: 'comun', tier: 1, stats: {} },
  { id: 90002, name: 'Cinturón reforzado', slot: 'belt', beltSlots: 3, price: 240, icon: 33, rarity: 'fino', tier: 3, stats: {} },
  { id: 90003, name: 'Cinturón de guerra', slot: 'belt', beltSlots: 4, price: 700, icon: 34, rarity: 'encantado', tier: 6, stats: {} },
]
export const RECALL_STONE = { id: 90010, name: 'Pergamino de Retorno', slot: 'scroll', price: 45, icon: 79, rarity: 'fino', tier: 1, recall: true, stats: {} }

export const ITEMS = data.items.concat(BELTS, [RECALL_STONE])
const byId = new Map(ITEMS.map((i) => [i.id, i]))
export const itemById = (id) => byId.get(id)
// Helpers compartidos (los usa el server para armar el kit inicial autoritativo). Espejan los del cliente.
export const itemsBySlot = (slot) => ITEMS.filter((i) => i.slot === slot)
export const itemByGfx = (gfx) => ITEMS.find((i) => i.gfx === gfx)

// Precio base (compra al mercader) y valor de venta (25% del precio, igual que el cliente).
const SELL_RATIO = 0.25
export const priceOf = (id) => { const it = byId.get(id); return it ? (it.price || 0) : 0 }
export const sellValueOf = (id) => Math.max(1, Math.floor(priceOf(id) * SELL_RATIO))
