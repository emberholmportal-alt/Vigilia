// Presencia multijugador: una "sala" por mapa. Los jugadores en el mismo mapa se ven entre sí.
// El servidor guarda la posición de cada uno y difunde entradas/salidas/movimientos/chat a los
// demás de esa sala. Interés espacial simple: sólo te llega lo del mapa donde estás.
//
// Autoritativo en estructura (regla 2): hoy el server relaya posición; cuando haga falta,
// acá se valida velocidad/colisión sin cambiar el protocolo.

const players = new Map() // id -> { id, name, race, map, x, y, dir, send }
let seq = 1

export function playerCount() { return players.size }

// Vista pública de un jugador (lo que ven los demás).
function pub(p) { return { id: p.id, name: p.name, race: p.race, x: p.x, y: p.y, dir: p.dir } }

// Difunde un mensaje a todos los del mapa (opcionalmente salteando un id).
function broadcast(map, msg, exceptId) {
  for (const p of players.values()) {
    if (p.map !== map || p.id === exceptId) continue
    p.send(msg)
  }
}

// Registra un jugador y lo mete a la sala de su mapa. Devuelve su id y los presentes (sin él).
export function join(send, { name, race, map, x, y, dir = 7 }) {
  const id = seq++
  const p = { id, name: name || 'Vigilante', race: race || null, map, x, y, dir, send }
  players.set(id, p)
  const present = [...players.values()].filter((o) => o.map === map && o.id !== id).map(pub)
  broadcast(map, { t: 'join', player: pub(p) }, id)
  return { id, present }
}

// Cambia de mapa: sale de la sala vieja (aviso de salida) y entra a la nueva (aviso + presentes).
export function move(id, map, x, y, dir) {
  const p = players.get(id)
  if (!p) return null
  if (map && map !== p.map) {
    const old = p.map
    p.map = map; p.x = x; p.y = y; if (dir != null) p.dir = dir
    broadcast(old, { t: 'leave', id }, id)
    const present = [...players.values()].filter((o) => o.map === map && o.id !== id).map(pub)
    broadcast(map, { t: 'join', player: pub(p) }, id)
    return { present }
  }
  p.x = x; p.y = y; if (dir != null) p.dir = dir
  broadcast(p.map, { t: 'move', id, x, y, dir: p.dir }, id)
  return null
}

// Chat: sólo lo oyen los del mismo mapa.
export function chat(id, text) {
  const p = players.get(id)
  if (!p) return
  const clean = String(text || '').trim().slice(0, 160)
  if (!clean) return
  broadcast(p.map, { t: 'chat', id, name: p.name, text: clean }, /* exceptId */ null)
}

// Saca a un jugador (desconexión) y avisa a su sala.
export function leave(id) {
  const p = players.get(id)
  if (!p) return
  players.delete(id)
  broadcast(p.map, { t: 'leave', id }, id)
}
