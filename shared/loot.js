// Roller de loot compartido (cliente hoy, servidor mañana). Función PURA: dado el
// nombre de una tabla y un RNG, devuelve el oro y los ítems que caen. Las tablas son
// las REALES de Flare (shared/loot.json, generado por tools/convert_loot.py).
//
// Regla 2 (el servidor manda): esta tirada es la autoridad. El cliente la ejecuta local
// en singleplayer; cuando llegue el servidor, corre allá y el cliente sólo pinta.
import data from './loot.json'

const TABLES = data.tables

// Normaliza "chest_level_2.txt" -> "chest_level_2".
function key(name) {
  return String(name || '').replace(/\.txt$/, '')
}

export function hasLootTable(name) {
  return !!TABLES[key(name)]
}

function rollQty(d, rng) {
  const lo = d.min ?? 1
  const hi = d.max ?? lo
  return lo + Math.floor(rng() * (hi - lo + 1))
}

// Tira una tabla. Cada línea es una tirada independiente por `chance` (0-100).
// Devuelve { gold, drops: [{ id, qty }] }.
export function rollLoot(name, rng = Math.random) {
  const t = TABLES[key(name)]
  if (!t) return { gold: 0, drops: [] }

  let gold = 0
  for (const c of t.currency) {
    if (rng() * 100 < c.chance) gold += rollQty(c, rng)
  }

  const drops = []
  for (const d of t.drops) {
    if (rng() * 100 < d.chance) {
      const qty = rollQty(d, rng)
      if (qty > 0) drops.push({ id: d.id, qty })
    }
  }
  return { gold, drops }
}
