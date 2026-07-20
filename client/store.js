// Store compartido. El loop de Pixi escribe telemetría; React maneja la UI y el
// equipo. React NO toca el loop del juego.
//
// El equipo es la fuente de verdad de la UI (React); el paperdoll de Pixi reacciona
// vía onEquipmentChange. Cuando llegue el servidor autoritativo (regla 2), equip()
// pasará a pedirle al server y aplicar su respuesta.
import { create } from 'zustand'
import { computeStats, upgradeLevel } from './data/stats.js'
import { NODE_BY_ID, attrEarned, skillEarned, attrSpent, skillSpent } from './data/skilltree.js'
import { QUESTS, ZONE_REVEALS } from './data/quests.js'
import { unlockedAbilities } from './data/abilities.js'
import { net, ONLINE } from './net/net.js'
import { rollLoot } from '../shared/loot.js'

// Online = build online (VITE_WS_URL o no-localhost) Y socket conectado. Cuando es true, el ORO es
// autoritativo del servidor (Fase A): los flujos de oro piden al server y espejan el saldo. Cuando
// es false (server caído / modo pruebas), el oro es local.
const isOnline = () => ONLINE && net.connected

const FORGE_MAX = 5        // nivel máximo de mejora por pieza
const SEAL_CHEST_COST = 6  // sellos por cofre de sellos (loot box premium)
const GRAVE_GOLD_FRACTION = 0.25 // fracción del oro que dejás en la tumba al morir
import { isDurable, durabilityMax, isRecall, itemById } from './data/items.js'
import { setMuted } from './engine/audio.js'
import { tt, setLangGlobal, itemName, raceName, questName } from './i18n.js'
import { dailyStock, alchemistStock, todayStr } from './data/shop.js'
import { dailyMissions } from './data/missions.js'
import { emptySkills, playerLevelFromXp, skillLevelFromXp, SKILL_CAP, inventoryCapacity } from './data/progression.js'
import { saveGame, snapshot } from './data/save.js'

// Idioma persistido (aparte del save: es una preferencia del dispositivo, no de la partida).
// Clave nueva 'velgrim:lang': ignora cualquier 'vigilia:lang' viejo (que podía tener 'es'
// guardado) para que el default sea inglés en todos lados, incluso al entrar por primera vez.
const LANG_KEY = 'velgrim:lang'
function loadLang() {
  try { const l = localStorage.getItem(LANG_KEY); return l === 'es' ? 'es' : 'en' } catch { return 'en' }
}
function saveLang(l) { try { localStorage.setItem(LANG_KEY, l) } catch {} }
setLangGlobal(loadLang()) // sincroniza el idioma del módulo i18n al arrancar

// El mercader compra a fracción del precio (Flare: vendor_ratio_sell = 0.25).
const SELL_RATIO = 0.25
export const sellValue = (item) => Math.max(1, Math.floor((item.price || 0) * SELL_RATIO))

// Efecto de una poción del cinturón: cuánto cura de vida/maná. Las básicas no traen el
// valor en `stats`, así que lo derivamos del nombre (Super ×2, Ultra ×3). Cuando haya
// combate esto va a curar de verdad; por ahora sirve para avisar si no hace falta.
function potionEffect(it) {
  if (!it || it.slot !== 'potion') return null
  const name = (it.name + ' ' + (it.name_en || '')).toLowerCase()
  let mult = 1
  if (/super/.test(name)) mult = 2
  if (/ultra/.test(name)) mult = 3
  if (/vida|health/.test(name)) return { hp: 25 * mult }
  if (/mana|maná/.test(name)) return { mp: 20 * mult }
  if (it.stats?.hp_regen) return { hp: it.stats.hp_regen }
  if (it.stats?.mp_regen) return { mp: it.stats.mp_regen }
  return null
}

// Slots de equipo. Los primeros 7 se ven en el paperdoll; los dos anillos y el artefacto no.
export const EQUIP_SLOTS = ['head', 'chest', 'legs', 'hands', 'feet', 'main', 'off', 'ring', 'ring2', 'artifact']
export const INVENTORY_SIZE = 55 // 5×11, como la grilla del panel de Flare

// Slots cuyos ítems se apilan (consumibles / materiales) en vez de ocupar un hueco cada uno.
const STACK_SLOTS = new Set(['potion', 'consumable', 'crafting', 'crafting_tool', 'scroll', 'gem', 'book'])

// Ítems que pueden ir al cinturón (consumibles usables en combate).
const BELT_SLOTS = new Set(['potion', 'consumable', 'scroll'])
export const beltEligible = (item) => !!item && BELT_SLOTS.has(item.slot)

// Capacidad del cinturón según el ítem de cinturón equipado (sin cinturón = 2 slots).
export const beltCapacityOf = (belt) => (belt && belt.beltSlots) || 2

function emptyEquipment() {
  const e = {}
  for (const s of EQUIP_SLOTS) e[s] = null
  return e
}

// A qué slot de equipo va un ítem según su `slot` de datos. Los anillos tienen dos huecos
// (ring / ring2): si se pasa el equipo actual, se llena el primero libre; con ambos ocupados
// se reemplaza el primero.
export function equipSlotFor(item, equipment) {
  if (!item) return null
  if (item.slot === 'ring') {
    if (equipment && equipment.ring && !equipment.ring2) return 'ring2'
    return 'ring'
  }
  return EQUIP_SLOTS.includes(item.slot) ? item.slot : null
}

export const useGameStore = create((set, get) => ({
  // --- telemetría (la escribe el loop) ---
  fps: 0,
  mapTitle: '',
  debug: { tile: '', visibleTiles: 0 },
  minimap: null,            // {url, scale, minMx, pad}
  playerTile: { x: 0, y: 0 },
  setFps: (fps) => set({ fps }),
  setMapTitle: (mapTitle) => set({ mapTitle }),
  setDebug: (debug) => set({ debug }),
  setMinimap: (minimap) => set({ minimap }),
  // Guarda de igualdad como setNearby*: el loop llama esto ~12×/s pero el tile es entero y rara
  // vez cambia; sin la guarda, React re-renderiza el Minimap en cada llamada aunque estés quieto.
  setPlayerTile: (playerTile) => set((s) => (s.playerTile?.x === playerTile?.x && s.playerTile?.y === playerTile?.y ? {} : { playerTile })),

  // --- personaje ---
  race: null,
  playerName: 'Vigilante',
  gold: 0,
  speech: null,             // {text, until} — chat propio sobre la cabeza
  dialogue: null,           // {name, portrait, lines, idx} — charla con NPC (caja con retrato)
  setPlayerName: (playerName) => set({ playerName: playerName || 'Vigilante' }),
  openDialogue: (d) => set({ dialogue: { ...d, idx: 0 } }),
  advanceDialogue: () => set((s) => {
    if (!s.dialogue) return {}
    const idx = s.dialogue.idx + 1
    return idx >= s.dialogue.lines.length ? { dialogue: null } : { dialogue: { ...s.dialogue, idx } }
  }),
  closeDialogue: () => set({ dialogue: null }),
  say: (text) => {
    const t = (text || '').trim().slice(0, 120)
    if (t) set({ speech: { text: t, until: Date.now() + 4500 } })
  },
  stats: null,              // {level, str, dex, int, vit, hp, hpMax, mp, mpMax, staminaMax, ...}
  spectator: false,         // modo mirón: sin combate/acciones, invulnerable, no persiste
  xp: 0,                    // XP total del jugador (define el nivel)
  skills: emptySkills(),    // las 6 acciones: { skill: {xp, level} }
  attrAlloc: { str: 0, dex: 0, int: 0, vit: 0 }, // puntos de atributo repartidos (por nivel)
  skillRanks: {},           // { nodeId: rango } — árbol de habilidades
  inventory: [],            // array de ítems (huecos = null), largo INVENTORY_SIZE
  equipment: emptyEquipment(),
  belt: [null, null, null, null], // cinturón (slots usables = capacidad del cinturón equipado)
  equippedBelt: null,             // ítem de cinturón equipado (define cuántos slots hay)
  panel: null,              // 'inventory' | 'character' | 'shop' | null
  lootLabels: false,        // mostrar todas las etiquetas de loot del suelo (botón/Alt, estilo Diablo)
  shopStock: [],            // stock del mercader (rota por día)
  shopVendor: '',           // nombre del mercader abierto
  nearby: null,             // {name, shop} — NPC cercano interactuable (lo escribe el loop)
  interactSeq: 0,           // el botón "interactuar" del HUD lo incrementa; el loop lo lee
  setNearby: (nearby) => set((s) => (s.nearby?.name === nearby?.name ? {} : { nearby })),
  requestInteract: () => set((s) => ({ interactSeq: s.interactSeq + 1 })),
  // Nodo de recurso cercano (hierba/cristal) + botón para recolectarlo.
  nearbyNode: null,         // {name, skill}
  gatherSeq: 0,
  setNearbyNode: (n) => set((s) => (s.nearbyNode?.name === n?.name ? {} : { nearbyNode: n })),
  requestGather: () => set((s) => ({ gatherSeq: s.gatherSeq + 1 })),

  // --- portales / red de waypoints (estilo Diablo) ---
  mapName: '',              // zona actual (para el menú de waypoints)
  safeZone: false,          // pueblo/hub sin enemigos: sin combate ni habilidades (lo setea el loop)
  setSafeZone: (v) => set({ safeZone: !!v }),
  nearbyPortal: null,       // {label} — portal cercano (lo escribe el loop)
  portalTiles: [],          // [{x,y,label}] — para marcar en el minimapa
  npcTiles: [],             // [{x,y,label,role}] — NPCs de servicio en el minimapa
  graveTiles: [],           // [{x,y}] — tus tumbas en este mapa, para el minimapa
  discovered: {},           // { zona: {tx,ty,label} } — waypoints que descubriste (persistido)
  waypointList: [],         // [{zone,label,tx,ty,adjacent,current}] — lo arma el loop
  waypointOpen: false,      // el modal de destinos está abierto
  waypointSeq: 0,           // el loop lo lee para viajar
  waypointTarget: null,     // zona elegida en el modal
  setMapName: (m) => set({ mapName: m }),
  setNearbyPortal: (p) => set((s) => (s.nearbyPortal?.label === p?.label ? {} : { nearbyPortal: p })),
  setPortals: (portalTiles) => set({ portalTiles }),
  setNpcTiles: (npcTiles) => set({ npcTiles }),
  setGraveTiles: (graveTiles) => set({ graveTiles }),
  setWaypointList: (waypointList) => set({ waypointList }),
  // Descubre un waypoint (zona) con su tile de llegada. Devuelve true si es nuevo.
  discoverZone: (zone, tx, ty, label) => {
    const s = get()
    if (s.discovered[zone]) return false
    const discovered = { ...s.discovered, [zone]: { tx, ty, label } }
    set({ discovered })
    saveGame(get())
    return true
  },
  openWaypoints: () => set({ waypointOpen: true }),
  closeWaypoints: () => set({ waypointOpen: false }),
  requestWaypoint: (zone) => set((s) => ({ waypointSeq: s.waypointSeq + 1, waypointTarget: zone, waypointOpen: false })),

  // --- Pergamino de Retorno / recall ---
  recallSeq: 0,             // usar el pergamino lo incrementa; el loop lo lee y ejecuta el recall
  recallSource: null,       // {from:'belt'|'inv', index} — de dónde descontarlo si el recall es válido
  recallAnchor: null,       // {map,tx,ty,label} — a dónde te devuelve el Obelisco del pueblo
  requestRecall: (source) => set((s) => ({ recallSeq: s.recallSeq + 1, recallSource: source })),
  setRecallAnchor: (a) => set({ recallAnchor: a }),
  clearRecallAnchor: () => set({ recallAnchor: null }),
  // Descuenta un consumible del cinturón por índice (lo llama el loop tras un recall válido).
  consumeBelt: (i) => set((s) => {
    const it = s.belt[i]; if (!it) return {}
    const belt = s.belt.slice()
    const cnt = (it.count || 1) - 1
    belt[i] = cnt > 0 ? { ...it, count: cnt } : null
    saveGame({ ...s, belt })
    return { belt }
  }),
  // Descuenta un consumible del inventario por índice. Online: el server saca 1 del bag autoritativo
  // (useReq, valida posesión) y espejamos el bag del ack. Offline: local.
  consumeInventory: (i) => {
    if (isOnline()) { net.useReq(i).then((r) => { if (r && r.inv) get()._mirrorInv(r.inv) }).catch(() => {}); return }
    set((s) => {
      const it = s.inventory[i]; if (!it) return {}
      const inv = s.inventory.slice()
      const cnt = (it.count || 1) - 1
      inv[i] = cnt > 0 ? { ...it, count: cnt } : null
      saveGame({ ...s, inventory: inv })
      return { inventory: inv }
    })
  },
  // Usar un ítem del inventario (por ahora: Pergamino de Retorno; el resto avisa).
  useInventory: (i) => {
    const it = get().inventory[i]
    if (!it) return
    if (isRecall(it)) { get().requestRecall({ from: 'inv', index: i }); return }
    get().showToast(tt('cant_use'))
  },

  // --- pantalla de carga entre zonas ---
  zoneLoad: null,           // {label} mientras se viaja; null cuando terminó
  setZoneLoad: (z) => set({ zoneLoad: z }),

  // --- combate ---
  // Aplica daño al jugador (lo llama el loop cuando un enemigo pega). Devuelve la vida
  // resultante; el loop decide la muerte cuando llega a 0.
  takeDamage: (n) => {
    const s = get(); const st = s.stats
    if (!st) return 0
    if (s.spectator) return st.hp   // el espectador es invulnerable
    const hp = Math.max(0, st.hp - Math.max(0, n | 0))
    set({ stats: { ...st, hp } })
    return hp
  },

  // Cura vida (regeneración en el pueblo). Acumula fracciones; no persiste cada tick.
  heal: (n) => {
    const s = get(); const st = s.stats
    if (!st || st.hp >= st.hpMax) return
    const hp = Math.min(st.hpMax, st.hp + n)
    set({ stats: { ...st, hp } })
  },
  // Restaura maná (regeneración pasiva; la escribe el loop). No persiste cada tick.
  restoreMana: (n) => {
    const s = get(); const st = s.stats
    if (!st || st.mp >= st.mpMax) return
    set({ stats: { ...st, mp: Math.min(st.mpMax, st.mp + n) } })
  },
  // Gasta maná si alcanza (para lanzar habilidades). Devuelve true si pudo.
  spendMana: (n) => {
    const s = get(); const st = s.stats
    if (!st || st.mp < n) return false
    set({ stats: { ...st, mp: st.mp - n } })
    return true
  },

  // --- habilidades activas (barra de acción) ---
  castSeq: 0,               // el HUD lo incrementa al tocar una habilidad
  castAbility: null,        // id de la habilidad pedida; el loop la ejecuta sobre el objetivo
  abilityCd: {},            // { id: msFin } — timestamp de fin de recarga (para el barrido del HUD)
  activeBuffs: [],          // [{id, icon, until}] — potencias temporales activas (las escribe el loop)
  specialAbility: null,     // id de la habilidad ligada al botón derecho / slot M2 (persistido)
  requestCast: (id) => set((s) => ({ castSeq: s.castSeq + 1, castAbility: id })),
  setAbilityCd: (id, ms) => set((s) => ({ abilityCd: { ...s.abilityCd, [id]: Date.now() + ms } })),
  setActiveBuffs: (list) => set({ activeBuffs: list }),
  // Liga una habilidad al botón derecho (slot M2). null la desliga.
  setSpecial: (id) => { set({ specialAbility: id, panel: null }); saveGame(get()) },
  openMouseBind: () => set({ panel: 'mousebind' }),
  // Revive al jugador con vida/maná llenos (al reaparecer).
  reviveFull: () => {
    const s = get(); const st = s.stats
    if (!st) return
    set({ stats: { ...st, hp: st.hpMax, mp: st.mpMax } })
    saveGame(get())
  },

  // --- avisos breves (toast) + chat/registro ---
  toast: null,              // {text, until}
  chatLog: [],              // [{id, channel, name, text}] — registro estilo Valorant
  _chatId: 0,
  showToast: (text) => {
    const t = (text || '').trim()
    if (!t) return
    set({ toast: { text: t, until: Date.now() + 2400 } })
    get().logMessage({ channel: 'sistema', text: t }) // el toast también queda en el chat
  },
  clearToast: () => set({ toast: null }),
  // Agrega una línea al registro/chat (canal: 'sistema' | 'yo' | 'mundo').
  logMessage: ({ channel = 'sistema', name = '', text }) => {
    const t = (text || '').toString().trim()
    if (!t) return
    set((s) => {
      const id = (s._chatId || 0) + 1
      const log = [...s.chatLog, { id, channel, name, text: t }]
      while (log.length > 40) log.shift()
      return { chatLog: log, _chatId: id }
    })
  },
  // El jugador dice algo: globo sobre la cabeza + línea en el chat.
  sayChat: (text) => {
    const t = (text || '').toString().trim().slice(0, 120)
    if (!t) return
    get().say(t)
    get().logMessage({ channel: 'yo', name: get().playerName, text: t })
    net.chat(t)   // si hay conexión, lo oyen los del mismo mapa (si no, no-op)
  },

  // Usar un consumible del cinturón (índice). Cura vida/maná; si no hace falta (ya al
  // máximo) avisa con un toast y NO gasta la poción. Al usarla, la descuenta del slot.
  useBelt: (i) => {
    const s = get()
    const it = s.belt[i]
    if (!it) return
    // Piedra de Retorno: no cura; pide al loop el recall al pueblo (él la descuenta si es válido).
    if (isRecall(it)) { get().requestRecall({ from: 'belt', index: i }); return }
    const eff = potionEffect(it)
    if (!eff) { get().showToast(tt('cant_use')); return }
    const st = s.stats || {}
    if (eff.hp) {
      if ((st.hp ?? 0) >= (st.hpMax ?? 0)) { get().showToast(tt('hp_full')); return }
      set({ stats: { ...st, hp: Math.min(st.hpMax, st.hp + eff.hp) } })
    } else if (eff.mp) {
      if ((st.mp ?? 0) >= (st.mpMax ?? 0)) { get().showToast(tt('mp_full')); return }
      set({ stats: { ...st, mp: Math.min(st.mpMax, st.mp + eff.mp) } })
    }
    const belt = s.belt.slice()
    const cnt = (it.count || 1) - 1
    belt[i] = cnt > 0 ? { ...it, count: cnt } : null
    set({ belt })
    get().showToast(eff.hp ? tt('hp_gain', { n: eff.hp }) : tt('mp_gain', { n: eff.mp }))
    saveGame(get())
  },

  // Manda un consumible del inventario al cinturón (se apila si ya hay del mismo; si no,
  // al primer hueco libre). Si el cinturón está lleno avisa con un toast.
  assignBelt: async (invIndex) => {
    const s = get()
    const it = s.inventory[invIndex]
    if (!beltEligible(it)) { get().showToast(tt('belt_only')); return }
    const cap = beltCapacityOf(s.equippedBelt)
    const qty = it.count || 1
    const belt = s.belt.slice()
    let bi = belt.findIndex((b, i) => i < cap && b && b.id === it.id)
    if (bi < 0) { for (let i = 0; i < cap; i++) { if (belt[i] == null) { bi = i; break } } }
    if (bi < 0) { get().showToast(tt('belt_full')); return }
    // Online: el server saca la pila del bag autoritativo (por índice) y la espejamos; el cinturón
    // es client-side (no entra al bag), así que la pila pasa del bag al cinturón sin duplicar.
    if (isOnline()) {
      const taken = await net.bagTake(invIndex, qty).catch(() => null)
      if (!taken || !taken.ok) return
      get()._mirrorInv(taken.inv)
    } else {
      const inv = s.inventory.slice(); inv[invIndex] = null; set({ inventory: inv })
    }
    belt[bi] = belt[bi] ? { ...belt[bi], count: (belt[bi].count || 1) + qty } : { ...it, count: qty }
    set({ belt })
    get().showToast(tt('to_belt'))
    saveGame(get())
  },

  // Equipa un cinturón (ítem slot 'belt') del inventario: define cuántos slots tiene el
  // cinturón. El anterior vuelve al inventario; si achica la capacidad, los consumibles
  // que sobran vuelven al inventario.
  equipBelt: async (invIndex) => {
    const s = get()
    const it = s.inventory[invIndex]
    if (!it || it.slot !== 'belt') return
    const cap = beltCapacityOf(it)
    // Online: el bag es autoritativo del server. Sacamos el cinturón nuevo del bag (bagTake),
    // devolvemos el anterior (bagGive) y los consumibles que ya no entran vuelven al bag (bagGive).
    if (isOnline()) {
      const taken = await net.bagTake(invIndex, 1).catch(() => null)
      if (!taken || !taken.ok) return
      let inv = taken.inv
      const prev = s.equippedBelt
      if (prev) { const g = await net.bagGive(get()._recOf(prev)).catch(() => null); if (g && g.inv) inv = g.inv }
      const belt = s.belt.slice()
      for (let i = cap; i < belt.length; i++) {
        if (belt[i]) { const g = await net.bagGive(get()._recOf(belt[i])).catch(() => null); if (g && g.inv) inv = g.inv; belt[i] = null }
      }
      if (inv) get()._mirrorInv(inv)
      set({ equippedBelt: { ...it }, belt })
      get().showToast(tt('belt_equipped', { n: it.beltSlots }))
      saveGame(get())
      return
    }
    const inv = s.inventory.slice()
    const prev = s.equippedBelt
    inv[invIndex] = prev || null
    const belt = s.belt.slice()
    for (let i = cap; i < belt.length; i++) {   // consumibles que ya no entran -> inventario
      if (belt[i]) { const f = inv.findIndex((x) => x == null); if (f >= 0) inv[f] = belt[i]; belt[i] = null }
    }
    set({ equippedBelt: { ...it }, inventory: inv, belt })
    get().showToast(tt('belt_equipped', { n: it.beltSlots }))
    saveGame(get())
  },

  // --- durabilidad / reparación ---
  // Gasta durabilidad del equipo. kind 'armor' -> una pieza al azar; 'weapon' -> el arma.
  degradeGear: (kind, amount = 1) => {
    const s = get()
    const eq = { ...s.equipment }
    let target = null
    if (kind === 'weapon') { if (isDurable(eq.main)) target = 'main' }
    else {
      const armor = ['head', 'chest', 'legs', 'hands', 'feet', 'off'].filter((sl) => isDurable(eq[sl]))
      if (armor.length) target = armor[(Math.random() * armor.length) | 0]
    }
    if (!target) return
    const it = eq[target]
    const wasBroken = it.dur != null && it.dur <= 0
    if (wasBroken) {
      // Ya roto: si se lo sigue usando sin reparar, puede DESTRUIRSE (desaparece).
      if (Math.random() < 0.15) {
        eq[target] = null
        set({ equipment: eq })
        get().recomputeStats()
        get().showToast(tt('gear_destroyed', { name: itemName(it) || tt('gear_word') }))
        saveGame(get())
      }
      return
    }
    const dur = Math.max(0, (it.dur != null ? it.dur : durabilityMax(it)) - amount)
    eq[target] = { ...it, dur }
    set({ equipment: eq })
    if (dur <= 0) {
      get().recomputeStats()
      get().showToast(tt('gear_broke', { name: itemName(it) || tt('gear_word') }))
      saveGame(get())
    }
  },

  // Costo de reparar todo el equipo (oro por punto de durabilidad faltante).
  repairCost: () => {
    const s = get()
    let missing = 0
    for (const sl of Object.keys(s.equipment)) {
      const it = s.equipment[sl]
      if (!isDurable(it)) continue
      const max = durabilityMax(it)
      missing += max - (it.dur != null ? it.dur : max)
    }
    return Math.ceil(missing * 1.5)
  },

  // Repara todo el equipo (el herrero cobra oro).
  repairAll: async () => {
    const cost = get().repairCost()
    if (cost <= 0) { get().showToast(tt('gear_impeccable')); return { ok: false } }
    if (get().gold < cost) { get().showToast(tt('no_gold_repair')); return { ok: false } }
    const r = await get()._spend(cost, 'repair', () => {
      const eq = { ...get().equipment }
      for (const sl of Object.keys(eq)) if (isDurable(eq[sl])) eq[sl] = { ...eq[sl], dur: durabilityMax(eq[sl]) }
      set({ equipment: eq }); get().recomputeStats()
    })
    if (!r.ok) { get().showToast(tt('no_gold_repair')); return { ok: false } }
    get().showToast(tt('gear_repaired', { n: cost }))
    saveGame(get())
    return { ok: true }
  },

  // --- forja: mejorar equipo con Cristal de maná (excavación) + oro (skill forja) ---
  // Costo de mejorar una pieza: cristales + oro, crece con el nivel de forja actual.
  upgradeCost: (it) => {
    const up = upgradeLevel(it)
    return { crystals: 2 + up, gold: 60 + (it.tier || 1) * 10 + up * 50, max: up >= FORGE_MAX }
  },
  // Mejora la pieza del slot dado: +1 a su nivel de forja (más defensa/daño). Gasta materiales.
  upgradeGear: async (slot) => {
    const s = get()
    const it = s.equipment[slot]
    if (!isDurable(it)) return { ok: false }
    const up = upgradeLevel(it)
    if (up >= FORGE_MAX) { get().showToast(tt('forge_max')); return { ok: false } }
    const c = get().upgradeCost(it)
    const haveCrystal = get().countItem(752)
    if (haveCrystal < c.crystals) { get().showToast(tt('forge_need_crystals', { n: c.crystals })); return { ok: false } }
    if (s.gold < c.gold) { get().showToast(tt('forge_need_gold', { n: c.gold })); return { ok: false } }
    const r = await get()._spend(c.gold, 'forge', () => {
      // Subir la pieza (el equipo es client-side). El consumo de cristales se hace aparte:
      // online lo saca el server del bag autoritativo (bagConsume); offline, local.
      if (!isOnline()) {
        let left = c.crystals
        const inv = get().inventory.slice()
        for (let i = 0; i < inv.length && left > 0; i++) {
          const x = inv[i]; if (!x || x.id !== 752) continue
          const take = Math.min(x.count || 1, left); left -= take
          inv[i] = (x.count || 1) - take > 0 ? { ...x, count: (x.count || 1) - take } : null
        }
        set({ inventory: inv })
      }
      set({ equipment: { ...get().equipment, [slot]: { ...it, upgrade: up + 1 } } })
      get().addSkillXp('forja', 16); get().recomputeStats()
    })
    if (!r.ok) { get().showToast(tt('forge_need_gold', { n: c.gold })); return { ok: false } }
    if (isOnline()) { const cr = await net.bagConsume(752, c.crystals).catch(() => null); if (cr && cr.inv) get()._mirrorInv(cr.inv) }
    get().showToast(tt('forge_done', { name: itemName(it), n: up + 1 }))
    saveGame(get())
    return { ok: true }
  },

  // --- audio ---
  muted: false,
  toggleMute: () => set((s) => { const m = !s.muted; setMuted(m); return { muted: m } }),

  // --- idioma (EN por defecto; se guarda aparte del save) ---
  lang: loadLang(),
  setLang: (l) => { const lang = l === 'en' ? 'en' : 'es'; setLangGlobal(lang); saveLang(lang); set({ lang }) },
  toggleLang: () => get().setLang(get().lang === 'en' ? 'es' : 'en'),

  // --- correr / stamina ---
  running: false,
  stamina: 100,
  staminaMax: 100,
  toggleRun: () => set((s) => ({ running: !s.running })),
  setStamina: (stamina) => set({ stamina }),

  setRace: (race) => set({ race }),
  setGold: (gold) => set({ gold }),

  // Helper de SINK: online lo cobra el server (spendReq, valida saldo) y espeja el nuevo total;
  // offline resta local. `apply()` hace el efecto (reparar/mejorar/respec/ofrenda). { ok }.
  _spend: async (cost, reason, apply) => {
    if (isOnline()) {
      const r = await net.spendReq(cost, reason).catch(() => null)
      if (!r || !r.ok) return { ok: false }
      apply(); set({ gold: r.gold }); return { ok: true }
    }
    if (get().gold < cost) return { ok: false }
    apply(); set({ gold: get().gold - cost }); return { ok: true }
  },

  // Espejo del bag AUTORITATIVO del server (Fase A.2): hidrata los registros mínimos
  // {id,count,dur,upgrade} a ítems completos para la UI. Online es la ÚNICA vía por la que cambia
  // el inventario (loot/venta/compra/uso/depósito/transferencias). No persiste local: el server es
  // la fuente de verdad y el handler `save` pisa el inventario con el bag del server.
  _mirrorInv: (serverInv) => {
    if (!Array.isArray(serverInv)) return
    const inv = new Array(INVENTORY_SIZE).fill(null)
    for (let i = 0; i < Math.min(serverInv.length, INVENTORY_SIZE); i++) {
      const r = serverInv[i]; if (!r) continue
      const base = itemById(r.id); if (!base) continue
      const it = { ...base }
      if (r.count && r.count > 1) it.count = r.count
      if (r.dur != null) it.dur = r.dur
      if (r.upgrade) it.upgrade = r.upgrade
      inv[i] = it
    }
    set({ inventory: inv })
  },
  // Registro mínimo de un ítem (para mandarlo al bag del server: devolver/depositar).
  _recOf: (item) => {
    if (!item) return null
    const r = { id: item.id }
    if (item.count && item.count > 1) r.count = item.count
    if (item.dur != null) r.dur = item.dur
    if (item.upgrade) r.upgrade = item.upgrade
    return r
  },
  setPanel: (panel) => set({ panel }),
  togglePanel: (p) => set((s) => ({ panel: s.panel === p ? null : p })),

  // --- menú de jugador (al tocar a otro: comerciar / ver stats) ---
  playerMenu: null,          // { id, name, race, level, hp, hpMax, near } o null
  openPlayerMenu: (info) => set({ playerMenu: info }),
  closePlayerMenu: () => set({ playerMenu: null }),

  // --- trade P2P (ítems + oro; el server hace el swap atómico) ---
  tradeReq: null,            // { from, name } — pedido entrante (prompt)
  trade: null,               // { withId, withName, youIdx:[bagIndices], youGold, them:{items,gold}, youOk, themOk }
  requestTrade: (playerId, name) => { if (isOnline()) { net.tradeReq(playerId); get().showToast(tt('trade_sent', { name: name || '' })) } },
  onTradeReq: (m) => { if (!get().trade) set({ tradeReq: { from: m.from, name: m.name } }) },   // sólo si no estoy ya en uno
  acceptTradeReq: () => { const r = get().tradeReq; if (r) { net.tradeAccept(r.from); set({ tradeReq: null }) } },
  declineTradeReq: () => set({ tradeReq: null }),
  onTradeOpen: (m) => set({ tradeReq: null, trade: { withId: m.with?.id, withName: m.with?.name || '', youIdx: [], youGold: 0, them: { items: [], gold: 0 }, youOk: false, themOk: false } }),
  onTradeState: (m) => set((s) => (s.trade ? { trade: { ...s.trade, them: m.them || { items: [], gold: 0 }, youOk: !!m.youOk, themOk: !!m.themOk } } : {})),
  onTradeDone: () => { if (get().trade) { set({ trade: null }); get().showToast(tt('trade_done')) } },
  onTradeCancel: (m) => { if (get().trade || get().tradeReq) { set({ trade: null, tradeReq: null }); get().showToast(m?.reason ? tt('trade_cancelled_r', { r: m.reason }) : tt('trade_cancelled')) } },
  // Toggle de un ítem del bag en mi oferta (por índice) + reenvía la oferta al server.
  toggleTradeItem: (idx) => { const t = get().trade; if (!t) return; const has = t.youIdx.includes(idx); const youIdx = has ? t.youIdx.filter((i) => i !== idx) : [...t.youIdx, idx]; set({ trade: { ...t, youIdx, youOk: false } }); net.tradeOffer(youIdx, t.youGold) },
  setTradeGold: (g) => { const t = get().trade; if (!t) return; const youGold = Math.max(0, Math.min(get().gold, Math.floor(Number(g) || 0))); set({ trade: { ...t, youGold, youOk: false } }); net.tradeOffer(t.youIdx, youGold) },
  confirmTrade: () => { if (get().trade) net.tradeConfirm() },
  cancelTrade: () => { if (get().trade) { net.tradeCancel(); set({ trade: null }) } },

  // --- mercado (casa de subastas, precio fijo, global) ---
  marketListings: [],        // listados activos (browse)
  marketMine: [],            // mis publicaciones
  marketBusy: false,
  marketError: '',
  openMarket: () => { set({ panel: 'market', marketError: '' }); get().refreshMarket(); get().refreshMyListings() },
  refreshMarket: async () => {
    if (!isOnline()) { set({ marketListings: [] }); return }
    set({ marketBusy: true })
    const r = await net.marketBrowse().catch(() => null)
    set({ marketListings: r?.ok ? r.listings : [], marketBusy: false })
  },
  refreshMyListings: async () => {
    if (!isOnline()) { set({ marketMine: [] }); return }
    const r = await net.marketMine().catch(() => null)
    set({ marketMine: r?.ok ? r.listings : [] })
  },
  // Publicar un ítem del bag (por índice) a precio fijo. El server lo saca del bag (escrow).
  marketListItem: async (bagIndex, price) => {
    if (!isOnline()) return { ok: false }
    const r = await net.marketList(bagIndex, price).catch(() => null)
    if (!r || !r.ok) { set({ marketError: r?.error || 'no se pudo publicar' }); get().showToast(r?.error || tt('market_fail')); return { ok: false } }
    if (r.inv) get()._mirrorInv(r.inv)
    set({ marketError: '' }); get().showToast(tt('market_listed')); get().refreshMyListings()
    return { ok: true }
  },
  marketBuy: async (id) => {
    if (!isOnline()) return { ok: false }
    const r = await net.marketBuy(id).catch(() => null)
    if (!r || !r.ok) { get().showToast(r?.error || tt('market_fail')); get().refreshMarket(); return { ok: false } }
    if (r.inv) get()._mirrorInv(r.inv)
    if (typeof r.gold === 'number') set({ gold: r.gold })
    get().showToast(tt('market_bought')); get().refreshMarket()
    return { ok: true }
  },
  marketCancel: async (id) => {
    if (!isOnline()) return { ok: false }
    const r = await net.marketCancel(id).catch(() => null)
    if (!r || !r.ok) { get().showToast(r?.error || tt('market_fail')); return { ok: false } }
    if (r.inv) get()._mirrorInv(r.inv)
    get().showToast(tt('market_cancelled')); get().refreshMyListings()
    return { ok: true }
  },

  // --- bienvenida (1 vez por personaje) ---
  showWelcome: false,        // el modal de bienvenida está visible (lo dispara initCharacter la 1ª vez)
  // Cierra la bienvenida y la marca vista (persiste en questFlags._welcome, así no vuelve a salir).
  dismissWelcome: () => {
    const questFlags = { ...get().questFlags, _welcome: true }
    set({ showWelcome: false, questFlags })
    saveGame(get())
  },
  toggleLootLabels: () => set((s) => ({ lootLabels: !s.lootLabels })),

  // Inicializa personaje con su kit real (inventario + equipo) y calcula stats. Acepta
  // progreso (xp/skills) si viene de una partida guardada; si no, arranca en 0.
  initCharacter: ({ race, gold, inventory, equipment, belt, equippedBelt = null, xp = 0, skills = null, discovered = null, missions = null, missionsDate = '', seals = 0, attrAlloc = null, skillRanks = null, questFlags = null, specialAbility = undefined, graves = null, spectator = false }) => {
    const inv = inventory.slice(0, INVENTORY_SIZE)
    while (inv.length < INVENTORY_SIZE) inv.push(null)
    const level = playerLevelFromXp(xp)
    const equip = { ...emptyEquipment(), ...equipment }
    // Inicializa durabilidad de las piezas durables que no la traigan (kit inicial).
    for (const sl of Object.keys(equip)) {
      const it = equip[sl]
      if (isDurable(it) && it.dur == null) equip[sl] = { ...it, dur: durabilityMax(it) }
    }
    const alloc = { str: 0, dex: 0, int: 0, vit: 0, ...(attrAlloc || {}) }
    const ranks = skillRanks || {}
    const st = computeStats(race.id, level, equip, alloc, ranks)   // stats incluyen equipo + atributos + árbol
    const b = (belt || []).slice(0, 4)
    while (b.length < 4) b.push(null)
    // Botón derecho: si no viene del save, se liga por defecto a la 1ª habilidad desbloqueada.
    const special = specialAbility !== undefined ? specialAbility : (unlockedAbilities(st)[0]?.id || null)
    set({
      race, gold, stats: st, xp, skills: skills || emptySkills(),
      attrAlloc: alloc, skillRanks: ranks, questFlags: questFlags || {}, specialAbility: special,
      graves: graves || [], _graveId: (graves || []).reduce((m, g) => Math.max(m, g.id || 0), 0),
      spectator: !!spectator,
      inventory: inv, equipment: equip, belt: b, equippedBelt,
      discovered: discovered || {},
      missions: missions || [], missionsDate: missionsDate || '', seals: seals || 0,
      staminaMax: st.staminaMax, stamina: st.staminaMax,
    })
    get().ensureMissions()   // carga/renueva las misiones del día (conserva progreso si es hoy)
    // Bienvenida: la mostramos una vez por personaje (mirón nunca). La bandera vive en questFlags.
    if (!spectator && !(questFlags && questFlags._welcome)) set({ showWelcome: true })
    saveGame(get())
  },

  // Recalcula los stats derivados (base+nivel+equipo) preservando la vida/maná actuales.
  recomputeStats: () => {
    const s = get()
    if (!s.race || !s.stats) return
    const fresh = computeStats(s.race.id, s.stats.level, s.equipment, s.attrAlloc, s.skillRanks, s.guild?.level || 0)
    const hp = Math.min(s.stats.hp, fresh.hpMax)
    const mp = Math.min(s.stats.mp, fresh.mpMax)
    set({ stats: { ...fresh, hp, mp } })
  },

  // Suma XP de jugador; al subir de nivel recalcula stats (con equipo) y cura al máximo.
  addXp: (n) => {
    const s = get()
    const xp = s.xp + Math.max(0, n | 0)
    const level = playerLevelFromXp(xp)
    if (s.stats && level !== s.stats.level) {
      const fresh = computeStats(s.race?.id, level, s.equipment, s.attrAlloc, s.skillRanks, s.guild?.level || 0) // subir de nivel cura
      set({ xp, stats: fresh })
      get().showToast(tt('levelup_toast', { n: level }))
    } else {
      set({ xp, stats: s.stats ? { ...s.stats, level } : s.stats })
    }
    saveGame(get())
  },

  // Suma XP a una de las 6 acciones (cap nivel 20); recalcula su nivel y persiste.
  addSkillXp: (skill, n) => {
    const s = get()
    const cur = s.skills[skill]
    if (!cur || cur.level >= SKILL_CAP) return
    const xp = cur.xp + Math.max(0, n | 0)
    const skills = { ...s.skills, [skill]: { xp, level: skillLevelFromXp(xp) } }
    set({ skills })
    saveGame(get())
  },

  // --- árbol de habilidades + puntos de atributo ---
  // Puntos de atributo disponibles (ganados por nivel − repartidos).
  attrPoints: () => attrEarned(get().stats?.level || 1) - attrSpent(get().attrAlloc),
  // Puntos de habilidad disponibles (ganados por nivel − gastados en nodos).
  skillPoints: () => skillEarned(get().stats?.level || 1) - skillSpent(get().skillRanks),
  // Reparte un punto en un atributo (str/dex/int/vit). Recalcula stats.
  allocAttr: (attr) => {
    const s = get()
    if (!['str', 'dex', 'int', 'vit'].includes(attr)) return
    if (get().attrPoints() <= 0) { get().showToast(tt('no_attr_points')); return }
    const attrAlloc = { ...s.attrAlloc, [attr]: (s.attrAlloc[attr] || 0) + 1 }
    set({ attrAlloc })
    get().recomputeStats()
    saveGame(get())
  },
  // Sube un rango de un nodo del árbol. Chequea puntos, requisito de atributo y máximo.
  rankSkill: (nodeId) => {
    const s = get()
    const node = NODE_BY_ID[nodeId]
    if (!node) return
    const cur = s.skillRanks[nodeId] || 0
    if (cur >= node.max) { get().showToast(tt('node_max')); return }
    if (get().skillPoints() <= 0) { get().showToast(tt('no_skill_points')); return }
    const attrVal = s.stats?.[node.attr] || 0
    if (attrVal < node.req) { get().showToast(tt('node_req', { n: node.req })); return }
    const skillRanks = { ...s.skillRanks, [nodeId]: cur + 1 }
    set({ skillRanks })
    get().recomputeStats()
    saveGame(get())
  },
  // Reinicia atributos y árbol (devuelve todos los puntos). Cuesta oro.
  respecCost: () => 50 + (get().stats?.level || 1) * 25,
  respec: async () => {
    const s = get()
    if (attrSpent(s.attrAlloc) === 0 && skillSpent(s.skillRanks) === 0) { get().showToast(tt('respec_nothing')); return { ok: false } }
    const cost = get().respecCost()
    if (s.gold < cost) { get().showToast(tt('respec_no_gold', { n: cost })); return { ok: false } }
    const r = await get()._spend(cost, 'respec', () => {
      set({ attrAlloc: { str: 0, dex: 0, int: 0, vit: 0 }, skillRanks: {} }); get().recomputeStats()
    })
    if (!r.ok) { get().showToast(tt('respec_no_gold', { n: cost })); return { ok: false } }
    get().showToast(tt('respec_done', { n: cost }))
    saveGame(get())
    return { ok: true }
  },

  // Equipa un ítem del inventario (índice). Lo que ya estaba equipado vuelve al hueco.
  equipFromInventory: async (invIndex) => {
    const s = get()
    const item = s.inventory[invIndex]
    if (!item) return
    const slot = equipSlotFor(item, s.equipment)
    if (!slot) return
    const prev = s.equipment[slot]
    const equipment = { ...s.equipment }
    // Inicializa durabilidad al equipar (si es gear durable y no la trae).
    equipment[slot] = isDurable(item) && item.dur == null ? { ...item, dur: durabilityMax(item) } : item
    // Online: el bag es autoritativo del server. Sacamos el ítem del bag (bagTake) y devolvemos lo
    // que estaba equipado (bagGive). El equipo es client-side; así no se duplica al llegar un push.
    if (isOnline()) {
      const taken = await net.bagTake(invIndex, 1).catch(() => null)
      if (!taken || !taken.ok) return
      let inv = taken.inv
      if (prev) { const g = await net.bagGive(get()._recOf(prev)).catch(() => null); if (g && g.inv) inv = g.inv }
      if (inv) get()._mirrorInv(inv)
      set({ equipment })
      get().recomputeStats()
      saveGame(get())
      return
    }
    const inv = s.inventory.slice()
    inv[invIndex] = prev || null
    set({ inventory: inv, equipment })
    get().recomputeStats()   // el equipo cambia -> recalcular defensa/HP/daño
    saveGame(get())
  },

  // Agrega oro (loot). El gremio da +oro de botín (ventaja de nivel 1): se aplica el multiplicador.
  addGold: (n) => {
    // Online el ORO es autoritativo del servidor: los faucets van por sus RPCs (claimMission /
    // openSealChest / etc.) y el saldo lo setea el ack/push. addGold local queda no-op para no
    // desincronizar. Offline (modo pruebas) sí acredita local.
    if (isOnline()) return
    const s = get()
    const mul = (n > 0 && s.stats?.guildGoldMul) || 1
    set({ gold: s.gold + Math.round((n | 0) * mul) })
    saveGame(get())
  },

  // Fragmentos de sello: moneda premium de las misiones diarias (cofres de sello, ofrendas).
  seals: 0,
  addSeals: (n) => { set((s) => ({ seals: (s.seals || 0) + (n | 0) })); saveGame(get()) },

  // Mete un ítem al inventario. Los apilables (poción/crafting/scroll) se acumulan en
  // una celda con `count`; el resto va a un hueco libre. Devuelve true si entró.
  // Online el bag es AUTORITATIVO del server y todas las entradas de ítems online son iniciadas por
  // el server (loot/compra/craft/tumba empujan 'inv' o devuelven el bag). El cliente NUNCA inyecta un
  // ítem al bag por su cuenta (eso sería un mint). addItem online es un no-op seguro. Offline: local.
  addItem: (item, qty = 1) => {
    if (isOnline()) return true   // los faucets online los otorga el server; nada que hacer acá
    const s = get()
    const inv = s.inventory.slice()
    const stackable = STACK_SLOTS.has(item.slot)
    if (stackable) {
      const at = inv.findIndex((x) => x && x.id === item.id)
      if (at >= 0) {
        inv[at] = { ...inv[at], count: (inv[at].count || 1) + qty }
        set({ inventory: inv })
        saveGame(get())
        return true
      }
    }
    // Sólo hasta la capacidad actual (crece por nivel); el resto de las celdas está bloqueado.
    const cap = inventoryCapacity(s.stats?.level || 1)
    let free = -1
    for (let i = 0; i < cap; i++) { if (inv[i] == null) { free = i; break } }
    if (free < 0) return false // inventario lleno
    inv[free] = stackable ? { ...item, count: qty } : { ...item }
    set({ inventory: inv })
    saveGame(get())
    return true
  },

  // --- mercader ---
  shopStockDate: '',
  // Stock del día: se genera una vez por día y se conserva (con lo ya comprado) hasta el
  // día siguiente, que repone. Todos los jugadores ven el mismo stock (mercado compartido).
  openShop: (vendor, kind) => {
    // La bruja (kind 'alchemist') vende un stock FIJO: pociones de vida/maná + Pergamino de
    // Retorno. Cualquier otro mercader (Nix) usa el mercado del día (sin esas 3 cosas).
    if (kind === 'alchemist') {
      set({ shopStock: alchemistStock(), shopVendor: vendor || 'Alquimista', panel: 'shop' })
      return
    }
    // Mercader (Nix): SIEMPRE el mercado del día (sin pociones ni pergamino: esos los vende la
    // bruja). Recalculamos por las dudas el `shopStock` haya quedado con el stock de la bruja
    // (openAlchemy lo comparte); dailyStock es determinístico por fecha y no se agota al comprar.
    const today = todayStr()
    set({ shopStock: dailyStock(today), shopStockDate: today, shopVendor: vendor || 'Mercader', panel: 'shop' })
    saveGame(get())
  },

  // Abre al herrero (panel de reparación).
  smithName: '',
  openSmith: (name) => set({ smithName: name || 'Herrero', panel: 'smith' }),

  // Abre a la alquimista (panel de recetas).
  alchemyName: '',
  // La bruja: además de craftear, vende lo básico (pociones vida/maná + Pergamino de Retorno).
  // Cargamos su stock fijo para que el panel de alquimia tenga la sección de compra.
  openAlchemy: (name) => set({ alchemyName: name || 'Alquimista', shopStock: alchemistStock(), panel: 'alchemy' }),

  // --- gremios (Casa de Gremios, WORLD.md) ---
  // El server es autoritativo: acá guardamos la vista (mi gremio + miembros + ranking) y el oro
  // que confirma el server tras fundar/donar. El oro es la fuente de verdad del server.
  guild: null,            // { id, name, tag, color, level, donated, next } o null
  guildRole: null,        // 'founder' | 'member' | null
  guildMembers: [],       // [{ username, role }]
  guildRanking: [],       // ranking público
  guildBusy: false,
  guildError: '',
  // Aplica la respuesta del server a un cambio de gremio (oro autoritativo + recálculo de stats).
  _applyGuildResult: (r) => {
    if (!r || r.ok === false) { set({ guildError: r?.error || 'error del gremio' }); return false }
    const patch = { guildError: '' }
    if (r.guild !== undefined) patch.guild = r.guild
    if (r.role !== undefined) patch.guildRole = r.role
    if (typeof r.gold === 'number') patch.gold = r.gold   // el server descontó/confirmó el oro
    if (r.left) { patch.guild = null; patch.guildRole = null; patch.guildMembers = [] }
    set(patch)
    if (typeof r.gold === 'number') saveGame(get())
    get().recomputeStats()   // las ventajas del gremio cambian defensa/XP
    return true
  },
  // Empuja el estado actual al server (el server descuenta el oro del blob persistido, así que
  // antes de fundar/donar hay que sincronizar el oro vivo del cliente con el del server).
  _flushServerSave: async () => {
    const s = get()
    try { await net.save(s.playerName, s.race?.id, snapshot(s)) } catch {}
  },
  openGuild: () => { set({ panel: 'guild', guildError: '' }); get().refreshGuild() },
  refreshGuild: async () => {
    if (!ONLINE || !net.connected) { set({ guild: null, guildRole: null, guildMembers: [], guildRanking: [] }); return }
    set({ guildBusy: true })
    try {
      const info = await net.guildInfo()
      const list = await net.guildList(20)
      set({ guild: info.guild || null, guildRole: info.mine || null, guildMembers: info.members || [],
            guildRanking: list.guilds || [], guildBusy: false })
      get().recomputeStats()
    } catch { set({ guildBusy: false }) }
  },
  createGuild: async (name, tag, color) => {
    if (!ONLINE || !net.connected) { set({ guildError: tt('guild_need_online') }); return }
    set({ guildBusy: true })
    await get()._flushServerSave()   // sincronizar el oro con el server antes de que cobre la fundación
    const r = await net.guildCreate(name, tag, color).catch(() => null)
    set({ guildBusy: false })
    if (get()._applyGuildResult(r)) { get().showToast(tt('guild_founded', { tag: r.guild.tag })); get().refreshGuild() }
  },
  joinGuild: async (id) => {
    if (!ONLINE || !net.connected) { set({ guildError: tt('guild_need_online') }); return }
    set({ guildBusy: true })
    const r = await net.guildJoin({ id }).catch(() => null)
    set({ guildBusy: false })
    if (get()._applyGuildResult(r)) { get().showToast(tt('guild_joined', { tag: r.guild.tag })); get().refreshGuild() }
  },
  leaveGuild: async () => {
    if (!ONLINE || !net.connected) return
    set({ guildBusy: true })
    const r = await net.guildLeave().catch(() => null)
    set({ guildBusy: false })
    if (get()._applyGuildResult(r)) { get().showToast(tt('guild_left')); get().refreshGuild() }
  },
  donateGuild: async (amount) => {
    if (!ONLINE || !net.connected) return
    const amt = Math.floor(Number(amount) || 0)
    if (amt <= 0) { set({ guildError: tt('guild_bad_amount') }); return }
    set({ guildBusy: true })
    await get()._flushServerSave()   // sincronizar el oro con el server antes de que cobre la donación
    const r = await net.guildDonate(amt).catch(() => null)
    set({ guildBusy: false })
    if (get()._applyGuildResult(r)) {
      get().showToast(r.leveledUp ? tt('guild_leveled', { n: r.guild.level }) : tt('guild_donated', { n: amt }))
      get().refreshGuild()
    }
  },

  // --- Depósito del Gremio (banco compartido, nivel 4+) ---
  guildDeposit: null,       // { gold, items } o null
  guildDepBusy: false,
  refreshDeposit: async () => {
    if (!ONLINE || !net.connected) { set({ guildDeposit: null }); return }
    const r = await net.guildDepView().catch(() => null)
    set({ guildDeposit: r && r.ok ? r.deposit : null })
  },
  // Aplica la respuesta del depósito (oro autoritativo del personaje + contenido del depósito).
  _applyDepResult: (r) => {
    if (!r || r.ok === false) { set({ guildError: r?.error || 'error del depósito' }); return false }
    const patch = { guildError: '' }
    if (r.deposit) patch.guildDeposit = r.deposit
    if (typeof r.gold === 'number') patch.gold = r.gold
    set(patch)
    if (typeof r.gold === 'number') saveGame(get())
    return true
  },
  depositGold: async (amount, dir = 'in') => {
    if (!ONLINE || !net.connected) return
    const amt = Math.floor(Number(amount) || 0)
    if (amt <= 0) { set({ guildError: tt('guild_bad_amount') }); return }
    set({ guildDepBusy: true })
    if (dir === 'in') await get()._flushServerSave()   // el server descuenta del oro persistido
    const r = await net.guildDepGold(dir, amt).catch(() => null)
    set({ guildDepBusy: false })
    get()._applyDepResult(r)
  },
  // Depositar un ítem del inventario: el server lo saca del bag autoritativo (por índice) y lo
  // guarda en el depósito. Espejamos el bag que devuelve el ack (fuente de verdad).
  depositItem: async (invIndex) => {
    if (!ONLINE || !net.connected) return
    const item = get().inventory[invIndex]
    if (!item) return
    set({ guildDepBusy: true })
    const r = await net.guildDepItemIn(invIndex).catch(() => null)
    set({ guildDepBusy: false })
    if (get()._applyDepResult(r) && r.inv) get()._mirrorInv(r.inv)
  },
  // Retirar un ítem del depósito: el server lo saca del stash y lo mete en el bag autoritativo;
  // espejamos el bag del ack (no lo agregamos local: ya lo hizo el server).
  withdrawItem: async (index) => {
    if (!ONLINE || !net.connected) return
    set({ guildDepBusy: true })
    const r = await net.guildDepItemOut(index).catch(() => null)
    set({ guildDepBusy: false })
    if (get()._applyDepResult(r) && r.inv) get()._mirrorInv(r.inv)
  },

  // --- misiones diarias ---
  missions: [],
  missionsDate: '',
  // Asegura que estén las misiones de hoy (regenera si cambió el día; conserva el progreso).
  ensureMissions: () => {
    const s = get(); const today = todayStr()
    if (s.missionsDate === today && s.missions.length) return
    set({ missions: dailyMissions(today), missionsDate: today })
    saveGame(get())
  },
  openMissions: () => { get().ensureMissions(); set({ panel: 'missions' }) },
  // Suma progreso a las misiones activas del tipo dado (lo llama el loop en cada acción).
  missionProgress: (type, n = 1) => {
    const s = get()
    if (!s.missions.length || s.missionsDate !== todayStr()) return
    let changed = false, justDone = null
    const missions = s.missions.map((m) => {
      if (m.type !== type || m.claimed || m.progress >= m.target) return m
      const progress = Math.min(m.target, m.progress + n)
      changed = true
      if (progress >= m.target) justDone = m
      return { ...m, progress }
    })
    if (!changed) return
    set({ missions })
    if (justDone) get().showToast(tt('mission_done'))
    saveGame(get())
  },
  // Reclama la recompensa de una misión completada (XP + oro + sellos). Una sola vez.
  claimMission: async (i) => {
    const s = get(); const m = s.missions[i]
    if (!m || m.claimed || m.progress < m.target) return
    // Online: el server valida la COMPLETITUD (contó los mismos eventos autoritativos) y acredita el
    // oro. Sólo si dice ok marcamos reclamada y damos XP/sellos. Cierra "reclamar sin cumplir".
    if (isOnline()) {
      const r = await net.claimMissionReq(m.id).catch(() => null)
      if (!r || !r.ok) { get().showToast(tt('mission_not_ready')); return }
      const missions = get().missions.slice(); missions[i] = { ...m, claimed: true }; set({ missions })
      get().addXp(m.xp); if (m.seals) get().addSeals(m.seals)
      if (typeof r.gold === 'number') set({ gold: r.gold })
      get().showToast(tt('mission_reward', { xp: m.xp, gold: m.gold || 0, seals: m.seals || 0 }))
      saveGame(get())
      return
    }
    const missions = s.missions.slice(); missions[i] = { ...m, claimed: true }
    set({ missions })
    get().addXp(m.xp); if (m.seals) get().addSeals(m.seals)
    if (m.gold) get().addGold(m.gold)
    get().showToast(tt('mission_reward', { xp: m.xp, gold: m.gold || 0, seals: m.seals || 0 }))
    saveGame(get())
  },

  // Oro que pide la ofrenda diaria pendiente (0 si no hay ninguna activa). El obelisco lo usa
  // para ofrecer la donación con confirmación.
  pendingOfferingNeed: () => {
    const m = get().missions.find((x) => x.type === 'offering' && !x.claimed && x.progress < x.target)
    return m ? m.target - m.progress : 0
  },
  // Progreso de una ofrenda: entregar oro (lo llama el obelisco al confirmar). Cobra el oro que
  // falta y completa la misión de tipo 'offering'. Devuelve {ok} o motivo.
  deliverOffering: async () => {
    const s = get()
    const i = s.missions.findIndex((m) => m.type === 'offering' && !m.claimed && m.progress < m.target)
    if (i < 0) return { ok: false, reason: 'none' }
    const m = s.missions[i]
    const need = m.target - m.progress
    if (s.gold < need) { get().showToast(tt('offering_need', { n: need })); return { ok: false, reason: 'gold' } }
    const r = await get()._spend(need, 'offering', () => {
      const missions = get().missions.slice(); missions[i] = { ...missions[i], progress: missions[i].target }; set({ missions })
    })
    if (!r.ok) { get().showToast(tt('offering_need', { n: need })); return { ok: false, reason: 'gold' } }
    get().showToast(tt('offering_done'))
    saveGame(get())
    return { ok: true }
  },

  // Cofre de sellos (sumidero premium): gasta sellos y abre un cofre con loot bueno. Devuelve
  // los ítems que cayeron para que el loop los pinte, o {ok:false} con el motivo.
  sealChestCost: () => SEAL_CHEST_COST,
  openSealChest: async () => {
    const s = get()
    if ((s.seals || 0) < SEAL_CHEST_COST) { get().showToast(tt('seal_need', { n: SEAL_CHEST_COST })); return { ok: false } }
    const lvl = Math.max(4, Math.min(16, (s.stats?.level || 1) + 2))  // loot un pelín por encima del nivel
    set({ seals: s.seals - SEAL_CHEST_COST })   // los sellos son moneda premium NO-cripto: client-side
    // Oro + drops: online los computa el server (tabla de loot compartida); offline, roll local.
    let gold = 0, drops = []
    if (isOnline()) {
      const r = await net.sealChestReq(lvl).catch(() => null)
      if (r && r.ok) { if (typeof r.gold === 'number') set({ gold: r.gold }); gold = r.add || 0; drops = r.drops || [] }
    } else {
      const roll = rollLoot('chest_level_' + lvl); gold = roll.gold || 0; drops = roll.drops || []; if (gold) get().addGold(gold)
    }
    const got = []
    for (const d of drops) {
      const it = itemById(d.id); if (!it) continue
      // Online el server ya otorgó los ítems al bag (y empujó 'inv'); acá sólo armamos el aviso.
      // Offline los metemos local.
      if (isOnline()) got.push(itemName(it) + (d.qty > 1 ? ' ×' + d.qty : ''))
      else if (get().addItem(it, d.qty)) got.push(itemName(it) + (d.qty > 1 ? ' ×' + d.qty : ''))
    }
    get().showToast(got.length ? tt('seal_chest_got', { items: got.join(', ') }) : tt('seal_chest_empty'))
    saveGame(get())
    return { ok: true, gold, items: got }
  },

  // --- quests narrativas (banderas de estado, estilo Flare) ---
  questFlags: {},           // { flag: true } — estado del mundo para las quests (persistido)
  hasQuestFlag: (f) => !!get().questFlags[f],
  // Pone una bandera de quest. Si con eso se completa una quest, entrega su recompensa una vez.
  setQuestFlag: async (flag) => {
    const s = get()
    if (!flag || s.questFlags[flag]) return false
    const questFlags = { ...s.questFlags, [flag]: true }
    set({ questFlags })
    const done = QUESTS.find((q) => q.complete === flag)
    if (done) {
      const r = done.reward || {}
      if (r.xp) get().addXp(r.xp)
      if (r.seals) get().addSeals(r.seals)
      // Oro: online lo acredita el server (monto fijo por quest); offline, local.
      if (isOnline()) { const rr = await net.claimQuestReq(done.id).catch(() => null); if (rr && rr.ok && typeof rr.gold === 'number') set({ gold: rr.gold }) }
      else if (r.gold) get().addGold(r.gold)
      get().showToast(tt('quest_done', { name: questName(done) }))
      get().logMessage({ channel: 'sistema', text: tt('quest_reward', { xp: r.xp || 0, gold: r.gold || 0, seals: r.seals || 0 }) })
    } else {
      get().showToast(tt('quest_updated'))
    }
    saveGame(get())
    return true
  },
  // Al entrar a una zona con la quest de los Guardianes activa, revela un nombre olvidado.
  // Devuelve el nombre revelado (para que el loop lo anuncie) o null.
  revealForZone: (zone) => {
    const s = get()
    if (!s.questFlags.q3_init || s.questFlags.q3_finish) return null
    const r = ZONE_REVEALS[zone]
    if (!r || s.questFlags[r.flag]) return null
    get().setQuestFlag(r.flag)
    return r.name
  },
  // ¿Se puede despertar a los Guardianes? (los tres nombres, quest sin cerrar)
  canAwakenGuardians: () => {
    const f = get().questFlags
    return !!(f.q3_init && f.q3_ice && f.q3_fire && f.q3_wind && !f.q3_finish)
  },

  // --- tumbas (riesgo al morir): tu carga queda donde caíste ---
  graves: [],               // [{id, zone, tx, ty, items:[{id,count,dur}], gold}] (persistido)
  _graveId: 0,
  getGravesInZone: (zone) => (get().graves || []).filter((g) => g.zone === zone),
  // Al morir: vuelca el inventario + una fracción del oro a una tumba en (zone,tx,ty). El
  // equipo y el cinturón NO se pierden. Devuelve true si dejó algo.
  createGrave: async (zone, tx, ty) => {
    const s = get()
    // Online: el bag es autoritativo del server. bagDump lo vacía y nos devuelve los registros
    // (que van a la tumba client-side) + el oro de la tumba lo descuenta dropGraveReq. Espejamos
    // el bag vacío. El equipo y el cinturón NO se pierden (no están en el bag).
    if (isOnline()) {
      const dump = await net.bagDump().catch(() => null)
      const items = ((dump && dump.ok && dump.items) || []).map((r) => {
        const rec = { id: r.id }
        if (r.count && r.count > 1) rec.count = r.count
        if (r.dur != null) rec.dur = r.dur
        if (r.upgrade) rec.upgrade = r.upgrade
        return rec
      })
      const gr = await net.dropGraveReq().catch(() => null)
      let goldDrop = 0
      if (gr && gr.ok) { if (typeof gr.gold === 'number') set({ gold: gr.gold }); goldDrop = gr.dropped || 0 }
      if (dump && dump.inv) get()._mirrorInv(dump.inv)
      if (!items.length && goldDrop <= 0) return false
      const id = (get()._graveId || 0) + 1
      set({ graves: [...(get().graves || []), { id, zone, tx, ty, items, gold: goldDrop }], _graveId: id })
      saveGame(get())
      return true
    }
    const inv = s.inventory.slice()
    const items = []
    for (let i = 0; i < inv.length; i++) {
      const it = inv[i]
      if (!it) continue
      const rec = { id: it.id }
      if (it.count && it.count > 1) rec.count = it.count
      if (it.dur != null) rec.dur = it.dur
      items.push(rec)
      inv[i] = null
    }
    const goldDrop = Math.floor((s.gold || 0) * GRAVE_GOLD_FRACTION)
    if (!items.length && goldDrop <= 0) return false
    const id = (s._graveId || 0) + 1
    set({ inventory: inv, gold: s.gold - goldDrop, graves: [...(s.graves || []), { id, zone, tx, ty, items, gold: goldDrop }], _graveId: id })
    saveGame(get())
    return true
  },
  // Recupera una tumba: devuelve el oro y mete los ítems al inventario (respeta capacidad).
  // Devuelve true si entró TODO (y borra la tumba); false si el inventario se llenó (queda
  // la tumba con lo que no entró).
  recoverGrave: async (id) => {
    const s = get()
    const grave = (s.graves || []).find((g) => g.id === id)
    if (!grave) return true
    // Oro: online lo devuelve el server (el pendiente que guardó al morir); offline, local.
    if (isOnline()) { const r = await net.recoverGraveReq().catch(() => null); if (r && r.ok && typeof r.gold === 'number') set({ gold: r.gold }) }
    else if (grave.gold) set({ gold: get().gold + grave.gold })
    const leftover = []
    if (isOnline()) {
      // Online: cada ítem vuelve al bag autoritativo (bagGive, respeta capacidad). Lo que no entra
      // queda en la tumba. Awaiteamos en orden para no pisar el mirror.
      for (const rec of grave.items) {
        const g = await net.bagGive(rec).catch(() => null)
        if (g && g.ok) { if (g.inv) get()._mirrorInv(g.inv) } else leftover.push(rec)
      }
    } else {
      for (const rec of grave.items) {
        const base = itemById(rec.id)
        if (!base) continue
        const it = { ...base }
        if (rec.count > 1) it.count = rec.count
        if (rec.dur != null) it.dur = rec.dur
        if (!get().addItem(it, rec.count || 1)) leftover.push(rec)
      }
    }
    if (leftover.length) {
      const graves = get().graves.map((g) => (g.id === id ? { ...g, items: leftover, gold: 0 } : g))
      set({ graves })
      get().showToast(tt('grave_full'))
      saveGame(get())
      return false
    }
    set({ graves: get().graves.filter((g) => g.id !== id) })
    get().showToast(tt('grave_recovered'))
    saveGame(get())
    return true
  },

  // Cuenta cuántas unidades de un ítem (por id) hay en el inventario (respeta stacks).
  countItem: (id) => get().inventory.reduce((n, it) => n + (it && it.id === id ? (it.count || 1) : 0), 0),

  // Prepara una receta de alquimia: descuenta los materiales y agrega la poción. Suma a la
  // skill de alquimia. Devuelve {ok} o {ok:false, reason}.
  craftAlchemy: async (recipe) => {
    const s = get()
    const countOf0 = (id) => s.inventory.reduce((n, it) => n + (it && it.id === id ? (it.count || 1) : 0), 0)
    // Online: un solo RPC AUTORITATIVO — el server valida la receta (shared), consume los materiales
    // del bag y otorga la poción como faucet (no por bag_give, que sólo devuelve ítems ya poseídos).
    if (isOnline()) {
      for (const [id, qty] of recipe.ins) { if (countOf0(id) < qty) return { ok: false, reason: 'materiales' } }
      const r = await net.craftReq(recipe.out).catch(() => null)
      if (!r || !r.ok) return { ok: false, reason: 'materiales' }
      if (r.inv) get()._mirrorInv(r.inv)
      const outItem = itemById(recipe.out)
      get().addSkillXp('alquimia', 10)
      get().showToast(tt('brewed', { name: itemName(outItem) }))
      get().logMessage({ channel: 'sistema', text: tt('alchemy_log', { name: itemName(outItem) }) })
      return { ok: true }
    }
    const inv = s.inventory.slice()
    const countOf = (id) => inv.reduce((n, it) => n + (it && it.id === id ? (it.count || 1) : 0), 0)
    for (const [id, qty] of recipe.ins) { if (countOf(id) < qty) return { ok: false, reason: 'materiales' } }
    // descontar cada material
    for (const [id, qty] of recipe.ins) {
      let left = qty
      for (let i = 0; i < inv.length && left > 0; i++) {
        const it = inv[i]
        if (!it || it.id !== id) continue
        const have = it.count || 1
        const take = Math.min(have, left)
        left -= take
        inv[i] = have - take > 0 ? { ...it, count: have - take } : null
      }
    }
    set({ inventory: inv })
    const out = itemById(recipe.out)
    if (!get().addItem(out, 1)) { set({ inventory: s.inventory }); return { ok: false, reason: 'lleno' } }
    get().addSkillXp('alquimia', 10)
    get().showToast(tt('brewed', { name: itemName(out) }))
    get().logMessage({ channel: 'sistema', text: tt('alchemy_log', { name: itemName(out) }) })
    saveGame(get())
    return { ok: true }
  },

  // Compra un ítem del mercado del día (precio completo). Sin límite de stock: el catálogo es
  // compartido y todos pueden comprar los mismos ítems mientras tengan oro.
  // Comprar al mercader. Online: el COSTO lo cobra el server (oro autoritativo) y el saldo llega en
  // el ack; el ítem se agrega local (inventario aún client-side). Offline: todo local.
  buyItem: async (stockIndex) => {
    const s = get()
    const item = s.shopStock[stockIndex]
    if (!item) return { ok: false, reason: 'no-item' }
    const price = item.price || 0
    const clean = { ...item }; delete clean.stock
    // Online: el server cobra el oro Y otorga el ítem al bag autoritativo (todo en el buyack);
    // espejamos bag + saldo. Si el bag está lleno o falta oro, el server no cobra ni otorga.
    if (isOnline()) {
      const r = await net.buyReq(item.id).catch(() => null)
      if (!r || !r.ok) return { ok: false, reason: r?.error === 'inventario lleno' ? 'full' : 'no-gold' }
      if (r.inv) get()._mirrorInv(r.inv)
      if (typeof r.gold === 'number') set({ gold: r.gold })
      return { ok: true }
    }
    if (s.gold < price) return { ok: false, reason: 'no-gold' }
    if (!get().addItem(clean, 1)) return { ok: false, reason: 'full' }
    set({ gold: get().gold - price })
    saveGame(get())
    return { ok: true }
  },

  // Vende una unidad de un ítem del inventario al mercader (25% del precio). Online: el VALOR lo
  // computa el server y acredita; acá sólo se saca el ítem del inventario (aún client-side).
  sellItem: async (invIndex) => {
    const s = get()
    const item = s.inventory[invIndex]
    if (!item) return { ok: false }
    // Online: el server saca el ítem del bag por índice (valida posesión), computa el valor y
    // acredita el oro; espejamos el bag + saldo del ack. Cierra "vender lo que no tenés".
    if (isOnline()) {
      const r = await net.sellReq(invIndex).catch(() => null)
      if (!r || !r.ok) return { ok: false }
      if (r.inv) get()._mirrorInv(r.inv)
      if (typeof r.gold === 'number') set({ gold: r.gold })
      return { ok: true, gain: r.gain }
    }
    const gain = sellValue(item)
    const inv = get().inventory.slice(); const it = inv[invIndex]
    if (it.count && it.count > 1) inv[invIndex] = { ...it, count: it.count - 1 }; else inv[invIndex] = null
    set({ inventory: inv, gold: get().gold + gain }); saveGame(get())
    return { ok: true, gain }
  },

  // Saca lo equipado en un slot y lo manda al primer hueco libre (dentro de la capacidad).
  unequip: async (slot) => {
    const s = get()
    const item = s.equipment[slot]
    if (!item) return
    // Online: el server devuelve el ítem al bag autoritativo (bagGive, respeta capacidad). Si no
    // hay lugar, no se desequipa. Preserva durabilidad/forja en el registro que vuelve al bag.
    if (isOnline()) {
      const g = await net.bagGive(get()._recOf(item)).catch(() => null)
      if (!g || !g.ok) { get().showToast(tt('inv_full')); return }
      if (g.inv) get()._mirrorInv(g.inv)
      set({ equipment: { ...s.equipment, [slot]: null } })
      get().recomputeStats()
      saveGame(get())
      return
    }
    const inv = s.inventory.slice()
    const cap = inventoryCapacity(s.stats?.level || 1)
    let idx = -1
    for (let i = 0; i < cap; i++) { if (inv[i] == null) { idx = i; break } }
    if (idx < 0) return // inventario lleno
    inv[idx] = item
    const equipment = { ...s.equipment, [slot]: null }
    set({ inventory: inv, equipment })
    get().recomputeStats()
    saveGame(get())
  },

  getEquipment: () => get().equipment,

  // Suscripción para el paperdoll de Pixi: llama cb cuando cambia el equipo.
  onEquipmentChange: (cb) => {
    let last = get().equipment
    return useGameStore.subscribe((state) => {
      if (state.equipment !== last) {
        last = state.equipment
        cb(last)
      }
    })
  },
}))

// Hooks de inspección para tests/depuración (solo dev).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__vigiliaStoreState = () => useGameStore.getState()
  window.__vigiliaSetState = (o) => useGameStore.setState(o)
  window.__vigiliaEquip = (i) => useGameStore.getState().equipFromInventory(i)
}

// Setters planos para el loop de Pixi (sin acoplar Pixi a React).
export const storeApi = {
  setFps: (v) => useGameStore.getState().setFps(v),
  setMapTitle: (v) => useGameStore.getState().setMapTitle(v),
  setDebug: (v) => useGameStore.getState().setDebug(v),
  getEquipment: () => useGameStore.getState().getEquipment(),
  onEquipmentChange: (cb) => useGameStore.getState().onEquipmentChange(cb),
  setStamina: (v) => useGameStore.getState().setStamina(v),
  setMinimap: (v) => useGameStore.getState().setMinimap(v),
  setPlayerTile: (v) => useGameStore.getState().setPlayerTile(v),
  getPlayerName: () => useGameStore.getState().playerName,
  getSpeech: () => useGameStore.getState().speech,
  openDialogue: (d) => useGameStore.getState().openDialogue(d),
  openShop: (vendor) => useGameStore.getState().openShop(vendor),
  openSmith: (name) => useGameStore.getState().openSmith(name),
  openAlchemy: (name) => useGameStore.getState().openAlchemy(name),
  openGuild: () => useGameStore.getState().openGuild(),
  refreshGuild: () => useGameStore.getState().refreshGuild(),
  setSafeZone: (v) => useGameStore.getState().setSafeZone(v),
  getRunState: () => {
    const s = useGameStore.getState()
    return { running: s.running, stamina: s.stamina, staminaMax: s.staminaMax }
  },
  addGold: (n) => useGameStore.getState().addGold(n),
  setGold: (g) => useGameStore.getState().setGold(g),   // espejo del oro autoritativo del server
  addItem: (item, qty) => useGameStore.getState().addItem(item, qty),
  mirrorInv: (inv) => useGameStore.getState()._mirrorInv(inv),   // espejo del bag autoritativo del server
  inventoryFull: () => useGameStore.getState().inventory.every((x) => x != null),
  addXp: (n) => useGameStore.getState().addXp(n),
  addSkillXp: (skill, n) => useGameStore.getState().addSkillXp(skill, n),
  getPlayerLevel: () => useGameStore.getState().stats?.level || 1,
  getRaceName: () => raceName(useGameStore.getState().race) || '',
  setNearby: (v) => useGameStore.getState().setNearby(v),
  getInteractSeq: () => useGameStore.getState().interactSeq,
  setNearbyNode: (v) => useGameStore.getState().setNearbyNode(v),
  getGatherSeq: () => useGameStore.getState().gatherSeq,
  setNearbyPortal: (v) => useGameStore.getState().setNearbyPortal(v),
  setPortals: (v) => useGameStore.getState().setPortals(v),
  setNpcTiles: (v) => useGameStore.getState().setNpcTiles(v),
  setGraveTiles: (v) => useGameStore.getState().setGraveTiles(v),
  getRecallSeq: () => useGameStore.getState().recallSeq,
  getRecallSource: () => useGameStore.getState().recallSource,
  consumeBelt: (i) => useGameStore.getState().consumeBelt(i),
  consumeInventory: (i) => useGameStore.getState().consumeInventory(i),
  setRecallAnchor: (a) => useGameStore.getState().setRecallAnchor(a),
  getRecallAnchor: () => useGameStore.getState().recallAnchor,
  clearRecallAnchor: () => useGameStore.getState().clearRecallAnchor(),
  setZoneLoad: (z) => useGameStore.getState().setZoneLoad(z),
  setMapName: (m) => useGameStore.getState().setMapName(m),
  getDiscovered: () => useGameStore.getState().discovered,
  discoverZone: (zone, tx, ty, label) => useGameStore.getState().discoverZone(zone, tx, ty, label),
  setWaypointList: (l) => useGameStore.getState().setWaypointList(l),
  getWaypointSeq: () => useGameStore.getState().waypointSeq,
  getWaypointTarget: () => useGameStore.getState().waypointTarget,
  missionProgress: (type, n) => useGameStore.getState().missionProgress(type, n),
  getMissions: () => useGameStore.getState().missions,
  deliverOffering: () => useGameStore.getState().deliverOffering(),
  pendingOfferingNeed: () => useGameStore.getState().pendingOfferingNeed(),
  setQuestFlag: (f) => useGameStore.getState().setQuestFlag(f),
  hasQuestFlag: (f) => useGameStore.getState().hasQuestFlag(f),
  revealForZone: (z) => useGameStore.getState().revealForZone(z),
  canAwakenGuardians: () => useGameStore.getState().canAwakenGuardians(),
  takeDamage: (n) => useGameStore.getState().takeDamage(n),
  heal: (n) => useGameStore.getState().heal(n),
  restoreMana: (n) => useGameStore.getState().restoreMana(n),
  spendMana: (n) => useGameStore.getState().spendMana(n),
  getCastSeq: () => useGameStore.getState().castSeq,
  getCastAbility: () => useGameStore.getState().castAbility,
  setAbilityCd: (id, ms) => useGameStore.getState().setAbilityCd(id, ms),
  setActiveBuffs: (list) => useGameStore.getState().setActiveBuffs(list),
  getSpecialAbility: () => useGameStore.getState().specialAbility,
  reviveFull: () => useGameStore.getState().reviveFull(),
  createGrave: (zone, tx, ty) => useGameStore.getState().createGrave(zone, tx, ty),
  getGravesInZone: (zone) => useGameStore.getState().getGravesInZone(zone),
  recoverGrave: (id) => useGameStore.getState().recoverGrave(id),
  degradeGear: (kind, amount) => useGameStore.getState().degradeGear(kind, amount),
  getStats: () => useGameStore.getState().stats,
  getLootLabels: () => useGameStore.getState().lootLabels,
  isSpectator: () => useGameStore.getState().spectator,
  getSaveBlob: () => { const s = useGameStore.getState(); return { name: s.playerName, race: s.race?.id, char: snapshot(s) } },
  showToast: (t) => useGameStore.getState().showToast(t),
  logMessage: (m) => useGameStore.getState().logMessage(m),
  // Trade P2P (Kintara #3): el loop de Pixi enruta los eventos de red y el tap a un jugador.
  requestTrade: (id, name) => useGameStore.getState().requestTrade(id, name),
  openPlayerMenu: (info) => useGameStore.getState().openPlayerMenu(info),
  onTradeReq: (m) => useGameStore.getState().onTradeReq(m),
  onTradeOpen: (m) => useGameStore.getState().onTradeOpen(m),
  onTradeState: (m) => useGameStore.getState().onTradeState(m),
  onTradeDone: () => useGameStore.getState().onTradeDone(),
  onTradeCancel: (m) => useGameStore.getState().onTradeCancel(m),
}
