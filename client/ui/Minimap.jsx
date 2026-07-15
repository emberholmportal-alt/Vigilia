// Minimapa: proyección iso de la ciudad (generada por Game) dentro del marco de Flare,
// con un punto que sigue al jugador.
import { useGameStore } from '../store.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function Minimap() {
  const mm = useGameStore((s) => s.minimap)
  const pt = useGameStore((s) => s.playerTile)
  const portals = useGameStore((s) => s.portalTiles)
  const npcs = useGameStore((s) => s.npcTiles)
  if (!mm) return null

  // misma proyección iso que usa Game para el minimapa
  const proj = (x, y) => ({
    left: (((x - y) - mm.minMx) * mm.scale + mm.pad) / mm.w * 100,
    top: ((x + y) * 0.5 * mm.scale + mm.pad) / mm.h * 100,
  })
  const me = proj(pt.x, pt.y)

  return (
    <div className="minimap" style={{ backgroundImage: `url(${UI}minimap.png)` }}>
      <div className="minimap-inner" style={{ aspectRatio: `${mm.w} / ${mm.h}` }}>
        <img src={mm.url} alt="mapa" />
        {(portals || []).map((p, i) => {
          const pos = proj(p.x, p.y)
          return <span key={i} className="mm-portal" title={p.label} style={{ left: `${pos.left}%`, top: `${pos.top}%` }} />
        })}
        {(npcs || []).map((n, i) => {
          const pos = proj(n.x, n.y)
          return <span key={'n' + i} className={`mm-npc mm-${n.role}`} title={n.label} style={{ left: `${pos.left}%`, top: `${pos.top}%` }} />
        })}
        <span className="mm-dot" style={{ left: `${me.left}%`, top: `${me.top}%` }} />
      </div>
    </div>
  )
}
