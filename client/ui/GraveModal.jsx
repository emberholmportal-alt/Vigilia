// Modal del ataúd: al acceder a tu tumba se abre esta vista con lo que dejaste — armadura (lo que
// tenías puesto), cinturón y bolsa. La armadura y el cinturón son un SNAPSHOT visual (no se
// pierden); lo retirable es la bolsa + el oro. "Retirar todo" recupera la carga (respeta capacidad).
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { itemById } from '../data/items.js'
import { itemName } from '../i18n.js'
import ItemIcon from './ItemIcon.jsx'
import { Gold } from './Icon.jsx'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
// Piezas de armadura visibles del muñeco (orden de lectura).
const ARMOR_SLOTS = ['head', 'chest', 'legs', 'feet', 'hands', 'main', 'off']

// Una grilla de celdas de piedra de Flare. `cells` = registros mínimos (o null).
function SlotGrid({ cells, cols, lang }) {
  return (
    <div className="grave-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {cells.map((rec, i) => {
        const base = rec ? itemById(rec.id) : null
        return (
          <div key={i} className="grave-cell forge-slot" title={base ? itemName(base, lang) : ''}>
            {base && <ItemIcon icon={base.icon} size={30} count={rec.count} />}
          </div>
        )
      })}
    </div>
  )
}

export default function GraveModal() {
  const t = useT()
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const id = useGameStore((s) => s.graveModal)
  const graves = useGameStore((s) => s.graves)
  const close = useGameStore((s) => s.closeGraveModal)
  const recover = useGameStore((s) => s.recoverGrave)
  const [busy, setBusy] = useState(false)

  const grave = (graves || []).find((g) => g.id === id)
  if (id == null || !grave) return null

  const armor = ARMOR_SLOTS.map((k) => (grave.equip && grave.equip[k]) || null)
  const belt = (grave.belt || []).filter(Boolean)
  const beltCells = belt.length ? belt : [null, null, null]
  const bag = grave.items || []
  const bagCells = bag.length ? bag : [null, null, null]
  const hasLoot = bag.length > 0 || (grave.gold || 0) > 0

  async function doRecover() {
    if (busy) return
    setBusy(true)
    const ok = await recover(id)
    setBusy(false)
    if (ok) close()   // si quedó algo (bolsa llena) el modal sigue mostrando lo que no entró
  }

  return (
    <div className="gframe-backdrop" onClick={close}>
      <div className="gframe grave-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={close} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title">{t('grave_title')}</h2>
            <p className="gframe-sub">{t('grave_sub')}</p>
          </div>
        </div>

        <div className="grave-body">
          <section className="grave-sect">
            <h3>{t('grave_armor')}</h3>
            <SlotGrid cells={armor} cols={4} lang={lang} />
          </section>
          <section className="grave-sect">
            <h3>{t('belt')}</h3>
            <SlotGrid cells={beltCells} cols={3} lang={lang} />
          </section>
          <section className="grave-sect">
            <h3>{t('grave_bag')}</h3>
            <SlotGrid cells={bagCells} cols={5} lang={lang} />
          </section>
          <div className="grave-gold"><Gold n={grave.gold || 0} /></div>
        </div>

        <div className="grave-actions">
          <button className="gframe-close" disabled={busy || !hasLoot} onClick={doRecover}>
            {busy ? t('grave_recovering') : t('grave_take_all')}
          </button>
        </div>
      </div>
    </div>
  )
}
