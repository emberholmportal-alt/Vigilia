// Bestiario: mapea las categorías de los spawners de Flare a los sprites de enemigos que
// tenemos, y define stats por nivel y el nombre en español. 25 enemigos reales de Flare.

const SPRITES = new Set([
  'antlion', 'antlion_armored', 'antlion_small', 'cursed_grave', 'fire_ant', 'goblin',
  'goblin_elite', 'goblin_elite_runner', 'goblin_runner', 'hobgoblin', 'hobgoblin_archer',
  'ice_ant', 'minotaur', 'skeleton', 'skeleton_archer', 'skeleton_knight_boss', 'skeleton_mage',
  'skeleton_mage_boss', 'skeleton_weak', 'wyvern', 'wyvern_air', 'wyvern_fire', 'wyvern_water',
  'zombie', 'zombie_dark',
])

// Alias directos (categoría específica -> sprite equivalente que sí tenemos).
const ALIAS = {
  goblin_spearman: 'hobgoblin', goblin_chief: 'goblin_elite',
  antlion_hatchling: 'antlion_small', antlion_burster: 'antlion_armored', antlion_ice: 'ice_ant',
  minotaur_necromancer: 'minotaur', skeleton_knight: 'skeleton_knight_boss',
}

// Categorías de bioma -> lista de sprites posibles (Flare elige uno al azar).
const BIOME = {
  grassland: ['goblin', 'goblin_runner'],
  dungeon: ['skeleton', 'skeleton_weak', 'zombie'],
  undead: ['skeleton', 'skeleton_weak', 'zombie', 'skeleton_archer', 'cursed_grave'],
  snowplains: ['ice_ant', 'skeleton_weak'],
  antlion: ['antlion', 'antlion_small', 'antlion_armored'],
}

export function pickSprite(category, rng = Math.random) {
  if (SPRITES.has(category)) return category
  if (ALIAS[category] && SPRITES.has(ALIAS[category])) return ALIAS[category]
  const b = BIOME[category]
  if (b) return b[Math.floor(rng() * b.length)]
  return 'goblin' // fallback para jefes/nombres raros que no tenemos
}

const NAMES = {
  goblin: 'Duende', goblin_runner: 'Duende veloz', goblin_elite: 'Duende de élite',
  goblin_elite_runner: 'Duende feroz', hobgoblin: 'Hobgoblin', hobgoblin_archer: 'Arquero hobgoblin',
  skeleton: 'Esqueleto', skeleton_weak: 'Esqueleto frágil', skeleton_archer: 'Arquero esquelético',
  skeleton_mage: 'Mago esquelético', skeleton_knight_boss: 'Caballero de hueso',
  skeleton_mage_boss: 'Nigromante óseo', zombie: 'Zombi', zombie_dark: 'Zombi profano',
  cursed_grave: 'Tumba maldita', antlion: 'Hormiga león', antlion_small: 'Cría de hormiga',
  antlion_armored: 'Hormiga acorazada', fire_ant: 'Hormiga de fuego', ice_ant: 'Hormiga de hielo',
  minotaur: 'Minotauro', wyvern: 'Wyvern', wyvern_air: 'Wyvern del viento',
  wyvern_fire: 'Wyvern de fuego', wyvern_water: 'Wyvern de agua',
}
export const enemyName = (sprite) => NAMES[sprite] || 'Bestia'

const BOSS = /boss|minotaur|elite$/
export function enemyStats(sprite, level = 1) {
  level = Math.max(1, level | 0)
  const boss = BOSS.test(sprite)
  const hpMax = Math.round((boss ? 70 : 20) + level * 14 + (boss ? level * 22 : 0))
  const damage = Math.round((boss ? 6 : 3) + level * 1.6)
  const xp = Math.round(8 + level * 6 + (boss ? 45 : 0))
  const gold = Math.round(2 + level * 3 + (boss ? 25 : 0))
  return { hpMax, damage, xp, gold, boss }
}
