// HUD de prueba: título de zona, telemetría (fps/tile/tiles) y acceso al inventario.
// El HUD real (vida, maná, spellbar) llega con las fases de combate.
import { useGameStore } from '../store.js'

export default function HUD() {
  const fps = useGameStore((s) => s.fps)
  const mapTitle = useGameStore((s) => s.mapTitle)
  const debug = useGameStore((s) => s.debug)
  const gold = useGameStore((s) => s.gold)
  const togglePanel = useGameStore((s) => s.togglePanel)

  return (
    <>
      <div className="hud">
        <div className="zone">{mapTitle}</div>
        <div className="telemetry">
          <span className={fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad'}>{fps} fps</span>
          <span>tile {debug.tile}</span>
          <span>{debug.visibleTiles} tiles</span>
        </div>
      </div>
      <button className="bag" onClick={() => togglePanel('inventory')}>
        <i>🎒</i>
        <u>{gold}</u>
      </button>
    </>
  )
}
