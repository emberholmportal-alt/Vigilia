// Bestiario: mapea las categorías de los spawners de Flare a los sprites de enemigos que
// tenemos, y define stats por nivel y el nombre en español. 25 enemigos reales de Flare.

const SPRITES = new Set([
  'antlion', 'antlion_armored', 'antlion_small', 'fire_ant', 'goblin',
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
  // 'cursed_grave' (cruz de piedra) no gusta: los spawners que la piden dan un esqueleto.
  cursed_grave: 'skeleton', forgotten_grave: 'skeleton',
}

// Categorías de bioma -> lista de sprites posibles (Flare elige uno al azar).
const BIOME = {
  grassland: ['goblin', 'goblin_runner'],
  dungeon: ['skeleton', 'skeleton_weak', 'zombie'],
  undead: ['skeleton', 'skeleton_weak', 'zombie', 'skeleton_archer', 'skeleton_mage'],
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
const NAMES_EN = {
  goblin: 'Goblin', goblin_runner: 'Goblin runner', goblin_elite: 'Elite goblin',
  goblin_elite_runner: 'Feral goblin', hobgoblin: 'Hobgoblin', hobgoblin_archer: 'Hobgoblin archer',
  skeleton: 'Skeleton', skeleton_weak: 'Frail skeleton', skeleton_archer: 'Skeletal archer',
  skeleton_mage: 'Skeletal mage', skeleton_knight_boss: 'Bone knight',
  skeleton_mage_boss: 'Bone necromancer', zombie: 'Zombie', zombie_dark: 'Unholy zombie',
  cursed_grave: 'Cursed grave', antlion: 'Antlion', antlion_small: 'Antlion hatchling',
  antlion_armored: 'Armored antlion', fire_ant: 'Fire ant', ice_ant: 'Ice ant',
  minotaur: 'Minotaur', wyvern: 'Wyvern', wyvern_air: 'Wind wyvern',
  wyvern_fire: 'Fire wyvern', wyvern_water: 'Water wyvern',
}
// Nombre del enemigo según idioma ('es' por defecto).
export const enemyName = (sprite, lang = 'es') =>
  (lang === 'en' ? (NAMES_EN[sprite] || 'Beast') : (NAMES[sprite] || 'Bestia'))

// Enemigos que atacan a distancia (arqueros y magos): dispararan en vez de golpear.
const RANGED = new Set(['hobgoblin_archer', 'skeleton_archer', 'skeleton_mage', 'skeleton_mage_boss'])
export const isRanged = (sprite) => RANGED.has(sprite)

// Tipo de proyectil según el enemigo: los magos tiran orbes, los arqueros flechas.
export const projectileKind = (sprite) => (/mage/.test(sprite) ? 'magic' : 'arrow')

// Primo a distancia de un enemigo cuerpo a cuerpo (para mezclar arqueros en los spawns).
const RANGED_COUSIN = {
  goblin: 'hobgoblin_archer', goblin_runner: 'hobgoblin_archer',
  skeleton: 'skeleton_archer', skeleton_weak: 'skeleton_archer',
}
export const rangedCousin = (sprite) => RANGED_COUSIN[sprite] || null

// Habilidades de enemigo (las ejecuta Enemy.js; el visual/spawn lo pone Game.js):
//  · smash    — carga un golpe fuerte en área, telegrafiado (esquivable saliendo del círculo).
//  · skittish — huye del jugador cuando le baja la vida, y después vuelve a la carga.
//  · summon   — invoca esbirros débiles cada cierto tiempo (nigromantes).
const ABILITIES = {
  minotaur: { type: 'smash', mult: 2.4, radius: 2.4, windup: 0.8, cd: 5, chance: 0.5 },
  skeleton_knight_boss: { type: 'smash', mult: 2.2, radius: 2.2, windup: 0.75, cd: 5, chance: 0.45 },
  goblin_elite: { type: 'smash', mult: 2.0, radius: 2.0, windup: 0.7, cd: 4.5, chance: 0.4 },
  goblin_elite_runner: { type: 'smash', mult: 2.0, radius: 2.0, windup: 0.65, cd: 4.5, chance: 0.4 },
  goblin_runner: { type: 'skittish', threshold: 0.28, flee: 3 },
  skeleton_weak: { type: 'skittish', threshold: 0.25, flee: 2.5 },
  antlion_small: { type: 'skittish', threshold: 0.3, flee: 2.5 },
  skeleton_mage_boss: { type: 'summon', minion: 'skeleton_weak', cd: 7, cap: 4 },
}
export const enemyAbility = (sprite) => ABILITIES[sprite] || null

// "elite" en cualquier parte del nombre (no sólo al final): el élite de contrato diario
// `goblin_elite_runner` terminaba en "runner" y se colaba como mob común (sin bonus de jefe).
const BOSS = /boss|minotaur|elite/
export function enemyStats(sprite, level = 1) {
  level = Math.max(1, level | 0)
  const boss = BOSS.test(sprite)
  const frail = isRanged(sprite) && !boss    // arqueros/magos: pegan de lejos pero aguantan menos
  const hpMax = Math.round(((boss ? 70 : 20) + level * 14 + (boss ? level * 22 : 0)) * (frail ? 0.75 : 1))
  const damage = Math.round((boss ? 6 : 3) + level * 1.6)
  const xp = Math.round(8 + level * 6 + (boss ? 45 : 0))
  const gold = Math.round(2 + level * 3 + (boss ? 25 : 0))
  return { hpMax, damage, xp, gold, boss }
}
