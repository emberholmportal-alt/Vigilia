// Store compartido. El loop de Pixi escribe; React lee. React NO toca el loop.
import { create } from 'zustand'

export const useGameStore = create((set) => ({
  fps: 0,
  mapTitle: '',
  debug: { tile: '', visibleTiles: 0 },

  setFps: (fps) => set({ fps }),
  setMapTitle: (mapTitle) => set({ mapTitle }),
  setDebug: (debug) => set({ debug }),
}))

// Setters planos para pasarle al Game sin acoplar Pixi a React.
export const storeApi = {
  setFps: (v) => useGameStore.getState().setFps(v),
  setMapTitle: (v) => useGameStore.getState().setMapTitle(v),
  setDebug: (v) => useGameStore.getState().setDebug(v),
}
