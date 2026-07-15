// Caja de diálogo estilo RPG clásico: retrato pintado del NPC + nombre + línea,
// tocá para avanzar. Los retratos son de Flare (public/assets/portraits).
import { useGameStore } from '../store.js'
import { useT } from './useT.js'

const PORTRAITS = (import.meta.env.BASE_URL || '/') + 'assets/portraits/'
const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function DialogueBox() {
  const d = useGameStore((s) => s.dialogue)
  const advance = useGameStore((s) => s.advanceDialogue)
  const close = useGameStore((s) => s.closeDialogue)
  const gold = useGameStore((s) => s.gold)
  const deliverOffering = useGameStore((s) => s.deliverOffering)
  const t = useT()
  if (!d) return null

  const last = d.idx >= d.lines.length - 1
  // Ofrenda (sumidero de oro): botón de confirmación en la última línea. No cobra hasta tocarlo.
  const showOffer = d.offer && last
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
        {showOffer ? (
          <button className="dlg-offer" disabled={gold < d.offer.need}
                  onClick={(e) => { e.stopPropagation(); deliverOffering(); close() }}>
            {t('offer_give', { n: d.offer.need })}
          </button>
        ) : (
          <span className="dlg-hint">{last ? 'tocá para cerrar' : 'tocá para seguir ▸'}</span>
        )}
      </div>
      <button className="dlg-close" onClick={(e) => { e.stopPropagation(); close() }}>✕</button>
    </div>
  )
}
