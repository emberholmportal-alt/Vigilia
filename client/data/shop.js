// Stock del Mercader. Ítems REALES de Flare, con una rotación diaria determinística
// (mismo día -> mismo stock, como el mercader de Kintara). Nada inventado.
import { ITEMS, BELTS, RECALL_STONE } from './items.js'

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

// Devuelve ~24 ítems reales para vender hoy: siempre unas pociones + equipo de tier bajo/medio,
// barajado de forma estable por la fecha.
export function dailyStock(dateStr = todayStr()) {
  const rng = mulberry32(hashStr('vigilia-' + dateStr))
  const pool = ITEMS.filter((it) => (it.price || 0) > 0 && it.slot && SELLABLE.has(it.slot))

  const potions = pool.filter((it) => it.slot === 'potion').slice(0, 3)

  const gear = pool.filter((it) => it.slot !== 'potion' && (it.tier || 1) <= 8)
  for (let i = gear.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[gear[i], gear[j]] = [gear[j], gear[i]]
  }

  const seen = new Set()
  // Cinturones y Piedras de Retorno siempre disponibles (utilidad básica de viaje).
  const list = [...potions, RECALL_STONE, ...BELTS, ...gear.slice(0, 20)].filter((it) => !seen.has(it.id) && seen.add(it.id)).slice(0, 26)
  // Stock limitado por día (determinístico por fecha+ítem). Las pociones y piedras traen más.
  return list.map((it) => {
    const base = it.slot === 'potion' ? 5 : it.recall ? 4 : 1
    const extra = hashStr(dateStr + ':' + it.id) % 4 // 0..3
    return { ...it, stock: base + extra }
  })
}
