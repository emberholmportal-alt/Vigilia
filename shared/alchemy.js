// Recetas de alquimia COMPARTIDAS (cliente + servidor). El server las usa para craftear de forma
// AUTORITATIVA: valida y consume los materiales del bag y otorga la poción (faucet server-side), sin
// confiar en el cliente. Recetas REALES de Flare (mods/empyrean_campaign/scripts/crafting/alchemy).
// ins: [[itemId, cantidad], ...]  out: itemId de la poción resultante.
export const ALCHEMY_RECIPES = [
  { out: 2,   ins: [[750, 1], [751, 1]] },              // Poción de vida
  { out: 3,   ins: [[750, 1], [752, 1]] },              // Poción de maná
  { out: 775, ins: [[750, 1], [754, 1]] },              // Poción de vigor
  { out: 776, ins: [[750, 1], [751, 1], [752, 1]] },    // Poción de restauración
  { out: 777, ins: [[750, 1], [751, 1], [754, 1]] },    // Poción de tesoro
  { out: 778, ins: [[750, 1], [752, 1], [754, 1]] },    // Poción elemental
  { out: 779, ins: [[750, 1], [751, 2]] },              // Súper poción de vida
  { out: 780, ins: [[750, 1], [751, 3]] },              // Ultra poción de vida
  { out: 781, ins: [[750, 1], [752, 2]] },              // Súper poción de maná
  { out: 782, ins: [[750, 1], [752, 3]] },              // Ultra poción de maná
]

// La receta cuyo resultado es `outId` (o null). El server valida contra esto, no contra el cliente.
export function recipeByOut(outId) {
  return ALCHEMY_RECIPES.find((r) => r.out === (outId | 0)) || null
}
