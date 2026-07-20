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
import * as db from '../db/db.js'
import { priceOf, sellValueOf, itemById } from '../../shared/items.js'
import { dailyMissions, todayStr } from '../../shared/missions.js'
import { rollLoot } from '../../shared/loot.js'

const GRAVE_FRACTION = 0.25   // fracción del oro que soltás al morir (coincide con GRAVE_GOLD_FRACTION del cliente)

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
export function join(send, { name, race, map, x, y, dir = 7, channel, spectator, gfx, accountId, gold = 0, inv = null } = {}) {
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
  // `gold` es AUTORITATIVO del servidor a partir de acá (Fase A de la economía): se carga del
  // personaje al entrar y sólo lo mutan las funciones de abajo (faucets del mundo + sinks validados).
  const p = { id, name: name || 'Vigilante', race: race || null, map, ch, x, y, dir, gfx: gfx || null, accountId: accountId || null, gold: Math.floor(Number(gold) || 0), send }
  // `inv` es AUTORITATIVO del servidor (Fase A.2): el bag se carga del personaje al entrar y sólo
  // lo mutan las funciones de abajo (loot otorgado por el server + ops validadas). Se guarda como
  // registros mínimos {id, count?, dur?, upgrade?} (el cliente reconstruye el ítem completo por id).
  p.inv = normalizeInv(inv)
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
  persistGold(p)                 // guarda el oro autoritativo antes de soltar la sesión
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
export function setStats(id, stats) {
  const p = players.get(id)
  if (p && stats && stats.level) p.invCap = invCapForLevel(stats.level)   // capacidad usable del bag (parity con el HUD)
  combat.setStats(id, stats)
}

// --- Oro AUTORITATIVO del servidor (Fase A de la economía) -----------------------------------
// El servidor es la única fuente de verdad del oro. Los faucets (matar, cofre) los acredita él con
// montos que él calcula; los sinks (vender/comprar/reparar) los valida contra los precios REALES.
// El cliente nunca afirma su saldo: pide, el server decide, y le manda el nuevo total ('gold').
function sendGold(p, add, reason, x, y) {
  const msg = { t: 'gold', gold: p.gold, add: add | 0, reason }
  if (x != null) { msg.x = x; msg.y = y }
  p.send(msg)
  p._goldDirty = true
}
// Acredita oro ganado del mundo (monto ya calculado por el server: kill/cofre).
export function awardGold(id, amt, reason, x, y) {
  const p = players.get(id); if (!p || !(amt > 0)) return 0
  p.gold += Math.floor(amt)
  sendGold(p, Math.floor(amt), reason || 'earn', x, y)
  return p.gold
}
// Gasta oro (sink genérico: reparar / ofrenda). Falla si no alcanza. El saldo nunca queda negativo.
export function spendGold(id, amt, reason) {
  const p = players.get(id); if (!p) return { ok: false }
  amt = Math.floor(Number(amt) || 0)
  if (amt <= 0) return { ok: false, error: 'monto inválido' }
  if (p.gold < amt) return { ok: false, error: 'no tenés tanto oro', gold: p.gold }
  p.gold -= amt
  p._goldDirty = true            // el nuevo saldo viaja en el ack del RPC (no se empuja aparte)
  if (reason === 'offering') missionTick(id, 'offering', null, amt)   // la ofrenda avanza la misión (progreso = oro entregado)
  return { ok: true, gold: p.gold }
}
// --- Inventario AUTORITATIVO del servidor (Fase A.2) -----------------------------------------
// El bag es la fuente de verdad de qué ítems tenés. El loot lo otorga el server; vender/depositar
// validan posesión contra este bag. Registros mínimos {id, count?, dur?, upgrade?}.
const INV_MAX = 55   // largo máximo del bag (5×11, igual que la grilla del cliente)
const INV_BASE = 30  // celdas usables al nivel 1 (crecen 2 por nivel hasta INV_MAX) — espeja el cliente
const STACK = new Set(['potion', 'consumable', 'crafting', 'crafting_tool', 'scroll', 'gem', 'book'])
const isStack = (id) => { const it = itemById(id); return !!it && STACK.has(it.slot) }
// Capacidad usable del bag según el nivel (espeja client/data/progression.js). Las celdas por
// encima de la capacidad están bloqueadas, así que el server no otorga loot ahí (parity con el HUD).
const invCapForLevel = (level) => Math.min(INV_MAX, INV_BASE + Math.max(0, ((level | 0) - 1)) * 2)

// Sanitiza el inventario que llega del blob a registros mínimos; descarta ids inexistentes.
function normalizeInv(inv) {
  const out = new Array(INV_MAX).fill(null)
  if (Array.isArray(inv)) {
    for (let i = 0; i < Math.min(inv.length, INV_MAX); i++) {
      const it = inv[i]
      if (!it || !itemById(it.id)) continue
      const rec = { id: it.id }
      if (it.count && it.count > 1) rec.count = it.count | 0
      if (it.dur != null) rec.dur = it.dur | 0
      if (it.upgrade) rec.upgrade = it.upgrade | 0
      out[i] = rec
    }
  }
  return out
}
// Otorga un ítem al bag (loot/compra). Apila si corresponde; si no hay lugar dentro de la
// capacidad usable (según nivel), false.
function invGrant(p, id, qty, meta) {
  if (!itemById(id)) return false
  qty = Math.max(1, qty | 0)
  const inv = p.inv
  const cap = p.invCap || INV_MAX
  if (isStack(id)) {
    const at = inv.findIndex((x) => x && x.id === id)
    if (at >= 0) { inv[at] = { ...inv[at], count: (inv[at].count || 1) + qty }; return true }
  }
  let free = -1
  for (let i = 0; i < cap; i++) { if (inv[i] == null) { free = i; break } }
  if (free < 0) return false   // bag lleno (dentro de la capacidad usable)
  inv[free] = isStack(id) ? { id, count: qty, ...(meta || {}) } : { id, ...(meta || {}) }
  return true
}
// Saca del bag por índice (vender/depositar/soltar). Devuelve el registro sacado o null.
function invRemoveAt(p, index, qty) {
  const inv = p.inv
  const it = inv[index]
  if (!it) return null
  qty = Math.max(1, qty | 0)
  if (it.count && it.count > qty) { const taken = { ...it, count: qty }; inv[index] = { ...it, count: it.count - qty }; return taken }
  inv[index] = null
  return it
}
// Otorga una lista de drops (loot del server) al bag y empuja el inventario nuevo al cliente.
export function grantLoot(id, drops) {
  const p = players.get(id); if (!p || !Array.isArray(drops)) return
  for (const d of drops) invGrant(p, d.id, d.qty || 1)
  p._invDirty = true
  p.send({ t: 'inv', inv: p.inv })
}
// Bag autoritativo de una cuenta con sesión activa (o null). Lo usa el handler `save` para no
// dejar que el blob del cliente pise el inventario del server.
export function invOf(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) return p.inv
  return null
}

// Vender un ítem al mercader: valida POSESIÓN (el bag[index] existe) y computa el valor del precio
// real. Saca el ítem del bag autoritativo. Cierra el exploit de "vender lo que no tenés".
export function sellItem(id, index) {
  const p = players.get(id); if (!p) return { ok: false }
  index = index | 0
  const it = p.inv[index]
  if (!it) return { ok: false, error: 'no tenés ese ítem' }
  invRemoveAt(p, index, 1)
  const gain = sellValueOf(it.id)
  p.gold += gain; p._goldDirty = true; p._invDirty = true
  return { ok: true, gold: p.gold, gain, inv: p.inv }
}

// Usar un consumible: valida posesión y saca 1 del bag. El EFECTO (curar/buff) lo aplica el cliente
// (la vida sigue client-side por ahora). Devuelve el id usado para que el cliente aplique el efecto.
export function useItem(id, index) {
  const p = players.get(id); if (!p) return { ok: false }
  const it = p.inv[index | 0]
  if (!it) return { ok: false, error: 'no tenés ese ítem' }
  invRemoveAt(p, index | 0, 1)
  p._invDirty = true
  return { ok: true, id: it.id, inv: p.inv }
}
// Saca un ítem del bag por índice y lo DEVUELVE (para depositarlo en el gremio / equiparlo / etc.):
// valida posesión. El caller decide qué hacer con el registro devuelto. Devuelve { ok, item }.
export function takeItemAt(id, index, qty = 1) {
  const p = players.get(id); if (!p) return { ok: false }
  const rec = invRemoveAt(p, index | 0, qty)
  if (!rec) return { ok: false, error: 'no tenés ese ítem' }
  p._invDirty = true
  return { ok: true, item: rec, inv: p.inv }
}
// Consume `qty` unidades de un id a través de stacks/slots (materiales de forja/alquimia). Valida
// posesión TOTAL antes de tocar nada. Cierra "forjar/craftear sin materiales". Devuelve { ok, inv }.
export function consumeItems(id, itemId, qty) {
  const p = players.get(id); if (!p) return { ok: false }
  qty = Math.max(1, qty | 0)
  let have = 0
  for (const x of p.inv) if (x && x.id === itemId) have += (x.count || 1)
  if (have < qty) return { ok: false, error: 'no tenés materiales' }
  let left = qty
  for (let i = 0; i < p.inv.length && left > 0; i++) {
    const x = p.inv[i]; if (!x || x.id !== itemId) continue
    const c = x.count || 1
    const take = Math.min(c, left); left -= take
    p.inv[i] = c - take > 0 ? { ...x, count: c - take } : null
  }
  p._invDirty = true
  return { ok: true, inv: p.inv }
}
// Vacía el bag y devuelve todos los registros (al morir: vuelcan a la tumba client-side). { ok, items, inv }.
export function dumpBag(id) {
  const p = players.get(id); if (!p) return { ok: false }
  const items = []
  for (let i = 0; i < p.inv.length; i++) { const x = p.inv[i]; if (x) { items.push(x); p.inv[i] = null } }
  p._invDirty = true
  return { ok: true, items, inv: p.inv }
}
// Devuelve un ítem al bag (retiro del depósito / rollback). Devuelve { ok, inv } o full.
export function giveItem(id, rec) {
  const p = players.get(id); if (!p || !rec) return { ok: false }
  const meta = {}; if (rec.dur != null) meta.dur = rec.dur; if (rec.upgrade) meta.upgrade = rec.upgrade
  if (!invGrant(p, rec.id, rec.count || 1, meta)) return { ok: false, error: 'bag lleno' }
  p._invDirty = true
  return { ok: true, inv: p.inv }
}
// Comprar un ítem al mercader: el COSTO lo computa el server desde el precio real.
export function buyItem(id, itemId) {
  const p = players.get(id); if (!p) return { ok: false }
  const cost = priceOf(itemId)
  if (cost <= 0) return { ok: false, error: 'ítem inválido' }
  if (p.gold < cost) return { ok: false, error: 'no tenés tanto oro', gold: p.gold }
  // Otorga el ítem al bag AUTORITATIVO (si no hay lugar, no cobra). El cliente lo recibe en el 'inv'.
  if (!invGrant(p, itemId, 1)) return { ok: false, error: 'inventario lleno', gold: p.gold }
  p.gold -= cost
  p._goldDirty = true; p._invDirty = true
  return { ok: true, gold: p.gold, cost, inv: p.inv }
}
// Oro autoritativo actual de una cuenta con sesión activa (o null). Lo usa el handler `save` para
// no dejar que el blob del cliente pise el oro del server.
export function goldOf(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) return p.gold
  return null
}
// Persiste el oro autoritativo al personaje (al salir). setCharacterGold preserva el resto del blob.
async function persistGold(p) {
  if (!p || !p.accountId) return
  if (p._goldDirty) { p._goldDirty = false; try { await db.setCharacterGold(p.accountId, p.gold) } catch {} }
  if (p._invDirty) { p._invDirty = false; try { await db.setCharacterInventory(p.accountId, p.inv) } catch {} }
}

// --- Faucets secundarios (computados por el server desde datos COMPARTIDOS) ------------------
// Reclamar una misión diaria: el oro se computa del set determinístico del día (shared/missions),
// no del cliente, y se acredita UNA vez por día. La COMPLETITUD sigue siendo client-side por ahora
// (mission-authority es una fase posterior) — esto acota el exploit a las 3 dailies fijas.
// Progreso de misiones AUTORITATIVO: el server incrementa el avance desde SUS eventos (kill/cofre/
// gather/contrato/ofrenda) para poder validar la completitud al reclamar. En memoria (se reinicia
// con el server; el claim vuelve a exigir el avance — no es un exploit, sólo hay que rehacerla).
// El cliente sigue mostrando su propio avance (cuenta los mismos eventos), pero el ORO/XP/sellos los
// gatea el ack del server. Cierra "reclamar la recompensa sin cumplir la misión".
export function missionTick(id, type, map, n = 1) {
  const p = players.get(id); if (!p) return
  const day = todayStr()
  if (!p._mprog || p._mprog.day !== day) p._mprog = { day, prog: {} }
  for (const m of dailyMissions(day)) {
    if (m.type !== type) continue
    if (m.map && map && m.map !== map) continue   // misiones atadas a un mapa (offering pasa map=null)
    const cur = p._mprog.prog[m.id] || 0
    if (cur >= m.target) continue
    p._mprog.prog[m.id] = Math.min(m.target, cur + Math.max(1, n | 0))
  }
}

export function claimMission(id, missionId) {
  const p = players.get(id); if (!p) return { ok: false }
  const m = dailyMissions().find((x) => x.id === missionId)
  if (!m) return { ok: false, error: 'misión inválida' }
  const day = todayStr()
  // Completitud AUTORITATIVA: el server exige haber visto el avance suficiente (no confía en el cliente).
  const prog = (p._mprog && p._mprog.day === day) ? (p._mprog.prog[missionId] || 0) : 0
  if (prog < m.target) return { ok: false, error: 'todavía no la completaste', gold: p.gold }
  if (!p._claimed || p._claimed.day !== day) p._claimed = { day, set: new Set() }
  if (p._claimed.set.has(missionId)) return { ok: false, error: 'ya reclamada', gold: p.gold }
  p._claimed.set.add(missionId)
  const gold = m.gold || 0
  if (gold > 0) { p.gold += gold; p._goldDirty = true }
  return { ok: true, gold: p.gold, add: gold }
}
// Cofre de sellos: el server tira el loot de la tabla COMPARTIDA (shared/loot) y acredita el ORO.
// Los ítems van en la respuesta (el cliente los mete al inventario). El costo en SELLOS lo maneja
// el cliente (los sellos son moneda premium NO-cripto, todavía client-side).
export function sealChest(id, level) {
  const p = players.get(id); if (!p) return { ok: false }
  const lvl = Math.max(4, Math.min(16, Math.floor(Number(level) || 4)))
  const roll = rollLoot('chest_level_' + lvl) || { gold: 0, drops: [] }
  const gold = roll.gold || 0
  if (gold > 0) { p.gold += gold; p._goldDirty = true }
  // Los ítems van al bag AUTORITATIVO del server (empuja 'inv'); `drops` es sólo para la animación del cliente.
  const drops = roll.drops || []
  if (drops.length) { for (const d of drops) invGrant(p, d.id, d.qty || 1); p._invDirty = true; p.send({ t: 'inv', inv: p.inv }) }
  return { ok: true, gold: p.gold, add: gold, drops }
}
// Al MORIR soltás una fracción de tu oro en una tumba (server-authoritative): el server descuenta y
// lo guarda como "oro de tumba" pendiente; al recuperar la tumba, te lo devuelve. La granularidad
// por-tumba de los ÍTEMS la maneja el cliente; para el oro alcanza un pendiente único.
export function dropGrave(id) {
  const p = players.get(id); if (!p) return { ok: false }
  const drop = Math.floor(p.gold * GRAVE_FRACTION)
  if (drop > 0) { p.gold -= drop; p._grave = (p._grave || 0) + drop; p._goldDirty = true }
  return { ok: true, gold: p.gold, dropped: drop }
}
export function recoverGrave(id) {
  const p = players.get(id); if (!p) return { ok: false }
  const g = p._grave || 0
  if (g > 0) { p.gold += g; p._grave = 0; p._goldDirty = true }
  return { ok: true, gold: p.gold, recovered: g }
}
// Recompensa de quest narrativa (montos fijos; el cliente trackea la bandera de completado). Hay
// pocas y son de una sola vez, así que el oro se acota a estos valores fijos, una vez cada uno.
// (Duplica el reward de client/data/quests.js — es 1 entrada; si cambia, tocar los dos.)
const QUEST_GOLD = { guardianes: 150 }
export function claimQuest(id, questId) {
  const p = players.get(id); if (!p) return { ok: false }
  if (!p._qclaimed) p._qclaimed = new Set()
  if (p._qclaimed.has(questId)) return { ok: false, error: 'ya reclamada', gold: p.gold }
  p._qclaimed.add(questId)
  const gold = QUEST_GOLD[questId] || 0
  if (gold > 0) { p.gold += gold; p._goldDirty = true }
  return { ok: true, gold: p.gold, add: gold }
}

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
  awardGold: (id, amt, reason, x, y) => awardGold(id, amt, reason, x, y),   // faucets del mundo (kill/cofre)
  grantLoot: (id, drops) => grantLoot(id, drops),                           // ítems de loot (kill), autoritativos
  missionTick: (id, type, map, n) => missionTick(id, type, map, n),         // avance de misiones autoritativo
})
combat.start()

// Info de canales de un mapa (para diagnóstico / UI): [{ channel, count, cap }].
export function channels(map) {
  return [...channelCounts(map).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([channel, count]) => ({ channel, count, cap: CHANNEL_CAP }))
}
