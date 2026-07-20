// El roll de loot de enemigos ahora es COMPARTIDO (shared/drops.js) para que el servidor lo tire
// de forma autoritativa (Fase A.2). El cliente lo re-exporta para no duplicar la lógica.
export { rollMonsterDrop } from '../../shared/drops.js'
