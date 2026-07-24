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
import { isVendorItem } from '../../shared/shop.js'
import { dailyMissions, todayStr } from '../../shared/missions.js'
import { rollLoot } from '../../shared/loot.js'
import { recipeByOut } from '../../shared/alchemy.js'
import { playerLevelFromXp } from '../../shared/progression.js'

const GRAVE_FRACTION = 0.25   // fracción del oro que soltás al morir (coincide con GRAVE_GOLD_FRACTION del cliente)

const CHANNEL_CAP = Number(process.env.CHANNEL_CAP || 50)   // tope de jugadores por canal
const AOI_RADIUS = Number(process.env.AOI_RADIUS || 24)     // radio de interés, en tiles
const AOI_R2 = AOI_RADIUS * AOI_RADIUS

// Anti-teleport (autoridad de posición): el server clampea cada `move` a la velocidad legítima
// máxima en vez de confiar en las coords del cliente. Para un jugador legítimo el clamp es un no-op
// (correr ≈ 6.3 tiles/s, muy por debajo del tope); un teleport queda reducido a moverse a velocidad
// normal (cero ventaja para farmear cofres/nodos por alcance). No hay snap-back: no rompe el feel.
const MOVE_TILES_PER_SEC = Number(process.env.MOVE_TILES_PER_SEC || 12)   // ~1.9× correr (headroom para buffs/latencia)
const MOVE_BASE_SLACK = 4        // tiles de gracia por movimiento (redondeo/jitter/primer envío)
const MOVE_DT_CAP_MS = 2000      // tope del dt acumulable (no dejar que una pausa larga habilite un salto enorme)

const players = new Map()    // id -> { id, name, race, map, ch, x, y, dir, send }
const observers = new Map()  // id -> { id, map, ch, send }  (mirones: ven pero no son vistos)
let seq = 1

export function playerCount() { return players.size }

// Vista pública de un jugador (lo que ven los demás). Incluye `gfx` = capas del paperdoll
// (equipo visible) y `dead` para que un recién llegado vea el estado correcto.
function pub(p) { return { id: p.id, name: p.name, race: p.race, body: p.body || 'male', x: p.x, y: p.y, dir: p.dir, gfx: p.gfx || null, dead: !!p.dead, hp: p.hp, hpMax: p.hpMax, level: p.level || 1, guildTag: p.guildTag || null } }

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
export function join(send, { name, race, body, map, x, y, dir = 7, channel, spectator, gfx, accountId, gold = 0, seals = 0, inv = null, outSeed = null, ledger = null, qclaimed = null, feats = null, guildTag = null } = {}) {
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
  const p = { id, name: name || 'Vigilante', race: race || null, body: (body === 'female' || body === 'female_dark') ? body : 'male', map, ch, x, y, dir, gfx: gfx || null, accountId: accountId || null, gold: Math.floor(Number(gold) || 0), seals: Math.floor(Number(seals) || 0), send }
  // `inv` es AUTORITATIVO del servidor (Fase A.2): el bag se carga del personaje al entrar y sólo
  // lo mutan las funciones de abajo (loot otorgado por el server + ops validadas). Se guarda como
  // registros mínimos {id, count?, dur?, upgrade?} (el cliente reconstruye el ítem completo por id).
  p.inv = normalizeInv(inv)
  // Ledger "checkout" (anti-mint del bag_give): cuenta cuántas unidades de cada id el jugador tiene
  // LEGÍTIMAMENTE fuera del bag (equipo/cinturón/tumbas) o sacó del bag esta sesión (bag_take).
  // `bag_give` sólo puede devolver ítems contabilizados acá — no se inyectan ítems de la nada.
  // (Fase A.3) El ledger es AUTORITATIVO del server y PERSISTE en el personaje: si viene el ledger
  // guardado, se carga de ahí (el cliente no puede inflarlo tamperando el blob de equipo). Sólo la
  // PRIMERA vez (personaje sin ledger guardado) se hace grandfather desde el equipo/cinturón/tumbas
  // del blob; a partir de ahí el server lo dueña. Cierra el mint por save manipulado.
  p._out = new Map()
  if (ledger && typeof ledger === 'object') {
    for (const k of Object.keys(ledger)) { const oid = k | 0, c = ledger[k] | 0; if (c > 0 && itemById(oid)) p._out.set(oid, c) }
  } else if (Array.isArray(outSeed)) {   // grandfather (una vez): semilla desde el blob
    for (const oid of outSeed) { if (itemById(oid)) p._out.set(oid, (p._out.get(oid) || 0) + 1) }
    p._ledgerDirty = true   // persistir el ledger inicial para que la próxima sesión ya sea server-owned
  }
  // Quests narrativas YA reclamadas (server-owned, persistido): así la recompensa no se re-cobra tras
  // reiniciar/reloguear (antes vivía sólo en memoria -> mint por relogin con cliente tocado).
  p._qclaimed = new Set(Array.isArray(qclaimed) ? qclaimed : [])
  p.feats = normalizeFeats(feats)   // hazañas server-owned (jefes derrotados + zona más profunda)
  p.guildTag = guildTag || null     // estandarte sobre la cabeza (sigla del gremio)
  players.set(id, p)
  const present = inChannel(map, ch).filter((o) => o.id !== id).map(pub)
  broadcast(map, ch, { t: 'join', player: pub(p) }, id)
  combat.ensureWorld(map, ch)   // spawnea los enemigos + nodos del canal (una vez)
  const es = combat.snapshot(map, ch); if (es && es.length) send({ t: 'espawn', es })
  const ns = combat.nodeSnapshot(map, ch); if (ns && ns.length) send({ t: 'nspawn', ns })
  const cs = combat.chestSnapshot(map, ch); if (cs && cs.length) send({ t: 'cspawn', cs })
  sendFeats(p)                   // el jugador ve sus propias hazañas
  enterZone(id, map)             // registra la zona de entrada (por si es la más profunda)
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
    // Cambio de mapa (portal, server-acknowledged): la posición se acepta tal cual; el anti-teleport
    // sólo aplica DENTRO de un mapa. Reseteamos el reloj para no clampear el 1er move del mapa nuevo.
    p.map = map; p.ch = pickChannel(map, p.ch); p.x = x; p.y = y; if (dir != null) p.dir = dir
    p._lastMoveAt = 0
    broadcast(oldMap, oldCh, { t: 'leave', id }, id)
    const present = inChannel(map, p.ch).filter((o) => o.id !== id).map(pub)
    broadcast(map, p.ch, { t: 'join', player: pub(p) }, id)
    combat.ensureWorld(map, p.ch)   // enemigos + nodos del canal nuevo
    const es = combat.snapshot(map, p.ch); if (es && es.length) p.send({ t: 'espawn', es })
    const ns = combat.nodeSnapshot(map, p.ch); if (ns && ns.length) p.send({ t: 'nspawn', ns })
    const cs = combat.chestSnapshot(map, p.ch); if (cs && cs.length) p.send({ t: 'cspawn', cs })
    enterZone(id, map)              // hazaña: registra si esta zona es la más profunda alcanzada
    return { channel: p.ch, present }
  }
  // Anti-teleport: clampeá el salto al máximo plausible según el tiempo transcurrido. Legítimo =
  // no-op (dist <= presupuesto); teleport = arrastrado hacia el destino a velocidad normal.
  const nowMs = Date.now()
  const dt = p._lastMoveAt ? Math.min(MOVE_DT_CAP_MS, nowMs - p._lastMoveAt) : MOVE_DT_CAP_MS
  const budget = MOVE_TILES_PER_SEC * (dt / 1000) + MOVE_BASE_SLACK
  const dx = x - p.x, dy = y - p.y
  const dist = Math.hypot(dx, dy)
  let nx = x, ny = y
  if (dist > budget && dist > 0) { const k = budget / dist; nx = p.x + dx * k; ny = p.y + dy * k }   // clamp hacia el destino
  p._lastMoveAt = nowMs
  p.x = nx; p.y = ny; if (dir != null) p.dir = dir
  broadcastAoI(p.map, p.ch, nx, ny, { t: 'move', id, x: nx, y: ny, dir: p.dir }, id)
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
  tradeCancel(id)                // si estaba en un intercambio, se cancela (nadie se queda colgado)
  // No perder el oro de la tumba al desconectar: p._grave vive SOLO en memoria y se iría al soltar la
  // sesión (el jugador quedaría con el oro descontado y nada para recuperar). Se lo devolvemos al
  // saldo (que sí se persiste). Los ítems de la tumba siguen en el save del cliente y se recuperan
  // aparte (bagGive validado). Sin dupe: al reconectar p._grave arranca en 0, así el recover no
  // acredita de nuevo (el server es la fuente de verdad del oro).
  if (p._grave > 0) { p.gold += p._grave; p._grave = 0; p._goldDirty = true }
  persistGold(p)                 // guarda el oro autoritativo antes de soltar la sesión
  players.delete(id)
  combat.dropPlayer(id)
  broadcast(p.map, p.ch, { t: 'leave', id }, id)
}
// Igual que leave() pero AWAITEA la persistencia. Lo usa el login: al echar la sesión vieja de una
// cuenta (otra pestaña/reconexión), hay que persistir su oro ANTES de que el nuevo login lea el
// saldo, o cargaría oro viejo (race con el persist async del socket que cierra).
export async function leaveFlush(id) {
  if (observers.delete(id)) return
  const p = players.get(id)
  if (!p) return
  tradeCancel(id)
  if (p._grave > 0) { p.gold += p._grave; p._grave = 0; p._goldDirty = true }
  await persistGold(p)
  players.delete(id)
  combat.dropPlayer(id)
  broadcast(p.map, p.ch, { t: 'leave', id }, id)
}

// Pedido de ataque a un enemigo (del cliente). Lo resuelve la simulación autoritativa.
export function attack(id, eid) { combat.playerAttack(id, eid) }
// Habilidad especial M2: el cliente manda los enemigos alcanzados + daño; el server valida y aplica.
export function cast(id, hits) { combat.playerCast(id, hits) }
// Pedido de juntar un nodo de recurso (del cliente).
export function gather(id, nid) { combat.playerGather(id, nid) }
// Pedido de abrir un cofre (del cliente).
export function openChest(id, cid) { combat.playerOpenChest(id, cid) }
// El cliente envía sus stats de combate (dependen del equipo) para que el server tire el daño.
// Costo de respec AUTORITATIVO del server: se computa del nivel real del jugador (que el server
// conoce vía setStats), no del monto que manda el cliente. Cierra el under-pay del respec.
// Coincide con la fórmula del cliente (store.respecCost): 50 + 25×nivel.
export function respecCostOf(id) {
  const p = players.get(id)
  return p ? 50 + 25 * (p.level || 1) : 0
}

// Costo de reparar TODO el equipo, AUTORITATIVO del server: tarifa por nivel (no por durabilidad,
// que es client-side). Coincide con store.repairCost. Cierra el under-pay de la reparación sin
// tener que trackear la durabilidad pieza por pieza en el server.
export function repairCostOf(id) {
  const p = players.get(id)
  return p ? 30 + 20 * (p.level || 1) : 0
}

// Costo en ORO de forjar (mejorar una pieza), AUTORITATIVO del server: por nivel. Coincide con
// store.upgradeCost. Los cristales (que escalan con el upgrade) se validan aparte por bagConsume.
export function forgeCostOf(id) {
  const p = players.get(id)
  return p ? 60 + 30 * (p.level || 1) : 0
}

export function setStats(id, stats) {
  const p = players.get(id)
  if (p && stats && stats.level) {
    p.invCap = invCapForLevel(stats.level)
    const lv = stats.level | 0
    if (p.level !== lv) { p.level = lv; broadcast(p.map, p.ch, { t: 'plvl', id, level: lv }, id) }   // nivel visible para los demás
  }
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
// --- Ledger "checkout" del bag (anti-mint de bag_give) -------------------------------------------
function outInc(p, itemId, n = 1) { if (!p._out) p._out = new Map(); p._out.set(itemId, (p._out.get(itemId) || 0) + Math.max(1, n | 0)); p._ledgerDirty = true }
function outTake(p, itemId, n = 1) { const have = (p._out && p._out.get(itemId)) || 0; n = Math.max(1, n | 0); if (have < n) return false; p._out.set(itemId, have - n); p._ledgerDirty = true; return true }
// Ledger "checkout" server-owned de una cuenta con sesión (o null): objeto {id: cuenta} para persistir
// y que el handler `save` lo pise en el blob (el cliente no puede inflar lo que puede devolver).
export function ledgerOf(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) { const o = {}; if (p._out) for (const [k, v] of p._out) if (v > 0) o[k] = v; return o }
  return null
}
// El cliente sacó un ítem del bag hacia un store client-side (equipar/cinturón): queda "afuera",
// contabilizado para poder devolverlo después. Lo llama el handler bag_take (NO el depósito de gremio).
export function noteCheckout(id, itemId, qty = 1) { const p = players.get(id); if (p) outInc(p, itemId, qty) }
// ¿Puede el cliente devolver este ítem al bag? (está contabilizado como "afuera"). Lo consume si sí.
// Cierra "inyectar un ítem cualquiera por bag_give para venderlo". Lo llama el handler bag_give.
export function canReturn(id, itemId, qty = 1) { const p = players.get(id); return p ? outTake(p, itemId, qty) : false }

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
  for (let i = 0; i < p.inv.length; i++) { const x = p.inv[i]; if (x) { items.push(x); outInc(p, x.id, x.count || 1); p.inv[i] = null } }   // van a la tumba (afuera): contabilizados para recuperarlos
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
// Craftear una poción de alquimia AUTORITATIVO: el server valida la receta (shared), exige y consume
// los materiales del bag, y otorga la poción (faucet server-side, NO por bag_give). Cierra "craftear
// sin materiales" y el mint por bag_give del resultado. Devuelve { ok, out, inv } o error.
export function craftRecipe(id, outId) {
  const p = players.get(id); if (!p) return { ok: false }
  const r = recipeByOut(outId)
  if (!r) return { ok: false, error: 'receta inválida' }
  // Posesión TOTAL de todos los materiales antes de tocar nada.
  for (const [mid, qty] of r.ins) {
    let have = 0
    for (const x of p.inv) if (x && x.id === mid) have += (x.count || 1)
    if (have < qty) return { ok: false, error: 'no tenés materiales' }
  }
  // Consumir cada material.
  for (const [mid, qty] of r.ins) {
    let left = qty
    for (let i = 0; i < p.inv.length && left > 0; i++) {
      const x = p.inv[i]; if (!x || x.id !== mid) continue
      const c = x.count || 1; const take = Math.min(c, left); left -= take
      p.inv[i] = c - take > 0 ? { ...x, count: c - take } : null
    }
  }
  if (!invGrant(p, r.out, 1)) return { ok: false, error: 'inventario lleno' }
  p._invDirty = true
  return { ok: true, out: r.out, inv: p.inv }
}
// Comprar un ítem al mercader: el COSTO lo computa el server desde el precio real.
export function buyItem(id, itemId) {
  const p = players.get(id); if (!p) return { ok: false }
  if (!isVendorItem(itemId)) return { ok: false, error: 'ese ítem no está a la venta' }   // sólo lo que un vendedor ofrece (no legendarios al precio base)
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
// Sellos autoritativos actuales de una cuenta con sesión activa (o null). Lo usa el handler `save`
// para no dejar que el blob del cliente pise los sellos del server (moneda premium).
export function sealsOf(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) return p.seals
  return null
}

// --- Mercado: el ítem sale del bag al escrow del listado (server) y vuelve por grant server-side.
// Ni el ledger _out ni el cliente deciden nada: es todo autoritativo (como loot/compra/venta).
export function takeForListing(id, index) {
  const p = players.get(id); if (!p) return { ok: false }
  const rec = invRemoveAt(p, index | 0, 999999)   // el listado se lleva la pila entera del slot
  if (!rec) return { ok: false, error: 'no tenés ese ítem' }
  p._invDirty = true; p.send({ t: 'inv', inv: p.inv })
  return { ok: true, item: rec, inv: p.inv }
}
export function giveFromMarket(id, rec) {
  const p = players.get(id); if (!p || !rec) return { ok: false }
  const meta = {}; if (rec.dur != null) meta.dur = rec.dur; if (rec.upgrade) meta.upgrade = rec.upgrade
  if (!invGrant(p, rec.id, rec.count || 1, meta)) return { ok: false, error: 'inventario lleno' }
  p._invDirty = true; p.send({ t: 'inv', inv: p.inv })
  return { ok: true, inv: p.inv }
}
export function playerGold(id) { const p = players.get(id); return p ? p.gold : null }
export function hasBagRoom(id) {
  const p = players.get(id); if (!p) return false
  const cap = p.invCap || INV_MAX
  for (let i = 0; i < cap; i++) if (p.inv[i] == null) return true
  return false
}
export function chargeGold(id, amount) {
  const p = players.get(id); if (!p) return { ok: false }
  amount = Math.max(0, Math.floor(amount) || 0)
  if (p.gold < amount) return { ok: false, error: 'no tenés tanto oro', gold: p.gold }
  p.gold -= amount; p._goldDirty = true; p.send({ t: 'gold', gold: p.gold, reason: 'market' })
  return { ok: true, gold: p.gold }
}
// Acredita oro a una cuenta si está ONLINE (empuja el saldo). Devuelve true si la encontró (online);
// false si offline (el caller persiste al blob). Idem para devolver un ítem a un vendedor online.
export function creditAccountGold(accountId, amount, reason) {
  amount = Math.floor(amount) || 0
  for (const p of players.values()) if (p.accountId === accountId) { p.gold += amount; p._goldDirty = true; p.send({ t: 'gold', gold: p.gold, add: amount > 0 ? amount : 0, reason }); return true }
  return false
}
export function giveItemToAccount(accountId, rec) {
  for (const p of players.values()) if (p.accountId === accountId) { const meta = {}; if (rec.dur != null) meta.dur = rec.dur; if (rec.upgrade) meta.upgrade = rec.upgrade; if (invGrant(p, rec.id, rec.count || 1, meta)) { p._invDirty = true; p.send({ t: 'inv', inv: p.inv }); return true } return false }
  return null   // offline (distinto de false = online pero bag lleno)
}
export function playerIdOfAccount(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) return p.id
  return null
}
export function nameOf(id) { const p = players.get(id); return p ? p.name : '' }
export function accountOf(id) { const p = players.get(id); return p ? p.accountId : null }   // playerId -> accountId (para invitar)
// Actualiza el estandarte (sigla) del jugador y avisa a su canal para que los demás re-etiqueten.
export function setGuildTag(id, tag) {
  const p = players.get(id); if (!p) return
  p.guildTag = tag || null
  broadcast(p.map, p.ch, { t: 'gtag', id, tag: p.guildTag }, null)
}
export function notify(id, msg) { const p = players.get(id); if (p) p.send(msg) }             // empujar un mensaje a un jugador visible
function onlineByAccount(accountId) { for (const p of players.values()) if (p.accountId === accountId) return p; return null }
// Otorga la recompensa individual de un contrato de gremio completado (sellos a cada contribuyente).
// Los ONLINE se actualizan por su estado vivo (p.seals + flush diferido) y reciben aviso; los OFFLINE
// se persisten leyendo su saldo actual. Así no se pisa el saldo vivo de nadie.
async function grantContractRewards(r) {
  if (!r || !Array.isArray(r.rewards)) return
  for (const rw of r.rewards) {
    if (!rw || !rw.accountId || !(rw.seals > 0)) continue
    const on = onlineByAccount(rw.accountId)
    if (on) {
      on.seals = (on.seals || 0) + rw.seals; on._sealsDirty = true
      on.send({ t: 'seals', seals: on.seals, add: rw.seals, reason: 'guild_contract' })
    } else {
      try { const ch = await db.loadCharacter(rw.accountId); const cur = Math.floor(Number(ch?.data?.seals) || 0); await db.setCharacterSeals(rw.accountId, cur + rw.seals) } catch {}
    }
  }
}
// Difunde a los jugadores ONLINE cuya cuenta está en `accountIds` (chat de gremio, sin importar mapa).
export function guildBroadcast(accountIds, msg) {
  const set = accountIds instanceof Set ? accountIds : new Set(accountIds)
  for (const p of players.values()) if (p.accountId != null && set.has(p.accountId)) p.send(msg)
}

// --- Inspeccionar jugador: tarjeta pública (estilo "look") -------------------------------------
// El cliente del objetivo arma su propia tarjeta (display) y la manda con setCard; acá la guardamos
// saneada (clamps, para que nadie rompa la UI de otro con números basura). inspectCard la devuelve
// SÓLO si el que pide y el objetivo están en el mismo canal (se ven). Es de display, no autoritativa.
const RACES_OK = new Set(['humano', 'elfo', 'enano', 'orco'])
const SKILL_KEYS = ['combate', 'excavacion', 'herboristeria', 'alquimia', 'forja', 'saqueo']
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)))
const clampF = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || lo))
function sanitizeCard(c) {
  if (!c || typeof c !== 'object') return null
  const skills = {}
  for (const k of SKILL_KEYS) skills[k] = clampN(c.skills && c.skills[k], 1, 20)
  let guild = null
  if (c.guild && typeof c.guild === 'object' && c.guild.tag) {
    guild = { tag: String(c.guild.tag).slice(0, 3), color: /^#[0-9a-fA-F]{6}$/.test(c.guild.color || '') ? c.guild.color : '#c9a227' }
  }
  let set = null
  if (c.set && c.set.label) set = { label: String(c.set.label).slice(0, 24), pieces: clampN(c.set.pieces, 0, 6) }
  return {
    level: clampN(c.level, 1, 999), race: RACES_OK.has(c.race) ? c.race : null,
    hp: clampN(c.hp, 0, 9999999), hpMax: clampN(c.hpMax, 1, 9999999),
    mp: clampN(c.mp, 0, 9999999), mpMax: clampN(c.mpMax, 0, 9999999),
    dmgMin: clampN(c.dmgMin, 0, 99999), dmgMax: clampN(c.dmgMax, 0, 99999), defense: clampN(c.defense, 0, 99999),
    crit: clampN(c.crit, 0, 100), hpRegen: clampF(c.hpRegen, 0, 999), itemFind: clampN(c.itemFind, 0, 9999),
    fireResist: clampN(c.fireResist, 0, 100), iceResist: clampN(c.iceResist, 0, 100),
    speedMul: clampF(c.speedMul, 0.1, 9), xpMul: clampF(c.xpMul, 1, 9),
    set, skills, guild,
  }
}
export function setCard(id, card) { const p = players.get(id); if (p) p.card = sanitizeCard(card) }
export function inspectCard(viewerId, targetId) {
  const v = players.get(viewerId), t = players.get(targetId)
  if (!v || !t) return { error: 'no está' }
  if (v.map !== t.map || v.ch !== t.ch) return { error: 'fuera de vista' }   // sólo se inspecciona a quien ves
  return { id: t.id, name: t.name, level: t.level || 1, race: t.race || null, hp: t.hp, hpMax: t.hpMax, card: t.card || null, feats: publicFeats(t) }
}

// --- Hazañas: jefes derrotados + zona más profunda alcanzada (server-authoritative, persistidas) ---
// Nivel de referencia por zona curada (tope del rango de ESCENARIOS.md). Sólo para "zona más profunda
// alcanzada"; los mapas fuera de la tabla no cuentan (nivel 0). Se actualiza al ENTRAR (no al matar).
const MAP_LEVEL = {
  black_oak_farm: 3, river_trail: 5, salted_field: 6, greenwood_point: 1,
  lochport: 2, lochport_cemetery: 3, family_crypt: 2, merrimead_swamp: 2,
  goblin_cave: 8, goblin_camp: 2,
  abandoned_mines: 5, blackmire_mines: 5, lake_kuuma: 5, fort_amir: 7, grot_lagoon: 6,
  temple_of_mez_1: 8, temple_of_mez_2: 8, temple_of_mez_3: 9, antlion_nest: 6,
  st_maria_1: 9, perdition_mines: 9, stormrock_pass: 9,
  black_oak_city: 10, dilapidated_sewers: 11, wizards_tower_1: 12, wizards_tower_2: 12, wizards_tower_3: 12,
  southern_ridge: 9, mog_caverns: 10, nazia_highlands: 9, nazia_underground: 9, nazia_mines: 11,
  underworld: 13, underworld_catacombs: 13, underworld_mines: 14, underworld_stronghold_1: 14, underworld_stronghold_2: 15,
  oasis: 15, the_pit: 17,
}
function normalizeFeats(f) {
  const bosses = f && Array.isArray(f.bosses) ? [...new Set(f.bosses.filter((x) => typeof x === 'string'))] : []
  const dl = f && f.deepest && typeof f.deepest === 'object' ? f.deepest : null
  const deepest = dl ? { level: Math.max(0, dl.level | 0), map: typeof dl.map === 'string' ? dl.map : '' } : { level: 0, map: '' }
  return { bosses, deepest }
}
export function featsOf(accountId) { for (const p of players.values()) if (p.accountId === accountId) return p.feats || null; return null }
function publicFeats(p) {
  const f = (p && p.feats) || { bosses: [], deepest: { level: 0, map: '' } }
  return { bosses: f.bosses.length, bossList: f.bosses.slice(0, 16), bossTotal: combat.bossTotal(), deepest: f.deepest }
}
function persistFeats(p) { if (p.accountId) db.setCharacterFeats(p.accountId, p.feats).catch(() => {}) }
function sendFeats(p) { p.send({ t: 'feats', feats: publicFeats(p) }) }
// Suma un jefe permanente a las hazañas del jugador (dedupe por mapa). Lo llama combat al matarlo.
export function recordBoss(id, map) {
  const p = players.get(id); if (!p || !p.feats || p.feats.bosses.includes(map)) return
  p.feats.bosses.push(map); persistFeats(p); sendFeats(p)
}
// Marca la zona más profunda alcanzada (monótona). Se llama al entrar a un mapa.
export function enterZone(id, map) {
  const p = players.get(id); if (!p || !p.feats) return
  const lv = MAP_LEVEL[map] || 0
  if (lv > (p.feats.deepest.level || 0)) { p.feats.deepest = { level: lv, map }; persistFeats(p); sendFeats(p) }
}

// Salón de la Fama: rankings públicos de TODOS los personajes (online y offline), sobre datos
// server-autoritativos (nivel derivado del XP, hazañas persistidas). Tres tablas: por nivel, por
// jefes derrotados y por zona más profunda alcanzada. El límite lo acotamos server-side.
export async function hallOfFame(limit = 20) {
  const lim = Math.max(1, Math.min(50, (limit | 0) || 20))
  const rows = await db.allCharacterVitals()
  const list = rows.filter((r) => r.name).map((r) => {
    const f = normalizeFeats(r.feats)
    return { name: r.name, race: r.race || null, level: playerLevelFromXp(r.xp), bosses: f.bosses.length, deepest: f.deepest }
  })
  const top = (arr, cmp) => [...arr].sort(cmp).slice(0, lim)
  return {
    ok: true, bossTotal: combat.bossTotal(),
    byLevel: top(list, (a, b) => b.level - a.level || b.bosses - a.bosses),
    byBosses: top(list.filter((x) => x.bosses > 0), (a, b) => b.bosses - a.bosses || b.level - a.level),
    byDeepest: top(list.filter((x) => x.deepest.level > 0), (a, b) => b.deepest.level - a.deepest.level || b.level - a.level),
  }
}
// Persiste el oro autoritativo al personaje (al salir). setCharacterGold preserva el resto del blob.
async function persistGold(p) {
  if (!p || !p.accountId) return
  if (p._goldDirty) { p._goldDirty = false; try { await db.setCharacterGold(p.accountId, p.gold) } catch {} }
  if (p._sealsDirty) { p._sealsDirty = false; try { await db.setCharacterSeals(p.accountId, p.seals) } catch {} }
  if (p._invDirty) { p._invDirty = false; try { await db.setCharacterInventory(p.accountId, p.inv) } catch {} }
  if (p._ledgerDirty) { p._ledgerDirty = false; try { await db.setCharacterLedger(p.accountId, ledgerOf(p.accountId)) } catch {} }
}

// Persiste YA el oro vivo de una cuenta online (durabilidad inmediata). Lo usa el marketplace: la
// FILA de la orden es durable al instante, así que el descuento/crédito del oro tiene que serlo
// también, o un reinicio del server entre el cambio en memoria y el autosave del cliente duplicaría
// (cancelar tras reiniciar reacreditaría un oro que ya se había descontado) o perdería oro. Devuelve
// true si la cuenta estaba online y se persistió. setCharacterGold preserva el resto del blob.
export async function flushGold(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) { p._goldDirty = false; try { await db.setCharacterGold(p.accountId, p.gold) } catch {} return true }
  return false
}
// Persiste YA el bag vivo de una cuenta online. Lo usan los ESCROWS de ítems (subasta/alijo/gremio/
// tumba): el ítem sale del bag en memoria y el destino se escribe a DB al instante; si el proceso
// muere sin gracia en esa ventana, al reiniciar el bag persistido todavía tendría el ítem -> dupe.
// Flusheando el bag tras el escrow, el descuento es tan durable como el destino.
export async function flushInv(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) { p._invDirty = false; try { await db.setCharacterInventory(p.accountId, p.inv) } catch {} return true }
  return false
}
// Ids de quests narrativas ya reclamadas por una cuenta online (para que el save no las borre del
// blob: son server-owned, como el ledger). null si la cuenta no está online.
export function questClaimsOf(accountId) {
  for (const p of players.values()) if (p.accountId === accountId) return [...(p._qclaimed || [])]
  return null
}
// Flush de emergencia ante apagado (SIGTERM de un deploy / SIGINT): persiste oro+bag+ledger de TODOS
// los jugadores online antes de que el proceso muera, porque el handler de 'close' del socket no
// corre cuando matan el proceso. index.js lo llama en el shutdown.
export async function flushAll() {
  await Promise.all([...players.values()].map((p) => persistGold(p)))
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
  const seals = m.seals || 0
  if (seals > 0) { p.seals = (p.seals || 0) + seals; p._sealsDirty = true }   // sellos AUTORITATIVOS
  return { ok: true, gold: p.gold, add: gold, seals: p.seals, sealsAdd: seals }
}
// Cofre de sellos (loot box premium): AUTORITATIVO. El server DEBITA los sellos (rechaza si no
// alcanzan — cierra el mint del cliente tocado), tira el loot de la tabla COMPARTIDA y acredita oro.
// Los ítems van al bag autoritativo (empuja 'inv'); `drops` es sólo para la animación del cliente.
export const SEAL_CHEST_COST = 6   // sellos por cofre (debe coincidir con el cliente)
export function sealChest(id, level) {
  const p = players.get(id); if (!p) return { ok: false }
  if ((p.seals || 0) < SEAL_CHEST_COST) return { ok: false, error: 'no tenés tantos sellos', seals: p.seals || 0 }
  p.seals -= SEAL_CHEST_COST; p._sealsDirty = true
  const lvl = Math.max(4, Math.min(16, Math.floor(Number(level) || 4)))
  const roll = rollLoot('chest_level_' + lvl) || { gold: 0, drops: [] }
  const gold = roll.gold || 0
  if (gold > 0) { p.gold += gold; p._goldDirty = true }
  const drops = roll.drops || []
  if (drops.length) { for (const d of drops) invGrant(p, d.id, d.qty || 1); p._invDirty = true; p.send({ t: 'inv', inv: p.inv }) }
  return { ok: true, gold: p.gold, add: gold, seals: p.seals, drops }
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
const QUEST_GOLD = { guardianes: 150, diario: 180, torre: 280 }
const QUEST_SEALS = { guardianes: 8, diario: 10, torre: 15 }
export function claimQuest(id, questId) {
  const p = players.get(id); if (!p) return { ok: false }
  if (!p._qclaimed) p._qclaimed = new Set()
  if (p._qclaimed.has(questId)) return { ok: false, error: 'ya reclamada', gold: p.gold }
  p._qclaimed.add(questId)
  db.setCharacterQuestClaims(p.accountId, [...p._qclaimed]).catch(() => {})   // persistir YA (anti re-claim por relogin)
  const gold = QUEST_GOLD[questId] || 0
  if (gold > 0) { p.gold += gold; p._goldDirty = true }
  const seals = QUEST_SEALS[questId] || 0
  if (seals > 0) { p.seals = (p.seals || 0) + seals; p._sealsDirty = true }   // sellos AUTORITATIVOS
  return { ok: true, gold: p.gold, add: gold, seals: p.seals, sealsAdd: seals }
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

// --- Trade P2P (ítems + oro, swap ATÓMICO server-side) -------------------------------------------
// Dos jugadores cercanos intercambian. Cada uno ofrece ítems del bag (por índice) + oro; con doble
// confirmación el server valida posesión y hace el swap SINCRÓNICO (atómico: sin await, no se
// interleavea con otra sesión). Cualquier cambio de oferta resetea ambas confirmaciones.
const TRADE_REACH = 6      // tiles: hay que estar cerca para comerciar
const trades = new Map()   // tid -> { a, b, offer:{[pid]:{items:Set<idx>, gold}}, ok:{[pid]:bool} }
let tradeSeq = 1
const tradeOf = (pid) => { for (const [tid, t] of trades) if (t.a === pid || t.b === pid) return { tid, t }; return null }
const nearP = (a, b) => !!a && !!b && a.map === b.map && a.ch === b.ch && ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) <= TRADE_REACH * TRADE_REACH

function offerView(p, off) {
  const items = []
  for (const idx of off.items) { const it = p.inv[idx]; if (it) items.push({ index: idx, id: it.id, count: it.count || 1, dur: it.dur, upgrade: it.upgrade }) }
  return { items, gold: off.gold || 0 }
}
function pushTradeState(t) {
  const A = players.get(t.a), B = players.get(t.b); if (!A || !B) return
  const va = offerView(A, t.offer[t.a]), vb = offerView(B, t.offer[t.b])
  A.send({ t: 'trade_state', you: va, them: vb, youOk: t.ok[t.a], themOk: t.ok[t.b] })
  B.send({ t: 'trade_state', you: vb, them: va, youOk: t.ok[t.b], themOk: t.ok[t.a] })
}
function endTrade(tid, A, B, msg) { trades.delete(tid); if (A) A.send({ t: 'trade_cancel', reason: msg }); if (B) B.send({ t: 'trade_cancel', reason: msg }) }
// Mete un registro en un array de bag (copia de simulación): apila si corresponde, si no al 1er hueco
// dentro de la capacidad. Devuelve true/false (sin tocar el bag real).
function simAdd(inv, cap, rec) {
  if (isStack(rec.id)) { const at = inv.findIndex((x) => x && x.id === rec.id); if (at >= 0) { inv[at] = { ...inv[at], count: (inv[at].count || 1) + (rec.count || 1) }; return true } }
  let free = -1; for (let i = 0; i < cap; i++) if (inv[i] == null) { free = i; break }
  if (free < 0) return false
  const nr = { id: rec.id }; if (rec.count && rec.count > 1) nr.count = rec.count; if (rec.dur != null) nr.dur = rec.dur; if (rec.upgrade) nr.upgrade = rec.upgrade
  inv[free] = nr; return true
}

export function tradeRequest(fromId, toId) {
  const a = players.get(fromId), b = players.get(toId)
  if (!a || !b || fromId === toId) return { ok: false, error: 'jugador inválido' }
  if (!nearP(a, b)) return { ok: false, error: 'está muy lejos' }
  if (tradeOf(fromId) || tradeOf(toId)) return { ok: false, error: 'ya hay un intercambio en curso' }
  b.send({ t: 'trade_req', from: fromId, name: a.name })
  return { ok: true }
}
export function tradeAccept(toId, fromId) {
  const a = players.get(fromId), b = players.get(toId)
  if (!a || !b) return { ok: false, error: 'jugador inválido' }
  if (!nearP(a, b)) return { ok: false, error: 'está muy lejos' }
  if (tradeOf(fromId) || tradeOf(toId)) return { ok: false, error: 'ocupado' }
  const tid = tradeSeq++
  const t = { a: fromId, b: toId, offer: { [fromId]: { items: new Set(), gold: 0 }, [toId]: { items: new Set(), gold: 0 } }, ok: { [fromId]: false, [toId]: false } }
  trades.set(tid, t)
  a.send({ t: 'trade_open', with: { id: toId, name: b.name } })
  b.send({ t: 'trade_open', with: { id: fromId, name: a.name } })
  pushTradeState(t)
  return { ok: true }
}
export function tradeOffer(pid, items, gold) {
  const found = tradeOf(pid); if (!found) return { ok: false }
  const p = players.get(pid); if (!p) return { ok: false }
  const off = found.t.offer[pid]
  off.items = new Set((Array.isArray(items) ? items : []).map((i) => i | 0).filter((i) => i >= 0 && i < p.inv.length && p.inv[i]))
  off.gold = Math.max(0, Math.min(p.gold, Math.floor(Number(gold) || 0)))
  found.t.ok[found.t.a] = false; found.t.ok[found.t.b] = false   // cambiar la oferta resetea ambas confirmaciones
  pushTradeState(found.t)
  return { ok: true }
}
export function tradeConfirm(pid) {
  const found = tradeOf(pid); if (!found) return { ok: false }
  const t = found.t
  t.ok[pid] = true
  if (t.ok[t.a] && t.ok[t.b]) return executeTrade(found.tid, t)
  pushTradeState(t)
  return { ok: true }
}
export function tradeCancel(pid) { const found = tradeOf(pid); if (found) endTrade(found.tid, players.get(found.t.a), players.get(found.t.b), 'cancelado') }

// Swap ATÓMICO: valida ambas ofertas contra el estado ACTUAL (posesión + oro + capacidad del
// receptor, simulando en copias) y sólo si TODO entra, aplica junto. Sin await -> no se interleavea.
function executeTrade(tid, t) {
  const A = players.get(t.a), B = players.get(t.b)
  if (!A || !B) { endTrade(tid, A, B, 'se fue un jugador'); return { ok: false } }
  if (!nearP(A, B)) { endTrade(tid, A, B, 'está muy lejos'); return { ok: false } }
  const oa = t.offer[t.a], ob = t.offer[t.b]
  const grab = (p, off) => { const recs = []; for (const idx of off.items) { const it = p.inv[idx]; if (!it) return null; recs.push(it) } if (p.gold < (off.gold || 0)) return null; return recs }
  const aItems = grab(A, oa), bItems = grab(B, ob)
  if (!aItems || !bItems) { endTrade(tid, A, B, 'cambió el inventario'); return { ok: false } }
  // simular el swap en copias (sacar lo ofrecido, meter lo recibido) — valida capacidad de ambos
  const simA = A.inv.slice(), simB = B.inv.slice()
  for (const idx of oa.items) simA[idx] = null
  for (const idx of ob.items) simB[idx] = null
  const capA = A.invCap || INV_MAX, capB = B.invCap || INV_MAX
  for (const rec of aItems) if (!simAdd(simB, capB, rec)) { endTrade(tid, A, B, 'inventario lleno'); return { ok: false } }
  for (const rec of bItems) if (!simAdd(simA, capA, rec)) { endTrade(tid, A, B, 'inventario lleno'); return { ok: false } }
  // COMMIT (atómico)
  A.inv = simA; B.inv = simB
  A.gold += (ob.gold || 0) - (oa.gold || 0)
  B.gold += (oa.gold || 0) - (ob.gold || 0)
  A._invDirty = B._invDirty = true; A._goldDirty = B._goldDirty = true
  trades.delete(tid)
  A.send({ t: 'trade_done' }); A.send({ t: 'inv', inv: A.inv }); A.send({ t: 'gold', gold: A.gold, reason: 'trade' })
  B.send({ t: 'trade_done' }); B.send({ t: 'inv', inv: B.inv }); B.send({ t: 'gold', gold: B.gold, reason: 'trade' })
  return { ok: true }
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
  recordBoss: (id, map) => recordBoss(id, map),                             // hazaña: jefe permanente derrotado
  guildContractDone: (r) => grantContractRewards(r),                        // recompensa a los que aportaron al contrato
})
combat.start()

// Info de canales de un mapa (para diagnóstico / UI): [{ channel, count, cap }].
export function channels(map) {
  return [...channelCounts(map).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([channel, count]) => ({ channel, count, cap: CHANNEL_CAP }))
}
