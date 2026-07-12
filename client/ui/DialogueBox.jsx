// Caja de diálogo estilo RPG clásico: retrato pintado del NPC + nombre + línea,
// tocá para avanzar. Los retratos son de Flare (public/assets/portraits).
import { useGameStore } from '../store.js'

const PORTRAITS = (import.meta.env.BASE_URL || '/') + 'assets/portraits/'
const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function DialogueBox() {
  const d = useGameStore((s) => s.dialogue)
  const advance = useGameStore((s) => s.advanceDialogue)
  const close = useGameStore((s) => s.closeDialogue)
  if (!d) return null

  const last = d.idx >= d.lines.length - 1
  return (
    <div className="dialogue" onClick={advance}>
      {d.portrait && (
        <div className="dlg-portrait" style={{ backgroundImage: `url(${UI}portrait_border.png)` }}>
          <img src={PORTRAITS + d.portrait} alt={d.name} />
        </div>
      )}
      <div className="dlg-body">
        <b>{d.name}</b>
        <p>{d.lines[d.idx]}</p>
        <span className="dlg-hint">{last ? 'tocá para cerrar' : 'tocá para seguir ▸'}</span>
      </div>
      <button className="dlg-close" onClick={(e) => { e.stopPropagation(); close() }}>✕</button>
    </div>
  )
}
