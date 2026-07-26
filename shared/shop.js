// Catálogo de vendedores COMPARTIDO (cliente + servidor). El servidor lo usa para VALIDAR las
// compras: sin esto, el handler `buy` aceptaba cualquiera de los 507 ítems con precio (incluidos
// legendarios tier 11-16) al precio base, salteando la vitrina. La rotación diaria del mercader
// (client/data/shop.js) elige 36 de este universo; para validar alcanza con el universo elegible
// (no hace falta reproducir el shuffle del día, así no hay drift cliente/servidor).
import { itemById, RECALL_STONE } from './items.js'

// Slots que un vendedor puede ofrecer (equipo + consumibles + cinturones).
const SELLABLE = new Set(['head', 'chest', 'legs', 'hands', 'feet', 'main', 'off', 'ring', 'artifact', 'potion', 'scroll', 'belt'])
// Exclusivos de la bruja: Poción de vida (2), de maná (3), Pergamino de Retorno.
const ALCHEMIST_IDS = new Set([2, 3, RECALL_STONE.id])
const EMPTY_BOTTLE_ID = 750   // botella vacía: base de alquimia, staple del mercader

// ¿Algún vendedor (mercader o bruja) ofrece este ítem? Cierra "comprar cualquier ítem al precio base".
//   · Bruja: pociones de vida/maná + pergamino de retorno.
//   · Mercader: cinturones + botella vacía (staples) y EQUIPO de tier ≤ 10 (nunca legendarios 11-16).
export function isVendorItem(id) {
  const it = itemById(id)
  if (!it || (it.price || 0) <= 0) return false
  if (ALCHEMIST_IDS.has(it.id)) return true
  if (it.slot === 'belt' || it.id === EMPTY_BOTTLE_ID) return true
  if (it.slot === 'potion') return false               // otras pociones no las vende nadie
  return SELLABLE.has(it.slot) && (it.tier || 1) <= 10
}
