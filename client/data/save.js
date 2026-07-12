// Persistencia local del personaje (un solo slot). Guarda todo el progreso —nombre,
// raza, oro, XP, skills, inventario y equipo— y lo reconstruye al volver. Los ítems se
// serializan por id + count (livianos); se rehidratan desde ITEMS.
//
// A futuro esto lo maneja el servidor autoritativo (regla 2); hoy vive en localStorage.
import { itemById } from './items.js'

const KEY = 'vigilia:save:v1'

const packItem = (it) => (it ? { id: it.id, count: it.count || 1 } : null)
function unpackItem(rec) {
  if (!rec) return null
  const base = itemById(rec.id)
  if (!base) return null
  return rec.count > 1 ? { ...base, count: rec.count } : { ...base }
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
    }
    localStorage.setItem(KEY, JSON.stringify(snap))
  } catch { /* almacenamiento lleno / bloqueado: ignorar */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
