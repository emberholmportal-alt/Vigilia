// Store compartido. El loop de Pixi escribe telemetría; React maneja la UI y el
// equipo. React NO toca el loop del juego.
//
// El equipo es la fuente de verdad de la UI (React); el paperdoll de Pixi reacciona
// vía onEquipmentChange. Cuando llegue el servidor autoritativo (regla 2), equip()
// pasará a pedirle al server y aplicar su respuesta.
import { create } from 'zustand'
import { computeStats } from './data/stats.js'
import { setMuted } from './engine/audio.js'

// Slots de equipo. Los primeros 7 se ven en el paperdoll; ring/artifact no.
export const EQUIP_SLOTS = ['head', 'chest', 'legs', 'hands', 'feet', 'main', 'off', 'ring', 'artifact']
export const INVENTORY_SIZE = 30

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
  inventory: [],            // array de ítems (huecos = null), largo INVENTORY_SIZE
  equipment: emptyEquipment(),
  belt: [null, null, null, null], // cinturón de 4 (consumibles)
  panel: null,              // 'inventory' | null

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

  // Inicializa personaje con su kit real (inventario + equipo) y calcula stats.
  initCharacter: ({ race, gold, inventory, equipment, belt }) => {
    const inv = inventory.slice(0, INVENTORY_SIZE)
    while (inv.length < INVENTORY_SIZE) inv.push(null)
    const st = computeStats(race.id)
    const b = (belt || []).slice(0, 4)
    while (b.length < 4) b.push(null)
    set({
      race, gold, stats: st,
      inventory: inv, equipment: { ...emptyEquipment(), ...equipment }, belt: b,
      staminaMax: st.staminaMax, stamina: st.staminaMax,
    })
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
    equipment[slot] = item
    inv[invIndex] = prev || null
    set({ inventory: inv, equipment })
  },

  // Saca lo equipado en un slot y lo manda al primer hueco libre.
  unequip: (slot) => {
    const s = get()
    const item = s.equipment[slot]
    if (!item) return
    const inv = s.inventory.slice()
    let idx = inv.findIndex((x) => x == null)
    if (idx < 0) return // inventario lleno
    inv[idx] = item
    const equipment = { ...s.equipment, [slot]: null }
    set({ inventory: inv, equipment })
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
  getRunState: () => {
    const s = useGameStore.getState()
    return { running: s.running, stamina: s.stamina, staminaMax: s.staminaMax }
  },
}
