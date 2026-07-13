// Razas y kit inicial. Los modificadores salen de docs/WORLD.md. El equipamiento
// inicial es distinto por raza (WORLD.md: "Diferenciá con equipamiento inicial
// distinto") y usa ítems REALES de Flare, elegidos por su capa de paperdoll (gfx).
import { itemByGfx, itemsBySlot, RECALL_STONE } from './items.js'

export const RACES = [
  {
    id: 'humano', name: 'Humano', name_en: 'Human', archetype: 'Vigilante', archetype_en: 'Watcher',
    fantasy: 'Aprende rápido, muere igual.', fantasy_en: 'Learns fast, dies all the same.',
    mods: { xp: 0.1 }, modText: '+10% XP', modText_en: '+10% XP',
    kit: { chest: 'leather_chest', legs: 'leather_pants', feet: 'leather_boots',
           hands: 'leather_gloves', head: 'leather_hood', main: 'longsword', off: 'buckler' },
  },
  {
    id: 'elfo', name: 'Elfo', name_en: 'Elf', archetype: 'Hechicero', archetype_en: 'Sorcerer',
    fantasy: 'Sangre arcana, huesos finos.', fantasy_en: 'Arcane blood, fine bones.',
    mods: { mana: 30, int: 3, hp: -10 }, modText: '+30 maná · +3 INT · −10 vida', modText_en: '+30 mana · +3 INT · −10 health',
    kit: { chest: 'mage_vest', legs: 'mage_skirt', feet: 'mage_boots',
           hands: 'mage_sleeves', head: 'mage_hood', main: 'wand' },
  },
  {
    id: 'enano', name: 'Enano', name_en: 'Dwarf', archetype: 'Guardián', archetype_en: 'Guardian',
    fantasy: 'Piel de piedra, paso corto.', fantasy_en: 'Stone skin, short stride.',
    mods: { hp: 40, vit: 3, speed: -0.1 }, modText: '+40 vida · +3 VIT · −10% velocidad', modText_en: '+40 health · +3 VIT · −10% speed',
    kit: { chest: 'chain_cuirass', legs: 'chain_greaves', feet: 'chain_boots',
           hands: 'chain_gloves', head: 'chain_coif', main: 'smith_hammer', off: 'shield' },
  },
  {
    id: 'orco', name: 'Orco', name_en: 'Orc', archetype: 'Bruto', archetype_en: 'Brute',
    fantasy: 'Furia. No mucho más.', fantasy_en: 'Fury. Not much else.',
    mods: { dmg: 0.25, str: 4, mana: -0.15 }, modText: '+25% daño · +4 FUE · −15% maná', modText_en: '+25% damage · +4 STR · −15% mana',
    kit: { chest: 'leather_chest', legs: 'leather_pants', feet: 'leather_boots',
           hands: 'leather_gloves', main: 'infantry_axe' },
  },
]

export const raceById = (id) => RACES.find((r) => r.id === id)

// Ítems variados (reales) que van al inventario para poder equipar y ver el paperdoll
// cambiar. Elegidos por gfx; los que no tengan ítem se ignoran.
// Un extra útil por raza en el inventario inicial (algo afín a su rol), NADA de un arsenal.
const STARTER_EXTRA = {
  humano: 'iron_buckler',   // guardia con escudo de repuesto
  elfo: 'staff',            // hechicero con un bastón alternativo
  enano: 'chain_coif',      // guardián con una pieza extra de malla
  orco: 'infantry_axe',     // bruto con un hacha de repuesto
}

// Arma el personaje inicial para una raza: equipo puesto + pocas cosas más + oro.
export function startingCharacter(raceId) {
  const race = raceById(raceId) || RACES[0]

  const equipment = {}
  const usedIds = new Set()
  for (const [slot, gfx] of Object.entries(race.kit)) {
    const it = itemByGfx(gfx)
    if (it) { equipment[slot] = it; usedIds.add(it.id) }
  }

  // Inventario mínimo: sólo UN extra afín a la raza + una Piedra de Retorno para aprender
  // el viaje. El resto se consigue jugando (loot, tienda, forja).
  const inventory = []
  const extra = itemByGfx(STARTER_EXTRA[race.id])
  if (extra && !usedIds.has(extra.id)) { inventory.push(extra); usedIds.add(extra.id) }
  inventory.push({ ...RECALL_STONE, count: 1 })

  // Cinturón inicial: 2 slots (sin cinturón equipado). Una poción de vida y una de maná.
  const potions = itemsBySlot('potion')
  const health = potions.find((p) => /health|vida/i.test(p.name_en + p.name))
  const mana = potions.find((p) => /mana|maná/i.test(p.name_en + p.name))
  const belt = [
    health ? { ...health, count: 3 } : null,
    mana ? { ...mana, count: 3 } : null,
    null, null,
  ]

  return { race, gold: 200, equipment, inventory, belt }
}
