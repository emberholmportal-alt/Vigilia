// Sistema de drop de enemigos estilo Diablo: casi siempre cae algo (oro y/o ítems), con la
// rareza tirada por dados y ponderada por la dificultad del enemigo y el "hallazgo" (item_find)
// del equipo. Usa los ítems REALES de Flare (rarezas: común / fino / legendario / único; cada
// una existe en tiers bajos, así que un enemigo de nivel 1 igual puede soltar algo raro).
import { ITEMS } from './items.js'

const EQUIP = new Set(['head', 'chest', 'legs', 'hands', 'feet', 'main', 'off', 'ring', 'artifact'])
const GEAR = ITEMS.filter((it) => EQUIP.has(it.slot))
const POTIONS = ITEMS.filter((it) => it.slot === 'potion')
const MATERIALS = ITEMS.filter((it) => it.slot === 'crafting' && (it.price || 0) > 0)

// Índice de equipo por rareza (para elegir rápido).
const BY_RARITY = {}
for (const it of GEAR) (BY_RARITY[it.rarity] ||= []).push(it)

const RARITY_ORDER = ['comun', 'fino', 'legendario', 'unico']

// Tira la rareza del ítem. Común domina; jefes, nivel alto y magic-find empujan hacia arriba.
function rollRarity(level, boss, mf, rng) {
  const lv = level * 0.6
  const b = boss ? 6 : 0
  const m = (mf || 0) / 100
  const w = {
    comun: 70,
    fino: 22 + lv + m * 20 + b,
    legendario: 6 + lv * 0.5 + m * 30 + b * 1.5,
    unico: 1 + lv * 0.15 + m * 40 + b * 0.8,
  }
  const total = RARITY_ORDER.reduce((a, k) => a + w[k], 0)
  let r = rng() * total
  for (const k of RARITY_ORDER) { r -= w[k]; if (r <= 0) return k }
  return 'comun'
}

// Elige una pieza de la rareza dada con tier acorde al nivel del enemigo (no soltar tier 16 a
// un duende). Si no hay en el rango, cae a las piezas de tier más bajo de esa rareza.
function pickGear(level, rarity, rng) {
  const cap = Math.min(16, level + 2)
  const pool = BY_RARITY[rarity] || []
  let ok = pool.filter((it) => (it.tier || 1) <= cap)
  if (!ok.length) {
    ok = pool.slice().sort((a, b) => (a.tier || 1) - (b.tier || 1)).slice(0, 4)
  }
  return ok.length ? ok[Math.floor(rng() * ok.length)] : null
}

// Devuelve { gold, drops:[{id,qty}] } para un enemigo. Generoso como Diablo: la mayoría suelta
// oro y con frecuencia un ítem; los jefes revientan en 3–5 piezas de mejor rareza.
export function rollMonsterDrop(level, boss = false, itemFind = 0, rng = Math.random) {
  level = Math.max(1, level | 0)
  const out = { gold: 0, drops: [] }

  // Oro: casi siempre.
  if (rng() < (boss ? 1 : 0.8)) {
    out.gold = Math.round(((boss ? 18 : 4) + level * (boss ? 9 : 3)) * (0.6 + rng() * 0.8))
  }

  // Cuántos ítems: normales 0–2 (casi siempre 1); jefes 3–5.
  let n
  if (boss) n = 3 + Math.floor(rng() * 3)
  else n = (rng() < 0.5 + level * 0.01 ? 1 : 0) + (rng() < 0.15 ? 1 : 0)

  for (let i = 0; i < n; i++) {
    // Diablo tira MUCHAS pociones/reactivos; ~1 de cada 4 drops es consumible.
    if (rng() < 0.26) {
      const pool = rng() < 0.6 ? POTIONS : MATERIALS
      const it = pool[Math.floor(rng() * pool.length)]
      if (it) out.drops.push({ id: it.id, qty: 1 })
    } else {
      const it = pickGear(level, rollRarity(level, boss, itemFind, rng), rng)
      if (it) out.drops.push({ id: it.id, qty: 1 })
    }
  }
  return out
}
