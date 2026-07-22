// Stock del Mercader. Ítems REALES de Flare, con una rotación diaria determinística
// (mismo día -> mismo stock, como el mercader de Kintara). Nada inventado.
import { ITEMS, BELTS, RECALL_STONE, itemById } from './items.js'

// Botella Vacía: envase base de toda receta de alquimia. Siempre en stock (barata).
const EMPTY_BOTTLE = itemById(750)

// Ítems EXCLUSIVOS de la alquimista (la bruja): sólo ella los vende. El mercader Nix NO.
// Poción de vida (2), Poción de maná (3), Pergamino de Retorno (papiro portal, RECALL_STONE).
const ALCHEMIST_IDS = new Set([2, 3, RECALL_STONE.id])
export function alchemistStock() {
  return [itemById(2), itemById(3), RECALL_STONE].filter(Boolean)
}

// Slots que el mercader ofrece/compra (equipo + consumibles + cinturones).
const SELLABLE = new Set(['head', 'chest', 'legs', 'hands', 'feet', 'main', 'off', 'ring', 'artifact', 'potion', 'scroll', 'belt'])

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD (día del servidor a futuro)
}

// Mercado del día: MISMO catálogo para todos los jugadores (barajado determinístico por la
// fecha, como el "mercado global" de un MMO). Rota cada día. Sin límite de stock: todos ven y
// pueden comprar los mismos ítems (el límite por-usuario no tenía sentido sin servidor).
export function dailyStock(dateStr = todayStr()) {
  const rng = mulberry32(hashStr('vigilia-' + dateStr))
  // El mercader Nix NO vende pociones ni el Pergamino de Retorno (eso lo vende sólo la bruja).
  const pool = ITEMS.filter((it) => (it.price || 0) > 0 && it.slot && SELLABLE.has(it.slot)
    && it.slot !== 'potion' && !ALCHEMIST_IDS.has(it.id))

  const gear = pool.filter((it) => (it.tier || 1) <= 10)
  for (let i = gear.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[gear[i], gear[j]] = [gear[j], gear[i]]
  }

  const seen = new Set()
  // Cinturones y Botellas Vacías siempre disponibles (utilidad básica). SIN Piedra de Retorno.
  const staples = [...(EMPTY_BOTTLE ? [EMPTY_BOTTLE] : []), ...BELTS]
  // Catálogo amplio para dar variedad al mercado compartido.
  return [...staples, ...gear.slice(0, 32)].filter((it) => !seen.has(it.id) && seen.add(it.id)).slice(0, 36)
}
