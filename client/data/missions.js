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

// type: 'kill' | 'mine' | 'herb' | 'chest'  (se rastrean con las acciones del juego)
const POOL = [
  { id: 'hunt_cave', type: 'kill', map: 'goblin_cave', target: 12, xp: 90, gold: 60 },
  { id: 'hunt_camp', type: 'kill', map: 'goblin_camp', target: 10, xp: 70, gold: 45 },
  { id: 'hunt_crypt', type: 'kill', map: 'family_crypt', target: 10, xp: 95, gold: 65 },
  { id: 'mine_crystals', type: 'mine', map: 'abandoned_mines', target: 8, xp: 85, gold: 55 },
  { id: 'mine_cave', type: 'mine', map: 'goblin_cave', target: 6, xp: 65, gold: 40 },
  { id: 'herb_trail', type: 'herb', map: 'river_trail', target: 10, xp: 70, gold: 45 },
  { id: 'herb_farm', type: 'herb', map: 'black_oak_farm', target: 8, xp: 75, gold: 50 },
  { id: 'loot_cemetery', type: 'chest', map: 'lochport_cemetery', target: 3, xp: 100, gold: 70 },
  { id: 'loot_mines', type: 'chest', map: 'abandoned_mines', target: 3, xp: 100, gold: 70 },
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
