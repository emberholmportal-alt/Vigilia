// Misiones diarias: 3 por día de un pool, elegidas de forma determinística por fecha (mismo
// día -> mismas misiones), reset a medianoche. Cada una atada a una zona real (docs/ECONOMY.md)
// y de un tipo que ya sabemos rastrear con las acciones existentes: cacería (matar), excavación
// (minar), herboristería (juntar) y saqueo (abrir cofres). Recompensa: XP + oro.
import { todayStr } from './shop.js'

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// type: 'kill' | 'mine' | 'herb' | 'chest' (acciones) · 'contract' (élite del día) ·
// 'offering' (entregar oro a un Guardián, sumidero). Todas dan también fragmentos de sello.
const POOL = [
  { id: 'hunt_cave', type: 'kill', map: 'goblin_cave', target: 12, xp: 90, gold: 60, seals: 2 },
  { id: 'hunt_camp', type: 'kill', map: 'goblin_camp', target: 10, xp: 70, gold: 45, seals: 2 },
  { id: 'hunt_crypt', type: 'kill', map: 'family_crypt', target: 10, xp: 95, gold: 65, seals: 2 },
  { id: 'mine_crystals', type: 'mine', map: 'abandoned_mines', target: 8, xp: 85, gold: 55, seals: 2 },
  { id: 'mine_cave', type: 'mine', map: 'goblin_cave', target: 6, xp: 65, gold: 40, seals: 2 },
  { id: 'herb_trail', type: 'herb', map: 'river_trail', target: 10, xp: 70, gold: 45, seals: 2 },
  { id: 'herb_farm', type: 'herb', map: 'black_oak_farm', target: 8, xp: 75, gold: 50, seals: 2 },
  { id: 'loot_cemetery', type: 'chest', map: 'lochport_cemetery', target: 3, xp: 100, gold: 70, seals: 3 },
  { id: 'loot_mines', type: 'chest', map: 'abandoned_mines', target: 3, xp: 100, gold: 70, seals: 3 },
  // Contrato: un élite que aparece SÓLO hoy en su zona. Combate duro, buena recompensa.
  { id: 'contract_camp', type: 'contract', map: 'goblin_camp', elite: 'goblin_elite', target: 1, xp: 150, gold: 110, seals: 5 },
  { id: 'contract_cemetery', type: 'contract', map: 'lochport_cemetery', elite: 'skeleton_knight_boss', target: 1, xp: 180, gold: 140, seals: 6 },
  { id: 'contract_cave', type: 'contract', map: 'goblin_cave', elite: 'goblin_elite_runner', target: 1, xp: 150, gold: 110, seals: 5 },
  // Ofrenda: entregás oro a un Guardián del pueblo (sumidero). Cuesta oro, da sellos + XP.
  { id: 'offer_guardian', type: 'offering', map: 'triston', target: 200, xp: 60, gold: 0, seals: 4 },
]

// Devuelve las 3 misiones del día (con progreso 0, sin reclamar).
export function dailyMissions(dateStr = todayStr()) {
  const order = POOL.map((m, i) => ({ i, k: hashStr(dateStr + ':' + m.id) }))
    .sort((a, b) => a.k - b.k).map((o) => o.i)
  // Evitar 3 del mismo tipo: tomamos de a uno respetando algo de variedad.
  const picked = []
  const types = new Set()
  for (const i of order) {
    const m = POOL[i]
    if (picked.length < 3 && (types.size < 3 ? !types.has(m.type) || picked.length >= 2 : true)) {
      picked.push(m); types.add(m.type)
    }
    if (picked.length >= 3) break
  }
  while (picked.length < 3) { const m = POOL[order[picked.length]]; if (!picked.includes(m)) picked.push(m) }
  return picked.slice(0, 3).map((m) => ({ ...m, progress: 0, claimed: false }))
}
