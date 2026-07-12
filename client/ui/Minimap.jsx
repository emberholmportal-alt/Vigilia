// Minimapa: proyección iso de la ciudad (generada por Game) dentro del marco de Flare,
// con un punto que sigue al jugador.
import { useGameStore } from '../store.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function Minimap() {
  const mm = useGameStore((s) => s.minimap)
  const pt = useGameStore((s) => s.playerTile)
  if (!mm) return null

  const mx = pt.x - pt.y
  const my = (pt.x + pt.y) * 0.5
  const dotX = ((mx - mm.minMx) * mm.scale + mm.pad) / mm.w * 100
  const dotY = (my * mm.scale + mm.pad) / mm.h * 100

  return (
    <div className="minimap" style={{ backgroundImage: `url(${UI}minimap.png)` }}>
      <div className="minimap-inner" style={{ aspectRatio: `${mm.w} / ${mm.h}` }}>
        <img src={mm.url} alt="mapa" />
        <span className="mm-dot" style={{ left: `${dotX}%`, top: `${dotY}%` }} />
      </div>
    </div>
  )
}
