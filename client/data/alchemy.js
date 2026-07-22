// Alquimia: recetas REALES de Flare (mods/empyrean_campaign/scripts/crafting/alchemy/craft.txt).
// remove_item -> reward_item. La Botella Vacía (750) es la base de todas. Los materiales se
// juntan en el mundo (nodos) o se compran; el resultado son pociones reales de Flare.
import { itemById } from './items.js'
// Las recetas viven en shared/ (el server craftea autoritativo). El cliente las re-exporta.
export { ALCHEMY_RECIPES } from '../../shared/alchemy.js'

// Vista con los ítems resueltos (para la UI).
export const recipeView = (r) => ({
  out: itemById(r.out),
  ins: r.ins.map(([id, qty]) => ({ item: itemById(id), qty })),
})

// Materiales de los nodos: viven en shared/ (los coloca el servidor autoritativo).
export { GATHER } from '../../shared/gather.js'
