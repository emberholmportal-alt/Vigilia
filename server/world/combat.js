// Simulación de combate AUTORITATIVA del servidor (Fase 1 del online).
//
// Problema que resuelve: hoy cada cliente spawnea sus propios enemigos, así que dos jugadores
// del mismo canal NO ven ni pelean los mismos monstruos — no hay co-op. Acá el SERVIDOR es dueño
// de los enemigos: los spawnea desde los spawners del mapa, corre su IA (aggro, movimiento,
// ataque) y transmite su estado al canal. El jugador pide atacar; el server valida y resuelve.
//
// Reparto de autoridad (Fase 1):
//   · Enemigos: 100% server (posición, HP, muerte, respawn). Se transmiten al canal.
//   · Golpe jugador->enemigo: el server tira el daño con las stats que el cliente envió (setstats)
//     y valida el alcance. Al morir, avisa al matador (xp) y difunde la muerte.
//   · Botín/oro: instanciado en el cliente (lo tira local al recibir 'ekill'); sin ítems en el
//     suelo compartidos todavía (Fase 2). Evita robo de loot y netcode de ground-items.
//   · HP/muerte del JUGADOR: sigue en el cliente por ahora (Fase 3). El server sólo le manda el
//     daño recibido ('ehit').
//
// Las reglas de enemigos salen de shared/bestiary.js (mismas que usa el cliente offline).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pickSprite, enemyStats, isRanged, rangedCousin } from '../../shared/bestiary.js'
import { GATHER } from '../../shared/gather.js'

const MAPS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/maps')

// Inyectado por rooms.js para no acoplar módulos (evita import circular).
//   playersIn(map, ch) -> [{ id, x, y }]   · sendTo(id, msg)   · broadcast(map, ch, msg)
let ctx = null
export function init(c) { ctx = c }

// --- carga de mapas (spawners + colisión) ---------------------------------------------------
const mapCache = new Map()   // name -> { w, h, coll, spawners } | null
function loadMap(name) {
  if (mapCache.has(name)) return mapCache.get(name)
  let data = null
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, name + '.json'), 'utf8'))
    const coll = raw.layers && raw.layers.collision
    data = { w: raw.w, h: raw.h, coll, spawners: raw.spawners || [] }
  } catch { data = null }
  mapCache.set(name, data)
  return data
}
const isWalkable = (map, x, y) => {
  const xi = x | 0, yi = y | 0
  if (xi < 0 || yi < 0 || xi >= map.w || yi >= map.h) return false
  return (map.coll[yi] && map.coll[yi][xi]) === 0
}
function randInt(r) { const a = Array.isArray(r) ? r[0] : r, b = Array.isArray(r) ? r[1] : r; return a + Math.floor(Math.random() * (b - a + 1)) }
function randTileIn(map, sp) {
  for (let i = 0; i < 14; i++) {
    const x = sp.x + Math.floor(Math.random() * (sp.w || 1))
    const y = sp.y + Math.floor(Math.random() * (sp.h || 1))
    if (isWalkable(map, x, y)) return { x, y }
  }
  return null
}

// --- mundos por (mapa, canal) ---------------------------------------------------------------
const worlds = new Map()   // "map:ch" -> world
let eidSeq = 1
let nidSeq = 1
const key = (map, ch) => map + ':' + ch

const AGGRO = 8          // tiles a los que el enemigo detecta al jugador
const MELEE = 1.4        // alcance cuerpo a cuerpo
const RANGED_REACH = 6   // alcance de arqueros/magos
const SPEED = 2.3        // tiles por segundo
const ATK_CD = 1.3       // segundos entre ataques del enemigo
const RESPAWN = 12       // segundos para reponer un enemigo muerto
const MAX_PER_MAP = 40
const NODE_RESPAWN = 25  // segundos para que un nodo de recurso vuelva a crecer
const GATHER_REACH = 2.4 // tiles: alcance para juntar un nodo

// Tile caminable al azar en todo el mapa (para nodos de recursos), evitando repetir.
function randWalkable(map, used) {
  for (let i = 0; i < 40; i++) {
    const x = 1 + Math.floor(Math.random() * (map.w - 2))
    const y = 1 + Math.floor(Math.random() * (map.h - 2))
    if (!isWalkable(map, x, y)) continue
    if (used.has(y * map.w + x)) continue
    used.add(y * map.w + x)
    return { x, y }
  }
  return null
}
// Elige un material de recurso segun el bioma (las minas/cuevas dan mas cristal).
function pickMaterial(mine) {
  const skill = (mine ? Math.random() < 0.6 : Math.random() < 0.35) ? 'excavacion' : 'herboristeria'
  const opts = GATHER[skill]
  const mat = opts[Math.floor(Math.random() * opts.length)]
  return { id: mat.id, name: mat.name, glow: mat.glow, base: mat.base, skill }
}

function spawnEnemy(map, sp) {
  const tile = randTileIn(map, sp)
  if (!tile) return null
  const level = randInt(sp.level || [1, 1])
  let sprite = pickSprite(sp.category || 'goblin')
  const cousin = rangedCousin(sprite)
  if (cousin && Math.random() < 0.3) sprite = cousin
  const st = enemyStats(sprite, level)
  return {
    i: eidSeq++, s: sprite, lv: level, x: tile.x + 0.5, y: tile.y + 0.5, d: 7,
    hp: st.hpMax, hpm: st.hpMax, dmg: st.damage, xp: st.xp,
    rng: isRanged(sprite), atkCd: 0, home: { x: tile.x, y: tile.y }, sp,
  }
}

// Crea (una vez) el mundo de enemigos de un canal si el mapa tiene spawners.
export function ensureWorld(map, ch) {
  const k = key(map, ch)
  if (worlds.has(k)) return
  const md = loadMap(map)
  if (!md || !md.spawners.length) { worlds.set(k, null); return }   // mapa sin combate (pueblo)
  const enemies = new Map()
  for (const sp of md.spawners) {
    const n = randInt(sp.n || [1, 1])
    for (let i = 0; i < n && enemies.size < MAX_PER_MAP; i++) {
      const e = spawnEnemy(md, sp)
      if (e) enemies.set(e.i, e)
    }
  }
  // Nodos de recursos (hierbas / vetas de cristal), compartidos por el canal. El pueblo no tiene.
  const nodes = new Map()
  if (map !== 'triston') {
    const mine = /mine|cave|cavern|underground|labyrinth|pit/i.test(map)
    const used = new Set()
    const total = 5 + randInt([0, 3])
    for (let i = 0; i < total; i++) {
      const t = randWalkable(md, used); if (!t) continue
      const mat = pickMaterial(mine)
      nodes.set(nidSeq, { n: nidSeq, x: t.x, y: t.y, ...mat }); nidSeq++
    }
  }
  worlds.set(k, { map, ch, md, enemies, dead: [], nodes, nodeDead: [] })
}

// Snapshot completo de los enemigos de un canal (para el que recién entra).
export function snapshot(map, ch) {
  const w = worlds.get(key(map, ch))
  if (!w) return null
  return [...w.enemies.values()].map((e) => ({ i: e.i, s: e.s, lv: e.lv, x: r2(e.x), y: r2(e.y), d: e.d, hp: e.hp, hpm: e.hpm, rng: e.rng }))
}

// Snapshot de los nodos de recursos de un canal (para el que recién entra).
export function nodeSnapshot(map, ch) {
  const w = worlds.get(key(map, ch))
  if (!w || !w.nodes) return null
  return [...w.nodes.values()].map(pubNode)
}
const pubNode = (nd) => ({ n: nd.n, x: nd.x, y: nd.y, id: nd.id, name: nd.name, glow: nd.glow, base: nd.base, skill: nd.skill })

// Pedido de juntar un nodo (del cliente). Valida el alcance, lo agota, difunde y programa el
// respawn. El material/skill se le avisa al que junta (tira la cantidad local, instanciado).
export function playerGather(pid, nid) {
  if (!ctx) return
  const pl = ctx.getPlayer(pid)
  if (!pl) return
  const w = worlds.get(key(pl.map, pl.ch))
  if (!w || !w.nodes) return
  const nd = w.nodes.get(nid)
  if (!nd) return
  const dx = pl.x - (nd.x + 0.5), dy = pl.y - (nd.y + 0.5)
  if (dx * dx + dy * dy > GATHER_REACH * GATHER_REACH) return   // fuera de alcance
  w.nodes.delete(nid)
  w.nodeDead.push({ x: nd.x, y: nd.y, at: now() + NODE_RESPAWN * 1000 })
  ctx.broadcast(w.map, w.ch, { t: 'ndeplete', n: nid, by: pid })
  ctx.sendTo(pid, { t: 'ngather', n: nid, id: nd.id, skill: nd.skill })
}

// --- stats de combate del jugador (las envía el cliente) ------------------------------------
const pstats = new Map()   // playerId -> { dmgMin, dmgMax, dmgMul, str, crit, weaponKind, reach, defense }
export function setStats(pid, s) { if (s && typeof s === 'object') pstats.set(pid, s) }
export function dropPlayer(pid) { pstats.delete(pid) }

// Golpe jugador -> enemigo (pedido por el cliente). El server tira el daño con las stats del
// jugador y valida el alcance. Devuelve nada; difunde el resultado.
export function playerAttack(pid, eid) {
  if (!ctx) return
  const pl = ctx.getPlayer(pid)
  if (!pl) return
  const w = worlds.get(key(pl.map, pl.ch))
  if (!w) return
  const e = w.enemies.get(eid)
  if (!e || e.hp <= 0) return
  const st = pstats.get(pid) || {}
  const reach = (st.reach || (st.weaponKind && st.weaponKind !== 'melee' ? RANGED_REACH : MELEE)) + 0.6
  const dx = pl.x - e.x, dy = pl.y - e.y
  if (dx * dx + dy * dy > reach * reach) return   // fuera de alcance: no valida
  const { dmg, crit } = rollPlayerDamage(st)
  e.hp -= dmg
  ctx.broadcast(pl.map, pl.ch, { t: 'edmg', i: e.i, hp: Math.max(0, e.hp), dmg, crit, by: pid })
  if (e.hp <= 0) killEnemy(w, e, pid)
}

function rollPlayerDamage(st) {
  const min = st.dmgMin || 2, max = st.dmgMax || 5
  const raw = (min + Math.random() * (max - min)) * (st.dmgMul || 1) + (st.str || 10) * 0.2
  const crit = (st.crit || 0) > 0 && Math.random() * 100 < st.crit
  return { dmg: Math.max(1, Math.round(raw * (crit ? 2 : 1))), crit }
}

function killEnemy(w, e, killerId) {
  w.enemies.delete(e.i)
  w.dead.push({ sp: e.sp, at: now() + RESPAWN * 1000 })
  ctx.broadcast(w.map, w.ch, { t: 'edie', i: e.i, by: killerId })
  // Aviso al matador: XP autoritativa del server; el loot/oro lo tira él local (instanciado).
  ctx.sendTo(killerId, { t: 'ekill', i: e.i, xp: e.xp, sprite: e.s, lv: e.lv })
}

// --- bucle de simulación --------------------------------------------------------------------
const now = () => Date.now()
let _last = now()
let _tick = 0
function step() {
  const t = now(); const dt = Math.min(0.25, (t - _last) / 1000); _last = t
  _tick++
  const sendState = _tick % 2 === 0   // estado de posiciones ~5 Hz
  for (const w of worlds.values()) {
    if (!w) continue
    const players = ctx.playersIn(w.map, w.ch)
    if (!players.length) continue      // canal vacío: se pausa
    // reponer muertos
    if (w.dead.length && w.enemies.size < MAX_PER_MAP) {
      const still = []
      for (const d of w.dead) {
        if (t >= d.at) { const e = spawnEnemy(w.md, d.sp); if (e) { w.enemies.set(e.i, e); ctx.broadcast(w.map, w.ch, { t: 'espawn', es: [pubEnemy(e)] }) } }
        else still.push(d)
      }
      w.dead = still
    }
    for (const e of w.enemies.values()) stepEnemy(w, e, players, dt)
    // reponer nodos de recursos agotados (vuelven a crecer en su lugar, con material fresco)
    if (w.nodeDead && w.nodeDead.length) {
      const still = []
      const mine = /mine|cave|cavern|underground|labyrinth|pit/i.test(w.map)
      for (const d of w.nodeDead) {
        if (t >= d.at) {
          const mat = pickMaterial(mine)
          const nd = { n: nidSeq++, x: d.x, y: d.y, ...mat }
          w.nodes.set(nd.n, nd)
          ctx.broadcast(w.map, w.ch, { t: 'nspawn', ns: [pubNode(nd)] })
        } else still.push(d)
      }
      w.nodeDead = still
    }
    if (sendState) broadcastState(w, players)
  }
}

function stepEnemy(w, e, players, dt) {
  if (e.atkCd > 0) e.atkCd -= dt
  // objetivo: jugador más cercano dentro del aggro
  let tgt = null, best = AGGRO * AGGRO
  for (const p of players) {
    const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy
    if (d2 < best) { best = d2; tgt = p }
  }
  if (!tgt) return
  const dx = tgt.x - e.x, dy = tgt.y - e.y
  const dist = Math.hypot(dx, dy)
  const reach = e.rng ? RANGED_REACH : MELEE
  if (dist > reach) {
    // paso hacia el objetivo (greedy, respeta colisión por tile)
    const nx = e.x + (dx / dist) * SPEED * dt
    const ny = e.y + (dy / dist) * SPEED * dt
    if (isWalkable(w.md, nx, e.y)) e.x = nx
    if (isWalkable(w.md, e.x, ny)) e.y = ny
    e.d = vecToDir(dx, dy)
  } else if (e.atkCd <= 0) {
    e.atkCd = ATK_CD
    e.d = vecToDir(dx, dy)
    const st = pstats.get(tgt.id) || {}
    const dmg = Math.max(1, e.dmg - (st.defense || 0))
    ctx.sendTo(tgt.id, { t: 'ehit', i: e.i, dmg })
  }
}

function broadcastState(w, players) {
  const es = [...w.enemies.values()].map((e) => ({ i: e.i, x: r2(e.x), y: r2(e.y), d: e.d, hp: e.hp }))
  if (es.length) ctx.broadcast(w.map, w.ch, { t: 'estate', es })
}

const pubEnemy = (e) => ({ i: e.i, s: e.s, lv: e.lv, x: r2(e.x), y: r2(e.y), d: e.d, hp: e.hp, hpm: e.hpm, rng: e.rng })
const r2 = (v) => Math.round(v * 100) / 100
// Vector de pantalla -> dirección Flare (0=SW 1=W 2=NW 3=N 4=NE 5=E 6=SE 7=S), en coords de tile.
function vecToDir(dx, dy) {
  const ang = Math.atan2(dy, dx)   // en espacio de tiles
  const oct = (Math.round((ang / Math.PI) * 4) + 8) % 8
  // mapea octante de tile a las 8 dirs iso del sprite
  return [5, 6, 7, 0, 1, 2, 3, 4][oct]
}

let _timer = null
export function start() { if (!_timer) { _last = now(); _timer = setInterval(step, 100) } }
export function stop() { if (_timer) { clearInterval(_timer); _timer = null } }
