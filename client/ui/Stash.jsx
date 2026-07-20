// Alijo privado: cofre personal del pueblo. Dos grillas — el alijo (izquierda) y tu bolsa
// (derecha). Tocás un ítem de la bolsa para guardarlo, o uno del alijo para retirarlo. Todo lo
// valida el server (escrow por cuenta); acá sólo la UI. Sólo el dueño lo ve.
import { useEffect } from 'react'
import { useT } from './useT.js'
import { useGameStore } from '../store.js'
import { itemName } from '../i18n.js'
import { itemById } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'
import { Stash as StashIcon } from './Icon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function Stash() {
  const t = useT()
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const setPanel = useGameStore((s) => s.setPanel)
  const items = useGameStore((s) => s.stashItems)
  const max = useGameStore((s) => s.stashMax)
  const inventory = useGameStore((s) => s.inventory)
  const deposit = useGameStore((s) => s.stashDeposit)
  const withdraw = useGameStore((s) => s.stashWithdraw)
  const refresh = useGameStore((s) => s.refreshStash)

  useEffect(() => { refresh() }, [refresh])
  const close = () => setPanel(null)
  const nameOf = (id) => itemName(itemById(id), lang)

  // Celdas del alijo: los ítems + huecos vacíos hasta `max`.
  const cells = []
  for (let i = 0; i < max; i++) cells.push(items[i] || null)
  const bag = inventory.map((it, i) => ({ it, i })).filter((x) => x.it)

  return (
    <div className="gframe-backdrop" onClick={close}>
      <div className="gframe stash-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={close} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title"><StashIcon /> {t('stash_title')}</h2>
            <p className="gframe-sub">{t('stash_sub')}</p>
          </div>
        </div>

        <div className="stash-cols">
          <section className="stash-col">
            <h3>{t('stash_here')} <span className="stash-count">{items.length}/{max}</span></h3>
            <div className="stash-grid">
              {cells.map((rec, i) => {
                const base = rec ? itemById(rec.id) : null
                return (
                  <button key={i} className="grave-cell" disabled={!base}
                          title={base ? nameOf(rec.id) : ''} onClick={() => base && withdraw(i)}>
                    {base && <ItemIcon icon={base.icon} size={30} count={rec.count} />}
                  </button>
                )
              })}
            </div>
            <p className="stash-hint">{t('stash_hint_withdraw')}</p>
          </section>

          <section className="stash-col">
            <h3>{t('stash_your_bag')}</h3>
            <div className="stash-grid bag">
              {bag.length ? bag.map(({ it, i }) => (
                <button key={i} className="grave-cell" title={nameOf(it.id)} onClick={() => deposit(i)}>
                  <ItemIcon icon={it.icon} size={30} count={it.count} />
                </button>
              )) : <p className="stash-empty">{t('inv_empty') || '—'}</p>}
            </div>
            <p className="stash-hint">{t('stash_hint_deposit')}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
