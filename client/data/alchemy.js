// Alquimia: recetas REALES de Flare (mods/empyrean_campaign/scripts/crafting/alchemy/craft.txt).
// remove_item -> reward_item. La Botella Vacía (750) es la base de todas. Los materiales se
// juntan en el mundo (nodos) o se compran; el resultado son pociones reales de Flare.
import { itemById } from './items.js'

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

// Vista con los ítems resueltos (para la UI).
export const recipeView = (r) => ({
  out: itemById(r.out),
  ins: r.ins.map(([id, qty]) => ({ item: itemById(id), qty })),
})

// Materiales que se juntan en el mundo (ítems reales de Flare) por tipo de nodo/skill.
// La Botella Vacía no se junta: es un envase que vende el mercader.
export const GATHER = {
  herboristeria: [
    { id: 751, name: 'Aloe Vera', glow: 0x4f9d6b, base: 'herb' },
    { id: 754, name: 'Hongos', glow: 0xb07acc, base: 'herb' },
  ],
  excavacion: [
    { id: 752, name: 'Cristal de maná', glow: 0x4a8fd6, base: 'ore' },
  ],
}
