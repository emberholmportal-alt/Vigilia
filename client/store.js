// Store compartido. El loop de Pixi escribe telemetría; React maneja la UI y el
// equipo. React NO toca el loop del juego.
//
// El equipo es la fuente de verdad de la UI (React); el paperdoll de Pixi reacciona
// vía onEquipmentChange. Cuando llegue el servidor autoritativo (regla 2), equip()
// pasará a pedirle al server y aplicar su respuesta.
import { create } from 'zustand'
import { computeStats } from './data/stats.js'
import { isDurable, durabilityMax } from './data/items.js'
import { setMuted } from './engine/audio.js'
import { dailyStock, todayStr } from './data/shop.js'
import { emptySkills, playerLevelFromXp, skillLevelFromXp, SKILL_CAP, inventoryCapacity } from './data/progression.js'
import { saveGame } from './data/save.js'

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

// Slots de equipo. Los primeros 7 se ven en el paperdoll; ring/artifact no.
export const EQUIP_SLOTS = ['head', 'chest', 'legs', 'hands', 'feet', 'main', 'off', 'ring', 'artifact']
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

// A qué slot de equipo va un ítem según su `slot` de datos.
export function equipSlotFor(item) {
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
  setPlayerTile: (playerTile) => set({ playerTile }),

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
  xp: 0,                    // XP total del jugador (define el nivel)
  skills: emptySkills(),    // las 6 acciones: { skill: {xp, level} }
  inventory: [],            // array de ítems (huecos = null), largo INVENTORY_SIZE
  equipment: emptyEquipment(),
  belt: [null, null, null, null], // cinturón (slots usables = capacidad del cinturón equipado)
  equippedBelt: null,             // ítem de cinturón equipado (define cuántos slots hay)
  panel: null,              // 'inventory' | 'character' | 'shop' | null
  shopStock: [],            // stock del mercader (rota por día)
  shopVendor: '',           // nombre del mercader abierto
  nearby: null,             // {name, shop} — NPC cercano interactuable (lo escribe el loop)
  interactSeq: 0,           // el botón "interactuar" del HUD lo incrementa; el loop lo lee
  setNearby: (nearby) => set((s) => (s.nearby?.name === nearby?.name ? {} : { nearby })),
  requestInteract: () => set((s) => ({ interactSeq: s.interactSeq + 1 })),

  // --- combate: enemigo/cadáver cercano (botones del HUD) ---
  nearbyEnemy: null,        // {name, level} — enemigo vivo cerca
  nearbyCorpse: null,       // {name, level} — cadáver cerca (inspeccionable)
  combatSeq: 0,             // botón "Atacar"
  inspectSeq: 0,            // botón "Inspeccionar"
  setNearbyEnemy: (e) => set((s) => (s.nearbyEnemy?.name === e?.name && s.nearbyEnemy?.level === e?.level ? {} : { nearbyEnemy: e })),
  setNearbyCorpse: (c) => set((s) => (s.nearbyCorpse?.name === c?.name && s.nearbyCorpse?.level === c?.level ? {} : { nearbyCorpse: c })),
  requestAttack: () => set((s) => ({ combatSeq: s.combatSeq + 1 })),
  requestInspect: () => set((s) => ({ inspectSeq: s.inspectSeq + 1 })),

  // --- portales ---
  nearbyPortal: null,       // {label} — portal cercano (lo escribe el loop)
  portalSeq: 0,             // el botón "Viajar" del HUD lo incrementa; el loop lo lee
  portalTiles: [],          // [{x,y,label}] — para marcar en el minimapa
  setNearbyPortal: (p) => set((s) => (s.nearbyPortal?.label === p?.label ? {} : { nearbyPortal: p })),
  requestPortal: () => set((s) => ({ portalSeq: s.portalSeq + 1 })),
  setPortals: (portalTiles) => set({ portalTiles }),

  // --- combate ---
  // Aplica daño al jugador (lo llama el loop cuando un enemigo pega). Devuelve la vida
  // resultante; el loop decide la muerte cuando llega a 0.
  takeDamage: (n) => {
    const s = get(); const st = s.stats
    if (!st) return 0
    const hp = Math.max(0, st.hp - Math.max(0, n | 0))
    set({ stats: { ...st, hp } })
    return hp
  },
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
  },

  // Usar un consumible del cinturón (índice). Cura vida/maná; si no hace falta (ya al
  // máximo) avisa con un toast y NO gasta la poción. Al usarla, la descuenta del slot.
  useBelt: (i) => {
    const s = get()
    const it = s.belt[i]
    if (!it) return
    const eff = potionEffect(it)
    if (!eff) { get().showToast('No podés usar esto todavía'); return }
    const st = s.stats || {}
    if (eff.hp) {
      if ((st.hp ?? 0) >= (st.hpMax ?? 0)) { get().showToast('Tu vida ya está al máximo'); return }
      set({ stats: { ...st, hp: Math.min(st.hpMax, st.hp + eff.hp) } })
    } else if (eff.mp) {
      if ((st.mp ?? 0) >= (st.mpMax ?? 0)) { get().showToast('Tu maná ya está al máximo'); return }
      set({ stats: { ...st, mp: Math.min(st.mpMax, st.mp + eff.mp) } })
    }
    const belt = s.belt.slice()
    const cnt = (it.count || 1) - 1
    belt[i] = cnt > 0 ? { ...it, count: cnt } : null
    set({ belt })
    get().showToast(eff.hp ? `+${eff.hp} de vida` : `+${eff.mp} de maná`)
    saveGame(get())
  },

  // Manda un consumible del inventario al cinturón (se apila si ya hay del mismo; si no,
  // al primer hueco libre). Si el cinturón está lleno avisa con un toast.
  assignBelt: (invIndex) => {
    const s = get()
    const it = s.inventory[invIndex]
    if (!beltEligible(it)) { get().showToast('Sólo consumibles van al cinturón'); return }
    const cap = beltCapacityOf(s.equippedBelt)
    const qty = it.count || 1
    const belt = s.belt.slice()
    let bi = belt.findIndex((b, i) => i < cap && b && b.id === it.id)
    if (bi < 0) { for (let i = 0; i < cap; i++) { if (belt[i] == null) { bi = i; break } } }
    if (bi < 0) { get().showToast('El cinturón está lleno'); return }
    belt[bi] = belt[bi] ? { ...belt[bi], count: (belt[bi].count || 1) + qty } : { ...it, count: qty }
    const inv = s.inventory.slice()
    inv[invIndex] = null
    set({ belt, inventory: inv })
    get().showToast('Al cinturón')
    saveGame(get())
  },

  // Equipa un cinturón (ítem slot 'belt') del inventario: define cuántos slots tiene el
  // cinturón. El anterior vuelve al inventario; si achica la capacidad, los consumibles
  // que sobran vuelven al inventario.
  equipBelt: (invIndex) => {
    const s = get()
    const it = s.inventory[invIndex]
    if (!it || it.slot !== 'belt') return
    const inv = s.inventory.slice()
    const prev = s.equippedBelt
    inv[invIndex] = prev || null
    const cap = beltCapacityOf(it)
    const belt = s.belt.slice()
    for (let i = cap; i < belt.length; i++) {   // consumibles que ya no entran -> inventario
      if (belt[i]) { const f = inv.findIndex((x) => x == null); if (f >= 0) inv[f] = belt[i]; belt[i] = null }
    }
    set({ equippedBelt: { ...it }, inventory: inv, belt })
    get().showToast('Cinturón equipado: ' + it.beltSlots + ' espacios')
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
        get().showToast('¡Tu ' + (it.name || 'equipo') + ' se destruyó!')
        saveGame(get())
      }
      return
    }
    const dur = Math.max(0, (it.dur != null ? it.dur : durabilityMax(it)) - amount)
    eq[target] = { ...it, dur }
    set({ equipment: eq })
    if (dur <= 0) {
      get().recomputeStats()
      get().showToast('¡Se rompió tu ' + (it.name || 'equipo') + '! Llevalo al herrero.')
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
  repairAll: () => {
    const s = get()
    const cost = get().repairCost()
    if (cost <= 0) { get().showToast('Tu equipo está impecable'); return { ok: false } }
    if (s.gold < cost) { get().showToast('No te alcanza el oro para reparar'); return { ok: false } }
    const eq = { ...s.equipment }
    for (const sl of Object.keys(eq)) {
      if (isDurable(eq[sl])) eq[sl] = { ...eq[sl], dur: durabilityMax(eq[sl]) }
    }
    set({ equipment: eq, gold: s.gold - cost })
    get().recomputeStats()
    get().showToast('Equipo reparado (-' + cost + ' oro)')
    saveGame(get())
    return { ok: true }
  },

  // --- audio ---
  muted: false,
  toggleMute: () => set((s) => { const m = !s.muted; setMuted(m); return { muted: m } }),

  // --- correr / stamina ---
  running: false,
  stamina: 100,
  staminaMax: 100,
  toggleRun: () => set((s) => ({ running: !s.running })),
  setStamina: (stamina) => set({ stamina }),

  setRace: (race) => set({ race }),
  setGold: (gold) => set({ gold }),
  setPanel: (panel) => set({ panel }),
  togglePanel: (p) => set((s) => ({ panel: s.panel === p ? null : p })),

  // Inicializa personaje con su kit real (inventario + equipo) y calcula stats. Acepta
  // progreso (xp/skills) si viene de una partida guardada; si no, arranca en 0.
  initCharacter: ({ race, gold, inventory, equipment, belt, equippedBelt = null, xp = 0, skills = null }) => {
    const inv = inventory.slice(0, INVENTORY_SIZE)
    while (inv.length < INVENTORY_SIZE) inv.push(null)
    const level = playerLevelFromXp(xp)
    const equip = { ...emptyEquipment(), ...equipment }
    // Inicializa durabilidad de las piezas durables que no la traigan (kit inicial).
    for (const sl of Object.keys(equip)) {
      const it = equip[sl]
      if (isDurable(it) && it.dur == null) equip[sl] = { ...it, dur: durabilityMax(it) }
    }
    const st = computeStats(race.id, level, equip)   // stats incluyen el equipo
    const b = (belt || []).slice(0, 4)
    while (b.length < 4) b.push(null)
    set({
      race, gold, stats: st, xp, skills: skills || emptySkills(),
      inventory: inv, equipment: equip, belt: b, equippedBelt,
      staminaMax: st.staminaMax, stamina: st.staminaMax,
    })
    saveGame(get())
  },

  // Recalcula los stats derivados (base+nivel+equipo) preservando la vida/maná actuales.
  recomputeStats: () => {
    const s = get()
    if (!s.race || !s.stats) return
    const fresh = computeStats(s.race.id, s.stats.level, s.equipment)
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
      const fresh = computeStats(s.race?.id, level, s.equipment) // subir de nivel cura
      set({ xp, stats: fresh })
      get().showToast('¡Subiste a nivel ' + level + '!')
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

  // Equipa un ítem del inventario (índice). Lo que ya estaba equipado vuelve al hueco.
  equipFromInventory: (invIndex) => {
    const s = get()
    const item = s.inventory[invIndex]
    if (!item) return
    const slot = equipSlotFor(item)
    if (!slot) return
    const inv = s.inventory.slice()
    const equipment = { ...s.equipment }
    const prev = equipment[slot]
    // Inicializa durabilidad al equipar (si es gear durable y no la trae).
    equipment[slot] = isDurable(item) && item.dur == null ? { ...item, dur: durabilityMax(item) } : item
    inv[invIndex] = prev || null
    set({ inventory: inv, equipment })
    get().recomputeStats()   // el equipo cambia -> recalcular defensa/HP/daño
    saveGame(get())
  },

  // Agrega oro (loot).
  addGold: (n) => { set((s) => ({ gold: s.gold + (n | 0) })); saveGame(get()) },

  // Mete un ítem al inventario. Los apilables (poción/crafting/scroll) se acumulan en
  // una celda con `count`; el resto va a un hueco libre. Devuelve true si entró.
  addItem: (item, qty = 1) => {
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
  openShop: (vendor) => {
    const s = get()
    const today = todayStr()
    let shopStock = s.shopStock, shopStockDate = s.shopStockDate
    if (shopStockDate !== today || !shopStock || !shopStock.length) {
      shopStock = dailyStock(today); shopStockDate = today
    }
    set({ shopStock, shopStockDate, shopVendor: vendor || 'Mercader', panel: 'shop' })
    saveGame(get())
  },

  // Abre al herrero (panel de reparación).
  smithName: '',
  openSmith: (name) => set({ smithName: name || 'Herrero', panel: 'smith' }),

  // Compra un ítem del stock (precio completo). El stock del día se agota al comprar.
  buyItem: (stockIndex) => {
    const s = get()
    const item = s.shopStock[stockIndex]
    if (!item) return { ok: false, reason: 'no-item' }
    if ((item.stock | 0) <= 0) return { ok: false, reason: 'sold-out' }
    const price = item.price || 0
    if (s.gold < price) return { ok: false, reason: 'no-gold' }
    const clean = { ...item }; delete clean.stock
    if (!get().addItem(clean, 1)) return { ok: false, reason: 'full' }
    const shopStock = s.shopStock.slice()
    shopStock[stockIndex] = { ...item, stock: item.stock - 1 }
    set({ gold: get().gold - price, shopStock })
    saveGame(get())
    return { ok: true }
  },

  // Vende una unidad de un ítem del inventario al mercader (25% del precio).
  sellItem: (invIndex) => {
    const s = get()
    const item = s.inventory[invIndex]
    if (!item) return { ok: false }
    const gain = sellValue(item)
    const inv = s.inventory.slice()
    if (item.count && item.count > 1) inv[invIndex] = { ...item, count: item.count - 1 }
    else inv[invIndex] = null
    set({ inventory: inv, gold: s.gold + gain })
    saveGame(get())
    return { ok: true, gain }
  },

  // Saca lo equipado en un slot y lo manda al primer hueco libre (dentro de la capacidad).
  unequip: (slot) => {
    const s = get()
    const item = s.equipment[slot]
    if (!item) return
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
  getRunState: () => {
    const s = useGameStore.getState()
    return { running: s.running, stamina: s.stamina, staminaMax: s.staminaMax }
  },
  addGold: (n) => useGameStore.getState().addGold(n),
  addItem: (item, qty) => useGameStore.getState().addItem(item, qty),
  inventoryFull: () => useGameStore.getState().inventory.every((x) => x != null),
  addXp: (n) => useGameStore.getState().addXp(n),
  addSkillXp: (skill, n) => useGameStore.getState().addSkillXp(skill, n),
  getPlayerLevel: () => useGameStore.getState().stats?.level || 1,
  getRaceName: () => useGameStore.getState().race?.name || '',
  setNearby: (v) => useGameStore.getState().setNearby(v),
  getInteractSeq: () => useGameStore.getState().interactSeq,
  setNearbyPortal: (v) => useGameStore.getState().setNearbyPortal(v),
  getPortalSeq: () => useGameStore.getState().portalSeq,
  setPortals: (v) => useGameStore.getState().setPortals(v),
  setNearbyEnemy: (v) => useGameStore.getState().setNearbyEnemy(v),
  setNearbyCorpse: (v) => useGameStore.getState().setNearbyCorpse(v),
  getCombatSeq: () => useGameStore.getState().combatSeq,
  getInspectSeq: () => useGameStore.getState().inspectSeq,
  takeDamage: (n) => useGameStore.getState().takeDamage(n),
  reviveFull: () => useGameStore.getState().reviveFull(),
  degradeGear: (kind, amount) => useGameStore.getState().degradeGear(kind, amount),
  getStats: () => useGameStore.getState().stats,
  showToast: (t) => useGameStore.getState().showToast(t),
  logMessage: (m) => useGameStore.getState().logMessage(m),
}
