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
import { pickSprite, enemyStats, isRanged, rangedCousin, enemyAbility } from '../../shared/bestiary.js'
import { GATHER } from '../../shared/gather.js'
import { rollLoot, hasLootTable } from '../../shared/loot.js'
import { rollMonsterDrop } from '../../shared/drops.js'
import { todayContract } from '../../shared/missions.js'
import * as guilds from '../systems/guilds.js'

const MAPS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/maps')

// Inyectado por rooms.js para no acoplar módulos (evita import circular).
//   playersIn(map, ch) -> [{ id, x, y }]   · sendTo(id, msg)   · broadcast(map, ch, msg)
let ctx = null
export function init(c) { ctx = c }

// --- carga de mapas (spawners + colisión) ---------------------------------------------------
const mapCache = new Map()   // name -> { w, h, coll, spawners } | null
// Algunos mapas de Flare quedaron FRAGMENTADOS al convertir: Flare teletransportaba entre salas,
// y nuestro modelo es caminata pura, así que las salas quedaron como islas de colisión inconexas.
// Cuando el spawn nativo cae en un bolsón chico (poca acción), lo reanclamos a la isla con MÁS
// contenido para que la zona rinda como el dungeon que debía ser. El spawn manda para el servidor
// (jefe + densificado de entrada) y para el cliente (llegada + pads); por eso se corrige acá, en
// una sola fuente. El cliente usa el mismo tile en HUB_SPAWN/portales.
const SPAWN_OVERRIDE = {
  wizards_tower_1: [52, 9], // isla rica (16 spawners) en vez del bolsón de la entrada (2 spawners)
  // Templo de Mez (3 pisos): cada planta quedó troceada; anclamos a la isla más poblada de cada una.
  temple_of_mez_1: [35, 46], // isla #0 (1058 tiles, 8 spawners) — el Sótano
  temple_of_mez_2: [40, 34], // isla #0 (3076 tiles, 19 spawners) — el Gran Salón
  temple_of_mez_3: [53, 40], // isla #0 (1044 tiles, 4 spawners) — la Entrada (jefe)
  // Cluster costero de Lochport (nivel 2-3): reanclamos a un tile CENTRAL de la isla rica de cada
  // mapa, para que la llegada del cliente (HUB_SPAWN, mismo tile) coincida con el densificado del
  // server (near-spawners/cofres/jefe). En family_crypt además el spawn nativo caía en un bolsón.
  lochport: [28, 34],          // isla #0 (1444 tiles, 12 spawners)
  lochport_cemetery: [20, 44], // isla #0 (2059 tiles, 20 spawners)
  family_crypt: [10, 39],      // isla #0 (388 tiles, 7 spawners) — nativo caía en el bolsón #1
  merrimead_swamp: [29, 39],   // isla #0 (1622 tiles, 16 spawners)
  // Cluster de las Minas Abandonadas (nivel 5-6): reanclado central (spawn nativo en esquina).
  abandoned_mines: [40, 53],   // hub del cluster
  blackmire_mines: [32, 36],
  lake_kuuma: [70, 52],
  fort_amir: [40, 34],         // dungeon final (jefe)
  grot_lagoon: [45, 49],
}
function loadMap(name) {
  if (mapCache.has(name)) return mapCache.get(name)
  let data = null
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, name + '.json'), 'utf8'))
    const coll = raw.layers && raw.layers.collision
    data = { w: raw.w, h: raw.h, coll, spawn: raw.spawn || null, spawners: raw.spawners || [], chests: raw.chests || [] }
    if (data && SPAWN_OVERRIDE[name]) data.spawn = SPAWN_OVERRIDE[name]
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

// Tile caminable en un anillo [rMin, rMax] alrededor de (cx, cy), sin repetir. Para densificar la
// entrada de cada mapa salvaje.
function nearWalkable(map, cx, cy, rMin, rMax, used) {
  for (let i = 0; i < 60; i++) {
    const ang = Math.random() * Math.PI * 2
    const r = rMin + Math.random() * (rMax - rMin)
    const x = Math.round(cx + Math.cos(ang) * r)
    const y = Math.round(cy + Math.sin(ang) * r)
    if (!isWalkable(map, x, y)) continue
    const idx = y * map.w + x
    if (used.has(idx)) continue
    used.add(idx)
    return { x, y }
  }
  return null
}
// Categorías "de entrada": las del mapa, evitando jefes (no querés un minotauro en la puerta).
function entryCats(md) {
  const raw = [...new Set((md.spawners || []).map((s) => s.category).filter(Boolean))]
  const common = raw.filter((c) => !/chief|boss|necromancer|elite|knight/i.test(c))
  return common.length ? common : (raw.length ? raw : ['goblin'])
}
// Nivel de entrada: el más bajo de los spawners del mapa (para no castigar al que recién llega).
function entryLevel(md) {
  let lo = 99
  for (const s of md.spawners || []) { const l = Array.isArray(s.level) ? s.level[0] : s.level; if (l && l < lo) lo = l }
  return lo === 99 ? [1, 1] : [lo, lo]
}
// Spawners sintéticos alrededor de la entrada (respawnean como cualquier otro).
function buildNearSpawners(md, used) {
  if (!md.spawn) return []
  const [cx, cy] = md.spawn
  const cats = entryCats(md), lvl = entryLevel(md)
  const out = []
  for (let i = 0; i < NEAR_CLUSTERS; i++) {
    const t = nearWalkable(md, cx, cy, NEAR_MIN, NEAR_RADIUS, used)
    if (!t) continue
    out.push({ x: Math.max(0, t.x - 1), y: Math.max(0, t.y - 1), w: 3, h: 3, category: cats[i % cats.length], level: lvl, n: NEAR_PER, near: true })
  }
  return out
}
// Cofres garantizados cerca de la entrada (reusan la tabla de loot del mapa o una acorde al nivel).
function buildNearChests(md, used) {
  if (!md.spawn) return []
  const [cx, cy] = md.spawn
  const loot = (md.chests[0] && md.chests[0].loot) || ('chest_level_' + Math.max(1, Math.min(16, entryLevel(md)[0])) + '.txt')
  const out = []
  for (let i = 0; i < NEAR_CHESTS; i++) {
    const t = nearWalkable(md, cx, cy, NEAR_MIN, NEAR_RADIUS, used)
    if (!t) continue
    out.push({ x: t.x, y: t.y, loot })
  }
  return out
}

// --- mundos por (mapa, canal) ---------------------------------------------------------------
const worlds = new Map()   // "map:ch" -> world
let eidSeq = 1
let nidSeq = 1
let cidSeq = 1
const key = (map, ch) => map + ':' + ch

const AGGRO = 6          // tiles a los que el enemigo detecta al jugador (bajado: menos enjambre para novatos)
const MELEE = 1.4        // alcance cuerpo a cuerpo
const RANGED_REACH = 6   // alcance de arqueros/magos
const SPEED = 2.3        // tiles por segundo
const ATK_CD = 1.3       // segundos entre ataques del enemigo
const RESPAWN = 12       // segundos base para reponer un enemigo muerto (escala con la gente)
const MIN_RESPAWN = 4    // piso del respawn cuando el canal está lleno de jugadores
const MAX_PER_MAP = 48
const NODE_RESPAWN = 25  // segundos para que un nodo de recurso vuelva a crecer
const GATHER_REACH = 2.4 // tiles: alcance para juntar un nodo
const CHEST_RESPAWN = 90 // segundos base para que un cofre saqueado reaparezca (escala con la gente)
const MIN_CHEST_RESPAWN = 30 // piso del respawn de cofres con el canal lleno
const CHEST_REACH = 2.4  // tiles: alcance para abrir un cofre
const WORLD_GC_MS = 120000 // ms que un canal puede estar vacío antes de liberar su mundo (memoria)

// Densidad cerca del punto de entrada. Los mapas de Flare son enormes (hasta 100×100) y te dejan
// en un borde, con los spawners repartidos por todo el mapa: al llegar ves un desierto. Estos
// clusters garantizan acción apenas entrás, sin tocar los 56 JSON. Compartidos por canal (regla 2).
const NEAR_RADIUS = 16   // tiles: radio máximo desde la entrada donde garantizamos contenido
const NEAR_MIN = 5       // tiles: radio mínimo (no spawnear encima del jugador)
const NEAR_CLUSTERS = 3  // grupitos de enemigos cerca de la entrada (bajado: menos enjambre)
const NEAR_PER = [1, 2]  // enemigos por grupo cercano
const NEAR_CHESTS = 2    // cofres garantizados cerca de la entrada

// Respawn que escala con la población del canal: más jugadores farmeando la misma zona compartida
// => reponemos más rápido para que la entrada no quede pelada. Con 1 jugador usa el valor base.
function respawnDelay(w, base, floor) {
  const n = (ctx && ctx.playersIn) ? ctx.playersIn(w.map, w.ch).length : 1
  return Math.max(floor, base / Math.sqrt(Math.max(1, n)))
}

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
    hp: st.hpMax, hpm: st.hpMax, dmg: st.damage, xp: st.xp, gold: st.gold,
    rng: isRanged(sprite), atkCd: 0, home: { x: tile.x, y: tile.y }, sp,
  }
}

// Élite de contrato: un enemigo más fuerte y grande que aparece SÓLO en la zona del contrato del
// día (igual para todos, porque la misión diaria es determinística por fecha). Matarlo acredita
// la misión Contrato del que lo mata. Reaparece para que cada jugador pueda cazar el suyo.
const ELITE_LEVEL = 7
function spawnElite(md, sprite, contractId) {
  const t = randWalkable(md, new Set())
  if (!t) return null
  const st = enemyStats(sprite, ELITE_LEVEL)
  const hp = Math.round(st.hpMax * 1.6)
  return {
    i: eidSeq++, s: sprite, lv: ELITE_LEVEL, x: t.x + 0.5, y: t.y + 0.5, d: 7,
    hp, hpm: hp, dmg: Math.round(st.damage * 1.3), xp: st.xp + 40, gold: Math.round(st.gold * 2.5),
    rng: isRanged(sprite), atkCd: 0, home: { x: t.x, y: t.y }, sp: null,
    el: true, contract: contractId,
  }
}

// Jefe PERMANENTE de zona (clímax), independiente del contrato diario del día. A diferencia del élite
// del contrato, se planta cerca de la ENTRADA (reachable, no en una sala aislada) y respawnea siempre
// como jefe. Estadísticas más duras que el élite. Marcado el:true+boss:true => loot de jefe.
const MAP_BOSS = {
  // La Torre del Mago: el Nigromante óseo (invoca esbirros) custodia el umbral. Paga el rumor del
  // Centinela Aldric ("nadie que entró volvió a contarlo").
  wizards_tower_1: { sprite: 'skeleton_mage_boss', level: 12 },
  // El Inframundo: el Minotauro, la bestia que abrió el pozo. Guarda las profundidades.
  underworld: { sprite: 'minotaur', level: 13 },
  // Las Cloacas Ruinosas, bajo Black Oak City: el Zombi profano, hinchado de todo lo que la ciudad
  // deja caer. Golpe pútrido en área (telegrafiado). Clímax de la rama de la ciudad (nivel ~11).
  dilapidated_sewers: { sprite: 'zombie_dark', level: 11 },
  // Los Tres Nombres (quest de Udana): cada ruina guarda el guardián elemental que el archimago dejó
  // atado. Matarlo arranca el nombre sellado (el cliente revela q3_* al caer un jefe en la ruina).
  st_maria_1: { sprite: 'wyvern_water', level: 9 },     // hielo / Scathelocke
  perdition_mines: { sprite: 'wyvern_fire', level: 9 }, // fuego / Vesuvvio
  stormrock_pass: { sprite: 'wyvern_air', level: 9 },   // viento / Grisbon
  // Capstone del cluster profundo: lo más hondo que se puede llegar (Fortaleza II, nivel 15).
  underworld_stronghold_2: { sprite: 'skeleton_knight_boss', level: 15 },
  // Templo de Mez (la Entrada, piso 3): el último wyvern que anida en el portón del templo. Bruto
  // de cuerpo a cuerpo (no elemental — distinto de los Tres Nombres). Clímax del ramal (nivel ~9).
  temple_of_mez_3: { sprite: 'wyvern', level: 9 },
  // Fuerte Amir (final del cluster de minas): el castellano caído, un Caballero de hueso que todavía
  // monta guardia sobre una guarnición muerta. Golpe en área (smash). Clímax del ramal (nivel ~7).
  fort_amir: { sprite: 'skeleton_knight_boss', level: 7 },
}
// Esbirro INVOCADO por una habilidad (summon): sprite+nivel fijos en un tile dado. `sp:null` +
// `_parent` -> no repone al morir (no es un spawner del mapa; ver killEnemy).
function spawnMinion(md, sprite, level, tile) {
  const st = enemyStats(sprite, level)
  return {
    i: eidSeq++, s: sprite, lv: level, x: tile.x + 0.5, y: tile.y + 0.5, d: 7,
    hp: st.hpMax, hpm: st.hpMax, dmg: st.damage, xp: st.xp, gold: st.gold,
    rng: isRanged(sprite), atkCd: 0, home: { x: tile.x, y: tile.y }, sp: null,
  }
}
function spawnBoss(md, cfg) {
  const [cx, cy] = md.spawn || [Math.floor(md.w / 2), Math.floor(md.h / 2)]
  const t = nearWalkable(md, cx, cy, 4, 16, new Set()) || randWalkable(md, new Set())
  if (!t) return null
  const st = enemyStats(cfg.sprite, cfg.level)
  const hp = Math.round(st.hpMax * 2.4)
  return {
    i: eidSeq++, s: cfg.sprite, lv: cfg.level, x: t.x + 0.5, y: t.y + 0.5, d: 7,
    hp, hpm: hp, dmg: Math.round(st.damage * 1.5), xp: st.xp + 120, gold: Math.round(st.gold * 4),
    rng: isRanged(cfg.sprite), atkCd: 0, home: { x: t.x, y: t.y }, sp: null,
    el: true, boss: true,
  }
}

// Crea (una vez) el mundo de enemigos de un canal si el mapa tiene spawners.
export function ensureWorld(map, ch) {
  const k = key(map, ch)
  if (worlds.has(k)) return
  const md = loadMap(map)
  if (!md || !md.spawners.length) { worlds.set(k, null); return }   // mapa sin combate (pueblo)
  // Los clusters cercanos van PRIMERO: así entran seguro bajo el tope y garantizan acción en la
  // entrada, aunque los spawners nativos del mapa estén lejos.
  const usedNear = new Set()
  const near = buildNearSpawners(md, usedNear)
  const enemies = new Map()
  for (const sp of [...near, ...md.spawners]) {
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
  // Cofres del mapa (posiciones fijas), compartidos por el canal. Primero en llegar se lo lleva;
  // reaparecen a los ~90s. El servidor tira el loot (autoritativo).
  const chests = new Map()
  const nearChests = buildNearChests(md, usedNear)
  for (const c of [...nearChests, ...md.chests]) {
    chests.set(cidSeq, { c: cidSeq, x: c.x, y: c.y, loot: c.loot }); cidSeq++
  }
  // Élite del contrato del día, si es de este mapa (una, compartida por el canal).
  const con = todayContract()
  if (con && con.map === map && con.elite) {
    const el = spawnElite(md, con.elite, con.id)
    if (el) enemies.set(el.i, el)
  }
  // Jefe permanente de la zona (clímax), si el mapa tiene uno configurado.
  const bcfg = MAP_BOSS[map]
  if (bcfg) { const b = spawnBoss(md, bcfg); if (b) enemies.set(b.i, b) }
  worlds.set(k, { map, ch, md, enemies, dead: [], nodes, nodeDead: [], chests, chestDead: [], emptySince: 0 })
}

// Snapshot completo de los enemigos de un canal (para el que recién entra).
export function snapshot(map, ch) {
  const w = worlds.get(key(map, ch))
  if (!w) return null
  return [...w.enemies.values()].map((e) => ({ i: e.i, s: e.s, lv: e.lv, x: r2(e.x), y: r2(e.y), d: e.d, hp: e.hp, hpm: e.hpm, rng: e.rng, el: e.el ? 1 : 0 }))
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
  // El recurso va al bag AUTORITATIVO del server (empuja 'inv'); el cliente sólo aplica la XP de skill.
  if (ctx.grantLoot) ctx.grantLoot(pid, [{ id: nd.id, qty: 1 }])
  // Avance de misión 'mina'/'hierba' autoritativo (según la skill del nodo).
  if (ctx.missionTick) ctx.missionTick(pid, nd.skill === 'excavacion' ? 'mine' : 'herb', pl.map, 1)
  ctx.sendTo(pid, { t: 'ngather', n: nid, id: nd.id, skill: nd.skill })
}

// Snapshot de los cofres (cerrados) de un canal.
export function chestSnapshot(map, ch) {
  const w = worlds.get(key(map, ch))
  if (!w || !w.chests) return null
  return [...w.chests.values()].map((c) => ({ c: c.c, x: c.x, y: c.y }))
}

// Pedido de abrir un cofre (del cliente). Valida alcance, lo marca abierto (primero en llegar),
// tira el loot en el servidor (autoritativo) y se lo manda al que abrió. Reaparece a los ~90s.
export function playerOpenChest(pid, cid) {
  if (!ctx) return
  const pl = ctx.getPlayer(pid)
  if (!pl) return
  const w = worlds.get(key(pl.map, pl.ch))
  if (!w || !w.chests) return
  const c = w.chests.get(cid)
  if (!c) return
  const dx = pl.x - c.x, dy = pl.y - c.y
  if (dx * dx + dy * dy > CHEST_REACH * CHEST_REACH) return   // fuera de alcance
  w.chests.delete(cid)
  w.chestDead.push({ x: c.x, y: c.y, loot: c.loot, at: now() + respawnDelay(w, CHEST_RESPAWN, MIN_CHEST_RESPAWN) * 1000 })
  ctx.broadcast(w.map, w.ch, { t: 'copen', c: cid, by: pid })
  const roll = hasLootTable(c.loot) ? rollLoot(c.loot) : { gold: 0, drops: [] }
  // Los cofres del SUELO ya NO dan oro: sólo ítems. Eran el faucet fuerte que inflaba la economía
  // (§ECONOMY_VEL.md). El oro sale de matar enemigos + vender el loot. Los cofres de SELLO (premium,
  // pagados con fragmentos de sello) sí siguen dando oro — ahí está bien porque pagaste por abrirlos.
  // Los ítems del cofre van al bag AUTORITATIVO del server (empuja 'inv'); `cloot` es sólo para la animación.
  if (roll.drops && roll.drops.length && ctx.grantLoot) ctx.grantLoot(pid, roll.drops)
  if (ctx.missionTick) ctx.missionTick(pid, 'chest', pl.map, 1)   // avance de misión 'cofre' autoritativo
  ctx.sendTo(pid, { t: 'cloot', c: cid, x: c.x, y: c.y, drops: roll.drops || [] })
}

// --- stats de combate del jugador (las envía el cliente) ------------------------------------
const pstats = new Map()   // playerId -> { dmgMin, dmgMax, dmgMul, str, crit, weaponKind, reach, defense }
// Backstop anti-cheat: el cliente calcula sus stats de combate (dependen del equipo), pero el
// server las ACOTA a máximos sanos muy por encima de cualquier build legítima. Así un cliente
// hackeado no puede mandar dmg=9999 y romper el mundo compartido de los demás. (La autoridad
// total — el server recalcula stats desde el equipo/nivel/inventario reales y persistidos — es
// una fase mayor: requiere personaje autoritativo en el server.)
const clampNum = (v, max) => Math.max(0, Math.min(max, Number(v) || 0))
export function setStats(pid, s) {
  if (!s || typeof s !== 'object') return
  pstats.set(pid, {
    dmgMin: clampNum(s.dmgMin, 500), dmgMax: clampNum(s.dmgMax, 500),
    // Techos ACOTADOS a una build legítima con margen: un cliente hackeado no puede mandar
    // crit=100 (crit garantizado ×2) ni dmgMul=8 para one-shotear el mundo compartido.
    dmgMul: clampNum(s.dmgMul, 4) || 1, str: clampNum(s.str, 999),
    crit: clampNum(s.crit, 60), defense: clampNum(s.defense, 3000),
    reach: clampNum(s.reach, 8) || 1.6,
    itemFind: clampNum(s.itemFind, 300),   // magic-find (acotado): mejora la rareza del loot de kills
    weaponKind: (s.weaponKind === 'ranged' || s.weaponKind === 'mental') ? s.weaponKind : 'melee',
  })
}
export function dropPlayer(pid) { pstats.delete(pid); patkAt.delete(pid) }

// Cadencia de ataque autoritativa: el cooldown vivía sólo en el cliente (cosmético), así que un
// cliente scripteado podía mandar 'atk' en loop y borrar los enemigos del canal. El swing legítimo
// más rápido es 0.65s (client/engine/Game.js); ponemos un piso de 0.5s con margen para el jitter.
const patkAt = new Map()          // playerId -> próximo instante permitido (ms)
const MIN_PLAYER_ATK_CD = 500     // ms entre golpes aceptados del jugador

// Golpe jugador -> enemigo (pedido por el cliente). El server tira el daño con las stats del
// jugador y valida el alcance. Devuelve nada; difunde el resultado.
// PvP DESHABILITADO a propósito: los jugadores NO pueden atacarse entre sí (ni matarse ni robarse
// ítems). El objetivo de un golpe se resuelve SIEMPRE contra `w.enemies` — nunca contra otro
// jugador. No agregar targets de jugador acá ni un modo PvP sin decisión de diseño explícita.
const PVP_ENABLED = false
export function playerAttack(pid, eid) {
  if (!ctx) return
  const pl = ctx.getPlayer(pid)
  if (!pl) return
  const w = worlds.get(key(pl.map, pl.ch))
  if (!w) return
  const e = w.enemies.get(eid)   // sólo enemigos: un id de jugador jamás está en este mapa (PvP off)
  if (!e || e.hp <= 0) return
  if (PVP_ENABLED) { /* candado muerto: no hay ruta de daño jugador→jugador */ }
  const st = pstats.get(pid) || {}
  const reach = (st.reach || (st.weaponKind && st.weaponKind !== 'melee' ? RANGED_REACH : MELEE)) + 0.6
  const dx = pl.x - e.x, dy = pl.y - e.y
  if (dx * dx + dy * dy > reach * reach) return   // fuera de alcance: no valida
  // Cadencia autoritativa: descarta golpes más rápidos que el piso (anti spam/scripting). Sólo
  // consume el cooldown cuando el golpe es válido y está en alcance (un whiff no lo resetea).
  const tnow = now()
  if (tnow < (patkAt.get(pid) || 0)) return
  patkAt.set(pid, tnow + MIN_PLAYER_ATK_CD)
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

// Habilidad especial M2 AUTORITATIVA. El cliente computa qué enemigos alcanzó su habilidad y cuánto
// daño (las fórmulas —AoE por arma, bola de fuego por intelecto— viven en el cliente); el server
// VALIDA alcance + cadencia y CLAMPEA el daño (mismo modelo de confianza que el golpe normal: el
// cliente propone, el server acota), luego lo aplica de verdad: HP, muerte, XP, oro y loot son
// autoritativos. Cierra el bug online donde la habilidad pegaba local, el enemigo revivía al
// re-sincronizar y otorgaba XP/loot falso. `hits` = [{ eid, dmg }].
const pcastAt = new Map()          // playerId -> próximo cast permitido (ms)
const MIN_CAST_CD = 350            // piso entre casts (anti-spam; el cooldown real por habilidad es client-side)
const CAST_DMG_MAX = 900           // techo de daño por golpe de habilidad (anti-cheat; > que el melee)
const CAST_RANGE = 14              // alcance máximo de un golpe de habilidad desde el jugador (tiles)
export function playerCast(pid, hits) {
  if (!ctx || !Array.isArray(hits) || !hits.length) return
  const pl = ctx.getPlayer(pid); if (!pl) return
  const w = worlds.get(key(pl.map, pl.ch)); if (!w) return
  const tnow = now()
  if (tnow < (pcastAt.get(pid) || 0)) return   // cadencia: descarta ráfagas de casts
  pcastAt.set(pid, tnow + MIN_CAST_CD)
  for (const h of hits.slice(0, 24)) {         // tope de objetivos por cast
    const e = w.enemies.get((h && h.eid) | 0)
    if (!e || e.hp <= 0) continue
    const dx = pl.x - e.x, dy = pl.y - e.y
    if (dx * dx + dy * dy > CAST_RANGE * CAST_RANGE) continue   // fuera de alcance: se ignora
    const dmg = Math.max(1, Math.min(CAST_DMG_MAX, Math.round(Number(h.dmg) || 0)))
    e.hp -= dmg
    ctx.broadcast(pl.map, pl.ch, { t: 'edmg', i: e.i, hp: Math.max(0, e.hp), dmg, crit: false, by: pid })
    if (e.hp <= 0) killEnemy(w, e, pid)
  }
}

function killEnemy(w, e, killerId) {
  w.enemies.delete(e.i)
  // El jefe permanente y la élite reaparecen más lento (para que sean un evento); los comunes al
  // ritmo normal. El jefe respawnea COMO jefe (no degradado a élite de contrato).
  if (e.boss) w.dead.push({ boss: true, sprite: e.s, level: e.lv, at: now() + RESPAWN * 4 * 1000 })
  else if (e.el) w.dead.push({ el: true, sprite: e.s, contract: e.contract, at: now() + RESPAWN * 3 * 1000 })
  else if (e.sp) w.dead.push({ sp: e.sp, at: now() + respawnDelay(w, RESPAWN, MIN_RESPAWN) * 1000 })   // sólo los de spawner reponen (los invocados, sp:null, no)
  ctx.broadcast(w.map, w.ch, { t: 'edie', i: e.i, by: killerId })
  // Oro AUTORITATIVO del servidor (Fase A): lo acredita el server (con una variación ±30% para que
  // se sienta vivo) y le manda el nuevo total al matador; el cliente sólo muestra la pila cosmética.
  if (e.gold > 0 && ctx.awardGold) ctx.awardGold(killerId, Math.max(1, Math.round(e.gold * (0.7 + Math.random() * 0.6))), 'kill', e.x, e.y)
  // Botín de ítems AUTORITATIVO (Fase A.2): el server tira el drop y lo otorga al bag del matador.
  const boss = !!e.boss || /boss|minotaur|elite/.test(e.s)   // jefe de zona (MAP_BOSS) también da loot de jefe
  const roll = rollMonsterDrop(e.lv, boss, (pstats.get(killerId) || {}).itemFind || 0)   // magic-find del matador (antes 0 online)
  if (roll.drops.length && ctx.grantLoot) ctx.grantLoot(killerId, roll.drops)
  // Avance de misiones AUTORITATIVO (matar / contrato): el server cuenta el kill en el mapa del mundo.
  if (ctx.missionTick) { ctx.missionTick(killerId, 'kill', w.map, 1); if (e.contract) ctx.missionTick(killerId, 'contract', w.map, 1) }
  // Aviso al matador: XP autoritativa del server + los drops REALES (para la pila cosmética del
  // cliente; el bag ya lo actualizó el push 'inv'). Así el suelo muestra lo que de verdad cayó.
  const ek = { t: 'ekill', i: e.i, xp: e.xp, sprite: e.s, lv: e.lv, drops: roll.drops || [] }
  if (e.contract) ek.contract = e.contract   // acredita la misión Contrato del que lo mata
  if (e.boss) ek.boss = 1                     // jefe de zona: el cliente puede gatear eventos (quest de las ruinas)
  ctx.sendTo(killerId, ek)
  // Contrato semanal del GREMIO del matador: si la categoría del enemigo matchea, suma al pozo
  // común del gremio. Fire-and-forget (no bloquea el hot-path del combate).
  const killer = ctx.getPlayer && ctx.getPlayer(killerId)
  if (killer && killer.accountId) {
    const cat = (e.sp && e.sp.category) || e.s
    guilds.onKill(killer.accountId, cat).catch(() => {})
  }
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
    if (!players.length) {
      // canal vacío: se pausa la simulación y, tras WORLD_GC_MS, se libera el mundo (enemigos,
      // nodos, cofres, listas de respawn) para no acumular memoria por cada (mapa,canal) visitado.
      // Al volver a entrar, ensureWorld lo reconstruye fresco. Borrar la entrada actual del Map
      // durante el for-of es seguro en JS.
      if (!w.emptySince) w.emptySince = t
      else if (t - w.emptySince > WORLD_GC_MS) worlds.delete(key(w.map, w.ch))
      continue
    }
    w.emptySince = 0
    // reponer muertos
    if (w.dead.length && w.enemies.size < MAX_PER_MAP) {
      const still = []
      for (const d of w.dead) {
        if (t >= d.at) {
          const e = d.boss ? spawnBoss(w.md, { sprite: d.sprite, level: d.level })
            : d.el ? spawnElite(w.md, d.sprite, d.contract) : spawnEnemy(w.md, d.sp)
          if (e) { w.enemies.set(e.i, e); ctx.broadcast(w.map, w.ch, { t: 'espawn', es: [pubEnemy(e)] }) }
        } else still.push(d)
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
    // reponer cofres saqueados (reaparecen cerrados en su lugar)
    if (w.chestDead && w.chestDead.length) {
      const still = []
      for (const d of w.chestDead) {
        if (t >= d.at) {
          const c = { c: cidSeq++, x: d.x, y: d.y, loot: d.loot }
          w.chests.set(c.c, c)
          ctx.broadcast(w.map, w.ch, { t: 'cspawn', cs: [{ c: c.c, x: c.x, y: c.y }] })
        } else still.push(d)
      }
      w.chestDead = still
    }
    if (sendState) broadcastState(w, players)
  }
}

function stepEnemy(w, e, players, dt) {
  if (e.atkCd > 0) e.atkCd -= dt
  const ab = e._ab !== undefined ? e._ab : (e._ab = enemyAbility(e.s))   // habilidad del bicho (cacheada)
  // objetivo: jugador más cercano dentro del aggro
  let tgt = null, best = AGGRO * AGGRO
  for (const p of players) {
    const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy
    if (d2 < best) { best = d2; tgt = p }
  }
  // SUMMON: el nigromante invoca esbirros cada `cd` mientras haya un jugador en aggro (aunque no
  // llegue a rango de golpe). Tope por `cap` esbirros vivos suyos (tag _parent).
  if (ab && ab.type === 'summon') stepSummon(w, e, ab, tgt, dt)
  if (!tgt) return
  const dx = tgt.x - e.x, dy = tgt.y - e.y
  const dist = Math.hypot(dx, dy) || 0.0001
  // SKITTISH: con poca vida, huye del jugador (después vuelve al subir la vida / cambiar de target).
  if (ab && ab.type === 'skittish' && e.hp < e.hpm * (ab.threshold || 0.3)) {
    const nx = e.x - (dx / dist) * SPEED * dt, ny = e.y - (dy / dist) * SPEED * dt
    if (isWalkable(w.md, nx, e.y)) e.x = nx
    if (isWalkable(w.md, e.x, ny)) e.y = ny
    e.d = vecToDir(-dx, -dy)
    return
  }
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
    // SMASH: chance de golpe de ÁREA más fuerte (minotauro/caballero/élites) — pega a todos los
    // jugadores en radio; si no procea, golpe normal al objetivo.
    if (ab && ab.type === 'smash' && Math.random() < (ab.chance || 0.4)) {
      for (const p of players) {
        if (Math.hypot(p.x - e.x, p.y - e.y) > (ab.radius || 2)) continue
        const ps = pstats.get(p.id) || {}
        const dmg = Math.max(1, Math.round(e.dmg * (ab.mult || 2)) - (ps.defense || 0))
        ctx.sendTo(p.id, { t: 'ehit', i: e.i, dmg, smash: 1 })
      }
      ctx.broadcast(w.map, w.ch, { t: 'esmash', i: e.i, x: r2(e.x), y: r2(e.y), r: ab.radius || 2 })  // FX (el cliente puede animarlo)
    } else {
      const st = pstats.get(tgt.id) || {}
      const dmg = Math.max(1, e.dmg - (st.defense || 0))
      ctx.sendTo(tgt.id, { t: 'ehit', i: e.i, dmg })
    }
  }
}

// Invocación de esbirros (nigromante). Primer summon tras un `cd`; tope por esbirros vivos propios.
function stepSummon(w, e, ab, tgt, dt) {
  if (e._sumAt == null) e._sumAt = ab.cd
  e._sumAt -= dt
  if (e._sumAt > 0 || !tgt) return
  e._sumAt = ab.cd
  const alive = [...w.enemies.values()].filter((m) => m._parent === e.i).length
  if (alive >= (ab.cap || 3) || w.enemies.size >= MAX_PER_MAP) return
  const t = nearWalkable(w.md, Math.round(e.x), Math.round(e.y), 1, 3, new Set())
  if (!t) return
  const minion = spawnMinion(w.md, ab.minion, Math.max(1, (e.lv || 1) - 2), t)
  minion._parent = e.i
  w.enemies.set(minion.i, minion)
  ctx.broadcast(w.map, w.ch, { t: 'espawn', es: [pubEnemy(minion)] })
}

function broadcastState(w, players) {
  const es = [...w.enemies.values()].map((e) => ({ i: e.i, x: r2(e.x), y: r2(e.y), d: e.d, hp: e.hp }))
  if (es.length) ctx.broadcast(w.map, w.ch, { t: 'estate', es })
}

const pubEnemy = (e) => ({ i: e.i, s: e.s, lv: e.lv, x: r2(e.x), y: r2(e.y), d: e.d, hp: e.hp, hpm: e.hpm, rng: e.rng, el: e.el ? 1 : 0 })
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
