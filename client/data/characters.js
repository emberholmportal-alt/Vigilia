// Razas y kit inicial. Los modificadores salen de docs/WORLD.md. El equipamiento
// inicial es distinto por raza (WORLD.md: "Diferenciá con equipamiento inicial
// distinto") y usa ítems REALES de Flare, elegidos por su capa de paperdoll (gfx).
import { itemByGfx, itemsBySlot } from './items.js'

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
const INVENTORY_SAMPLER = [
  'plate_cuirass', 'plate_greaves', 'plate_gauntlets', 'plate_boots', 'plate_helm',
  'chain_cuirass', 'chain_coif', 'leather_hood',
  'greatsword', 'zweihander', 'infantry_axe', 'greatstaff', 'staff',
  'kite_shield', 'iron_buckler',
]

// Arma el personaje inicial para una raza: equipo puesto + inventario con opciones + oro.
export function startingCharacter(raceId) {
  const race = raceById(raceId) || RACES[0]

  const equipment = {}
  const usedIds = new Set()
  for (const [slot, gfx] of Object.entries(race.kit)) {
    const it = itemByGfx(gfx)
    if (it) { equipment[slot] = it; usedIds.add(it.id) }
  }

  const inventory = []
  for (const gfx of INVENTORY_SAMPLER) {
    const it = itemByGfx(gfx)
    if (it && !usedIds.has(it.id)) { inventory.push(it); usedIds.add(it.id) }
  }

  // Cinturón inicial: 2 slots (sin cinturón equipado). Una poción de vida y una de maná;
  // se compran cinturones más grandes al mercader para tener más espacio.
  const potions = itemsBySlot('potion')
  const health = potions.find((p) => /health|vida/i.test(p.name_en + p.name))
  const mana = potions.find((p) => /mana|maná/i.test(p.name_en + p.name))
  const belt = [
    health ? { ...health, count: 3 } : null,
    mana ? { ...mana, count: 3 } : null,
    null, null,
  ]

  return { race, gold: 250, equipment, inventory, belt }
}
