// HUD mínimo de la Fase 1: título de zona y telemetría (fps / tile / tiles visibles).
// Es lo justo para verificar el criterio de aceptación (60fps, sin atravesar paredes).
// El HUD real (vida, maná, spellbar) llega con las fases de combate.
import { useGameStore } from '../store.js'

export default function HUD() {
  const fps = useGameStore((s) => s.fps)
  const mapTitle = useGameStore((s) => s.mapTitle)
  const debug = useGameStore((s) => s.debug)

  return (
    <div className="hud">
      <div className="zone">{mapTitle}</div>
      <div className="telemetry">
        <span className={fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}>{fps} fps</span>
        <span>tile {debug.tile}</span>
        <span>{debug.visibleTiles} tiles</span>
      </div>
    </div>
  )
}
