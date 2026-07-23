// Misiones diarias: 3 por día de un pool, elegidas de forma determinística por fecha (mismo día
// -> mismas misiones para TODOS), reset a medianoche. Datos + selección PUROS, compartidos por
// cliente y servidor: así el servidor sabe qué contrato es el de hoy y spawnea su élite en la
// zona correspondiente, igual para todos los jugadores del canal.

// Fecha del día (YYYY-MM-DD). El servidor y el cliente coinciden porque ambos usan UTC.
export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// type: 'kill' | 'mine' | 'herb' | 'chest' (acciones) · 'contract' (élite del día) ·
// 'offering' (dejar oro en el Obelisco, sumidero). Todas dan también fragmentos de sello.
export const POOL = [
  { id: 'hunt_cave', type: 'kill', map: 'goblin_cave', target: 12, xp: 90, gold: 60, seals: 2 },
  { id: 'hunt_camp', type: 'kill', map: 'goblin_camp', target: 10, xp: 70, gold: 45, seals: 2 },
  // Templo de Mez (nivel ~7-9): ramal profundo tras la Cueva de Duendes. Caza en el Gran Salón
  // (19 spawners) y saqueo en el Sótano (6 cofres).
  { id: 'hunt_temple', type: 'kill', map: 'temple_of_mez_2', target: 13, xp: 115, gold: 78, seals: 3 },
  { id: 'loot_temple', type: 'chest', map: 'temple_of_mez_1', target: 3, xp: 105, gold: 70, seals: 3 },
  // Black Oak City (nivel ~10): la joya caída. Caza y saqueo de mayor riesgo -> mayor recompensa.
  { id: 'hunt_city', type: 'kill', map: 'black_oak_city', target: 14, xp: 150, gold: 105, seals: 3 },
  { id: 'loot_city', type: 'chest', map: 'black_oak_city', target: 3, xp: 130, gold: 90, seals: 3 },
  // Las Cloacas Ruinosas (nivel ~11): el clímax de la rama de la ciudad, bajo sus avenidas.
  { id: 'hunt_sewers', type: 'kill', map: 'dilapidated_sewers', target: 14, xp: 165, gold: 115, seals: 3 },
  { id: 'loot_sewers', type: 'chest', map: 'dilapidated_sewers', target: 3, xp: 145, gold: 100, seals: 3 },
  // El Inframundo (nivel ~13): lo más hondo con misión. Recompensa acorde a la profundidad.
  { id: 'hunt_underworld', type: 'kill', map: 'underworld', target: 16, xp: 190, gold: 135, seals: 4 },
  { id: 'loot_underworld', type: 'chest', map: 'underworld', target: 3, xp: 165, gold: 115, seals: 4 },
  // Cluster profundo (nivel 13→15): Minas y Catacumbas del Inframundo. Lo más duro del mundo.
  { id: 'hunt_deep', type: 'kill', map: 'underworld_mines', target: 18, xp: 230, gold: 165, seals: 5 },
  { id: 'loot_catacombs', type: 'chest', map: 'underworld_catacombs', target: 3, xp: 200, gold: 140, seals: 5 },
  { id: 'hunt_crypt', type: 'kill', map: 'family_crypt', target: 10, xp: 95, gold: 65, seals: 2 },
  // Ciénaga de Merrimead (nivel ~2): ramal costero de Lochport, tras el cementerio.
  { id: 'hunt_marsh', type: 'kill', map: 'merrimead_swamp', target: 12, xp: 60, gold: 42, seals: 2 },
  { id: 'loot_marsh', type: 'chest', map: 'merrimead_swamp', target: 3, xp: 65, gold: 45, seals: 2 },
  { id: 'mine_crystals', type: 'mine', map: 'abandoned_mines', target: 8, xp: 85, gold: 55, seals: 2 },
  { id: 'mine_cave', type: 'mine', map: 'goblin_cave', target: 6, xp: 65, gold: 40, seals: 2 },
  // Herboristería: las junta la bruja alquimista. La nombramos en el objetivo (giver).
  { id: 'herb_trail', type: 'herb', map: 'river_trail', target: 10, xp: 70, gold: 45, seals: 2, giver: 'Yara la Bruja', giver_en: 'Yara the Witch' },
  { id: 'herb_farm', type: 'herb', map: 'black_oak_farm', target: 8, xp: 75, gold: 50, seals: 2, giver: 'Yara la Bruja', giver_en: 'Yara the Witch' },
  { id: 'loot_cemetery', type: 'chest', map: 'lochport_cemetery', target: 3, xp: 100, gold: 70, seals: 3 },
  { id: 'loot_mines', type: 'chest', map: 'abandoned_mines', target: 3, xp: 100, gold: 70, seals: 3 },
  // Contrato: un élite que aparece SÓLO hoy en su zona. Combate duro, buena recompensa.
  { id: 'contract_camp', type: 'contract', map: 'goblin_camp', elite: 'goblin_elite', target: 1, xp: 150, gold: 110, seals: 5, giver: 'Guardia Bram', giver_en: 'Guard Bram' },
  { id: 'contract_cemetery', type: 'contract', map: 'lochport_cemetery', elite: 'skeleton_knight_boss', target: 1, xp: 180, gold: 140, seals: 6, giver: 'Guardia Bram', giver_en: 'Guard Bram' },
  { id: 'contract_cave', type: 'contract', map: 'goblin_cave', elite: 'goblin_elite_runner', target: 1, xp: 150, gold: 110, seals: 5, giver: 'Guardia Bram', giver_en: 'Guard Bram' },
  // Ofrenda: dejás oro en el Obelisco de Retorno (sumidero). Cuesta oro, da sellos + XP. Se
  // entrega tocando el obelisco (con confirmación, no cobra solo).
  { id: 'offer_obelisk', type: 'offering', map: 'triston', target: 200, xp: 60, gold: 0, seals: 4, giver: 'Obelisco de Retorno', giver_en: 'Obelisk of Return' },
]

// Devuelve las 3 misiones del día (con progreso 0, sin reclamar).
export function dailyMissions(dateStr = todayStr()) {
  const order = POOL.map((m, i) => ({ i, k: hashStr(dateStr + ':' + m.id) }))
    .sort((a, b) => a.k - b.k).map((o) => o.i)
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

// El contrato del día (si hoy hay uno en el set), o null. Lo usa el servidor para el élite.
export function todayContract(dateStr = todayStr()) {
  return dailyMissions(dateStr).find((m) => m.type === 'contract') || null
}
