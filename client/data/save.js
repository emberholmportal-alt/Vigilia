// Persistencia local del personaje (un solo slot). Guarda todo el progreso —nombre,
// raza, oro, XP, skills, inventario y equipo— y lo reconstruye al volver. Los ítems se
// serializan por id + count (livianos); se rehidratan desde ITEMS.
//
// A futuro esto lo maneja el servidor autoritativo (regla 2); hoy vive en localStorage.
import { itemById } from './items.js'

const KEY = 'vigilia:save:v1'

const packItem = (it) => {
  if (!it) return null
  const rec = { id: it.id }
  if (it.count && it.count > 1) rec.count = it.count
  if (it.dur != null) rec.dur = it.dur   // durabilidad del equipo
  return rec
}
function unpackItem(rec) {
  if (!rec) return null
  const base = itemById(rec.id)
  if (!base) return null
  const it = { ...base }
  if (rec.count > 1) it.count = rec.count
  if (rec.dur != null) it.dur = rec.dur
  return it
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY) } catch { return false }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    return {
      playerName: s.playerName,
      raceId: s.raceId,
      gold: s.gold || 0,
      xp: s.xp || 0,
      skills: s.skills || null,
      inventory: (s.inventory || []).map(unpackItem),
      equipment: Object.fromEntries(Object.entries(s.equipment || {}).map(([k, v]) => [k, unpackItem(v)])),
      belt: (s.belt || []).map(unpackItem),
      equippedBelt: unpackItem(s.equippedBelt),
      discovered: s.discovered || {},
      missions: s.missions || [],
      missionsDate: s.missionsDate || '',
      seals: s.seals || 0,
      attrAlloc: s.attrAlloc || null,
      skillRanks: s.skillRanks || null,
      questFlags: s.questFlags || null,
    }
  } catch { return null }
}

export function saveGame(state) {
  try {
    const snap = {
      playerName: state.playerName,
      raceId: state.race?.id,
      gold: state.gold,
      xp: state.xp,
      skills: state.skills,
      inventory: (state.inventory || []).map(packItem),
      equipment: Object.fromEntries(Object.entries(state.equipment || {}).map(([k, v]) => [k, packItem(v)])),
      belt: (state.belt || []).map(packItem),
      equippedBelt: packItem(state.equippedBelt),
      discovered: state.discovered || {},
      missions: state.missions || [],
      missionsDate: state.missionsDate || '',
      seals: state.seals || 0,
      attrAlloc: state.attrAlloc || { str: 0, dex: 0, int: 0, vit: 0 },
      skillRanks: state.skillRanks || {},
      questFlags: state.questFlags || {},
    }
    localStorage.setItem(KEY, JSON.stringify(snap))
  } catch { /* almacenamiento lleno / bloqueado: ignorar */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
