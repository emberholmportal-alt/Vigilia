// Alijo privado: cofre personal del pueblo. A la izquierda el alijo (todos los slots, sin barras);
// a la derecha tu inventario COMPLETO (armadura, cinturón y bolsa) para ver todo lo que llevás y
// elegir qué guardar. Se guardan los ítems de la BOLSA (lo que cargás); la armadura y el cinturón
// se muestran de contexto (para stockearlos, desequipalos antes en el inventario). Todo server-auth.
import { useEffect } from 'react'
import { useT } from './useT.js'
import { useGameStore, beltCapacityOf } from '../store.js'
import { itemName } from '../i18n.js'
import { itemById } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'
import { Stash as StashIcon } from './Icon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const ARMOR_SLOTS = ['head', 'chest', 'legs', 'feet', 'hands', 'main', 'off']

export default function Stash() {
  const t = useT()
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const setPanel = useGameStore((s) => s.setPanel)
  const items = useGameStore((s) => s.stashItems)
  const max = useGameStore((s) => s.stashMax)
  const inventory = useGameStore((s) => s.inventory)
  const equipment = useGameStore((s) => s.equipment)
  const belt = useGameStore((s) => s.belt)
  const equippedBelt = useGameStore((s) => s.equippedBelt)
  const deposit = useGameStore((s) => s.stashDeposit)
  const withdraw = useGameStore((s) => s.stashWithdraw)
  const refresh = useGameStore((s) => s.refreshStash)

  useEffect(() => { refresh() }, [refresh])
  const close = () => setPanel(null)
  const nameOf = (id) => itemName(itemById(id), lang)

  const beltCap = beltCapacityOf(equippedBelt)
  const armor = ARMOR_SLOTS.map((k) => equipment[k] || null)
  const carried = inventory.map((it, i) => ({ it, i })).filter((x) => x.it)

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
          {/* alijo: TODOS los slots, sin barras */}
          <section className="stash-col">
            <h3>{t('stash_here')} <span className="stash-count">{items.length}/{max}</span></h3>
            <div className="stash-grid">
              {Array.from({ length: max }).map((_, i) => {
                const rec = items[i] || null
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

          {/* tu inventario completo: armadura + cinturón (contexto) + bolsa (tocá para guardar) */}
          <section className="stash-col">
            <h3>{t('stash_your_inv')}</h3>
            <div className="stash-inv-block">
              <span className="stash-inv-lbl">{t('grave_armor')}</span>
              <div className="stash-grid">
                {armor.map((it, i) => (
                  <div key={i} className="grave-cell dim" title={it ? nameOf(it.id) : ''}>
                    {it && <ItemIcon icon={it.icon} size={28} />}
                  </div>
                ))}
              </div>
            </div>
            {beltCap > 0 && (
              <div className="stash-inv-block">
                <span className="stash-inv-lbl">{t('belt')}</span>
                <div className="stash-grid">
                  {Array.from({ length: beltCap }).map((_, i) => (
                    <div key={i} className="grave-cell dim" title={belt[i] ? nameOf(belt[i].id) : ''}>
                      {belt[i] && <ItemIcon icon={belt[i].icon} size={28} count={belt[i].count} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="stash-inv-block">
              <span className="stash-inv-lbl">{t('stash_your_bag')}</span>
              <div className="stash-grid">
                {carried.length ? carried.map(({ it, i }) => (
                  <button key={i} className="grave-cell" title={nameOf(it.id)} onClick={() => deposit(i)}>
                    <ItemIcon icon={it.icon} size={28} count={it.count} />
                  </button>
                )) : <p className="stash-empty">{t('inv_empty') || '—'}</p>}
              </div>
              <p className="stash-hint">{t('stash_hint_deposit')}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
