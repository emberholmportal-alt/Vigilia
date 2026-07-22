// Kit inicial CANÓNICO por raza, COMPARTIDO (cliente + servidor). El server lo asigna de forma
// AUTORITATIVA al crear el personaje, así un blob de creación manipulado no puede darse oro/equipo
// falso (el cliente no decide con qué arrancás). Debe coincidir con lo que muestra el cliente.
import { itemByGfx, itemsBySlot, RECALL_STONE } from './items.js'

export const STARTING_GOLD = 200

// Equipo inicial por raza (capa de paperdoll = gfx). Espeja RACES[].kit de client/data/characters.js.
const KIT = {
  humano: { chest: 'leather_chest', main: 'longsword', off: 'buckler' },
  elfo: { chest: 'mage_vest', main: 'wand' },
  enano: { chest: 'chain_cuirass', main: 'smith_hammer', off: 'shield' },
  orco: { chest: 'leather_chest', main: 'infantry_axe' },
}
// Un extra afín a la raza en el inventario inicial (NADA de un arsenal).
const STARTER_EXTRA = { humano: 'iron_buckler', elfo: 'staff', enano: 'chain_coif', orco: 'infantry_axe' }

// Kit inicial completo: { gold, equipment{slot:item}, inventory[items], belt[items|null] }.
export function startingKit(raceId) {
  const kit = KIT[raceId] || KIT.humano
  const equipment = {}
  const usedIds = new Set()
  for (const [slot, gfx] of Object.entries(kit)) { const it = itemByGfx(gfx); if (it) { equipment[slot] = it; usedIds.add(it.id) } }
  const inventory = []
  const extra = itemByGfx(STARTER_EXTRA[raceId])
  if (extra && !usedIds.has(extra.id)) { inventory.push(extra); usedIds.add(extra.id) }
  inventory.push({ ...RECALL_STONE, count: 1 })
  const potions = itemsBySlot('potion')
  const health = potions.find((p) => /health|vida/i.test((p.name_en || '') + (p.name || '')))
  const mana = potions.find((p) => /mana|maná/i.test((p.name_en || '') + (p.name || '')))
  const belt = [health ? { ...health, count: 3 } : null, mana ? { ...mana, count: 3 } : null, null, null]
  return { gold: STARTING_GOLD, equipment, inventory, belt }
}

// Ledger "checkout" inicial: los ítems que arrancan FUERA del bag (equipo + cinturón). Semilla
// AUTORITATIVA del ledger al crear (el inventario inicial va al bag, no al ledger).
export function startingLedger(raceId) {
  const { equipment, belt } = startingKit(raceId)
  const led = {}
  for (const it of Object.values(equipment)) if (it && it.id) led[it.id] = (led[it.id] || 0) + 1
  for (const b of belt) if (b && b.id) led[b.id] = (led[b.id] || 0) + (b.count || 1)
  return led
}
