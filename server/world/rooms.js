// Presencia multijugador con CANALES (sharding) + interés por área (AoI).
//
// Problema: si 1500 jugadores caen todos en Triston, nadie ve nada (100 sprites encima) y el
// ancho de banda explota. Solución, igual que Kintara: cada mapa se parte en varios CANALES
// paralelos con un tope de gente. Entrás al primer canal con lugar; cuando se llena, se abre
// otro. Los de canales distintos del mismo mapa NO se ven entre sí. Así el pueblo siempre se
// ve "poblado pero jugable" (≤ CHANNEL_CAP por canal), sin importar cuántos haya en total.
//
// Dentro de un canal, además, sólo te difundimos el MOVIMIENTO de quienes tenés cerca (AoI):
// el chat y las entradas/salidas van a todo el canal (son baratas y el canal es chico), pero
// el chorro de posiciones se recorta por radio. El culling final lo hace el cliente.
//
// Autoritativo en estructura (regla 2): hoy el server relaya; el día de mañana valida
// velocidad/colisión acá mismo sin tocar el protocolo.

import * as combat from './combat.js'

const CHANNEL_CAP = Number(process.env.CHANNEL_CAP || 50)   // tope de jugadores por canal
const AOI_RADIUS = Number(process.env.AOI_RADIUS || 24)     // radio de interés, en tiles
const AOI_R2 = AOI_RADIUS * AOI_RADIUS

const players = new Map()    // id -> { id, name, race, map, ch, x, y, dir, send }
const observers = new Map()  // id -> { id, map, ch, send }  (mirones: ven pero no son vistos)
let seq = 1

export function playerCount() { return players.size }

// Vista pública de un jugador (lo que ven los demás). Incluye `gfx` = capas del paperdoll
// (equipo visible) y `dead` para que un recién llegado vea el estado correcto.
function pub(p) { return { id: p.id, name: p.name, race: p.race, x: p.x, y: p.y, dir: p.dir, gfx: p.gfx || null, dead: !!p.dead, hp: p.hp, hpMax: p.hpMax } }

function inChannel(map, ch) {
  const out = []
  for (const p of players.values()) if (p.map === map && p.ch === ch) out.push(p)
  return out
}

// Cuenta por canal de un mapa: Map(ch -> n).
function channelCounts(map) {
  const c = new Map()
  for (const p of players.values()) if (p.map === map) c.set(p.ch, (c.get(p.ch) || 0) + 1)
  return c
}

// Elige canal para entrar a `map`. Respeta `want` si tiene lugar (para reencontrarse con gente
// o mantener tu canal al cambiar de mapa); si no, el canal más bajo con espacio; si están todos
// llenos, abre el siguiente. Los canales son 1..N contiguos.
function pickChannel(map, want) {
  const counts = channelCounts(map)
  if (want != null && (counts.get(want) || 0) < CHANNEL_CAP) return want
  let ch = 1
  while ((counts.get(ch) || 0) >= CHANNEL_CAP) ch++
  return ch
}

// Canal más poblado del mapa (para el mirón: querés ver donde hay gente). Def. 1 si no hay nadie.
function pickBusiest(map) {
  let best = 1, max = -1
  for (const [ch, n] of channelCounts(map)) if (n > max) { max = n; best = ch }
  return best
}

// Manda a los mirones de (map, ch). Ven todo lo que pasa en el canal aunque no sean vistos.
function sendObservers(map, ch, msg) {
  for (const o of observers.values()) if (o.map === map && o.ch === ch) o.send(msg)
}

// Difunde a todos los de (map, ch), salteando opcionalmente un id. Incluye a los mirones.
function broadcast(map, ch, msg, exceptId) {
  for (const p of players.values()) {
    if (p.map !== map || p.ch !== ch || p.id === exceptId) continue
    p.send(msg)
  }
  sendObservers(map, ch, msg)
}

// Difunde sólo a quienes están dentro del radio de interés de (x,y) en (map, ch). Los mirones,
// que recorren el mapa con la cámara, reciben todo el movimiento del canal (sin recorte).
function broadcastAoI(map, ch, x, y, msg, exceptId) {
  for (const p of players.values()) {
    if (p.map !== map || p.ch !== ch || p.id === exceptId) continue
    const dx = p.x - x, dy = p.y - y
    if (dx * dx + dy * dy > AOI_R2) continue
    p.send(msg)
  }
  sendObservers(map, ch, msg)
}

// Registra un jugador y lo mete a un canal del mapa. Devuelve id, canal y los presentes de ese
// canal (sin él). `channel` (opcional) pide un canal concreto; si no hay lugar, se reasigna.
export function join(send, { name, race, map, x, y, dir = 7, channel, spectator, gfx } = {}) {
  const id = seq++
  // Mirón: entra como observador al canal MÁS POBLADO (donde hay gente para ver). No se suma
  // a los jugadores, no cuenta como online y nadie lo ve; sólo recibe lo del canal.
  if (spectator) {
    const ch = pickBusiest(map)
    observers.set(id, { id, map, ch, send })
    const present = inChannel(map, ch).map(pub)
    combat.ensureWorld(map, ch)
    const es = combat.snapshot(map, ch); if (es && es.length) send({ t: 'espawn', es })
    const ns = combat.nodeSnapshot(map, ch); if (ns && ns.length) send({ t: 'nspawn', ns })
    const cs = combat.chestSnapshot(map, ch); if (cs && cs.length) send({ t: 'cspawn', cs })
    return { id, channel: ch, present, spectator: true }
  }
  const ch = pickChannel(map, channel)
  const p = { id, name: name || 'Vigilante', race: race || null, map, ch, x, y, dir, gfx: gfx || null, send }
  players.set(id, p)
  const present = inChannel(map, ch).filter((o) => o.id !== id).map(pub)
  broadcast(map, ch, { t: 'join', player: pub(p) }, id)
  combat.ensureWorld(map, ch)   // spawnea los enemigos + nodos del canal (una vez)
  const es = combat.snapshot(map, ch); if (es && es.length) send({ t: 'espawn', es })
  const ns = combat.nodeSnapshot(map, ch); if (ns && ns.length) send({ t: 'nspawn', ns })
  const cs = combat.chestSnapshot(map, ch); if (cs && cs.length) send({ t: 'cspawn', cs })
  return { id, channel: ch, present }
}

// Movimiento / cambio de mapa. Al cambiar de mapa se reasigna canal (intenta conservar el tuyo).
// Devuelve { channel, present } cuando cambió de mapa (el server manda 'present' de nuevo), o
// null en un movimiento normal.
export function move(id, map, x, y, dir) {
  const p = players.get(id)
  if (!p) return null
  if (map && map !== p.map) {
    const oldMap = p.map, oldCh = p.ch
    p.map = map; p.ch = pickChannel(map, p.ch); p.x = x; p.y = y; if (dir != null) p.dir = dir
    broadcast(oldMap, oldCh, { t: 'leave', id }, id)
    const present = inChannel(map, p.ch).filter((o) => o.id !== id).map(pub)
    broadcast(map, p.ch, { t: 'join', player: pub(p) }, id)
    combat.ensureWorld(map, p.ch)   // enemigos + nodos del canal nuevo
    const es = combat.snapshot(map, p.ch); if (es && es.length) p.send({ t: 'espawn', es })
    const ns = combat.nodeSnapshot(map, p.ch); if (ns && ns.length) p.send({ t: 'nspawn', ns })
    const cs = combat.chestSnapshot(map, p.ch); if (cs && cs.length) p.send({ t: 'cspawn', cs })
    return { channel: p.ch, present }
  }
  p.x = x; p.y = y; if (dir != null) p.dir = dir
  broadcastAoI(p.map, p.ch, x, y, { t: 'move', id, x, y, dir: p.dir }, id)
  return null
}

// Chat: lo oyen los del mismo mapa Y canal.
export function chat(id, text) {
  const p = players.get(id)
  if (!p) return
  const clean = String(text || '').trim().slice(0, 160)
  if (!clean) return
  broadcast(p.map, p.ch, { t: 'chat', id, name: p.name, text: clean }, /* exceptId */ null)
}

// Saca a un jugador (desconexión) y avisa a su canal. Si era mirón, sólo lo quita (nadie lo veía).
export function leave(id) {
  if (observers.delete(id)) return
  const p = players.get(id)
  if (!p) return
  players.delete(id)
  combat.dropPlayer(id)
  broadcast(p.map, p.ch, { t: 'leave', id }, id)
}

// Pedido de ataque a un enemigo (del cliente). Lo resuelve la simulación autoritativa.
export function attack(id, eid) { combat.playerAttack(id, eid) }
// Pedido de juntar un nodo de recurso (del cliente).
export function gather(id, nid) { combat.playerGather(id, nid) }
// Pedido de abrir un cofre (del cliente).
export function openChest(id, cid) { combat.playerOpenChest(id, cid) }
// El cliente envía sus stats de combate (dependen del equipo) para que el server tire el daño.
export function setStats(id, stats) { combat.setStats(id, stats) }

// Equipo visible: el cliente manda sus capas de paperdoll; se guardan y se difunden al canal
// para que los demás te vean con tu gear (antes se veían todos con el cuerpo base).
export function setGfx(id, gfx) {
  const p = players.get(id); if (!p) return
  p.gfx = gfx || null
  broadcast(p.map, p.ch, { t: 'gfx', id, gfx: p.gfx }, id)
}

// Vida del jugador: se difunde por AoI (cambia seguido) para que los demás vean su barra.
export function playerHp(id, hp, hpMax) {
  const p = players.get(id); if (!p) return
  p.hp = hp | 0; p.hpMax = hpMax | 0
  broadcastAoI(p.map, p.ch, p.x, p.y, { t: 'php', id, hp: p.hp, hpMax: p.hpMax }, id)
}

// Muerte / reaparición del jugador: se difunde al canal para que los demás la vean (co-op).
export function playerDead(id) {
  const p = players.get(id); if (!p) return
  p.dead = true
  broadcast(p.map, p.ch, { t: 'pdied', id }, id)
}
export function playerAlive(id, x, y, dir) {
  const p = players.get(id); if (!p) return
  p.dead = false
  if (x != null) { p.x = x; p.y = y; if (dir != null) p.dir = dir }
  broadcast(p.map, p.ch, { t: 'palive', id, x: p.x, y: p.y, dir: p.dir }, id)
}

// Inyecta en la simulación de combate cómo consultar/avisar a los jugadores (sin acoplar módulos).
combat.init({
  playersIn: (map, ch) => { const out = []; for (const p of players.values()) if (p.map === map && p.ch === ch) out.push(p); return out },
  getPlayer: (id) => players.get(id) || null,
  sendTo: (id, msg) => { const p = players.get(id); if (p) p.send(msg) },
  broadcast: (map, ch, msg) => broadcast(map, ch, msg, null),
})
combat.start()

// Info de canales de un mapa (para diagnóstico / UI): [{ channel, count, cap }].
export function channels(map) {
  return [...channelCounts(map).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([channel, count]) => ({ channel, count, cap: CHANNEL_CAP }))
}
