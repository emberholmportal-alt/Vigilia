// Alijo privado: cofre personal del pueblo. A la izquierda el alijo (todos los slots, sin barras);
// a la derecha tu inventario COMPLETO (armadura, cinturón y bolsa) para ver todo lo que llevás y
// elegir qué guardar. Se guardan los ítems de la BOLSA (lo que cargás); la armadura y el cinturón
// se muestran de contexto (para stockearlos, desequipalos antes en el inventario). Todo server-auth.
import { useEffect, useState } from 'react'
import { useT } from './useT.js'
import { useGameStore, beltCapacityOf } from '../store.js'
import { itemName } from '../i18n.js'
import { itemById } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'
import { Stash as StashIcon, Gold } from './Icon.jsx'

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
  const gold = useGameStore((s) => s.gold)
  const stashGold = useGameStore((s) => s.stashGold)
  const deposit = useGameStore((s) => s.stashDeposit)
  const withdraw = useGameStore((s) => s.stashWithdraw)
  const depositGold = useGameStore((s) => s.stashDepositGold)
  const withdrawGold = useGameStore((s) => s.stashWithdrawGold)
  const beltToBag = useGameStore((s) => s.beltToBag)
  const refresh = useGameStore((s) => s.refreshStash)
  const [amt, setAmt] = useState('')

  useEffect(() => { refresh() }, [refresh])
  const close = () => setPanel(null)
  const nameOf = (id) => itemName(itemById(id), lang)
  const goldAmt = Math.max(0, Math.floor(Number(amt) || 0))
  const doDeposit = async () => { if (goldAmt > 0) { await depositGold(goldAmt); setAmt('') } }
  const doWithdraw = async () => { if (goldAmt > 0) { await withdrawGold(goldAmt); setAmt('') } }

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

            {/* Bóveda de oro del alijo: depositar/retirar. El oro vivo lo maneja el server. */}
            <div className="stash-gold">
              <div className="stash-gold-head">
                <span className="stash-inv-lbl"><Gold /> {t('stash_gold_vault')}</span>
                <b className="stash-gold-amt">{stashGold}</b>
              </div>
              <div className="stash-gold-row">
                <input type="number" min="0" inputMode="numeric" value={amt}
                       onChange={(e) => setAmt(e.target.value)} placeholder="0" />
                <button className="stash-gold-btn" disabled={!goldAmt || goldAmt > gold} onClick={doDeposit}>{t('stash_gold_in')}</button>
                <button className="stash-gold-btn" disabled={!goldAmt || goldAmt > stashGold} onClick={doWithdraw}>{t('stash_gold_out')}</button>
              </div>
              <span className="stash-gold-wallet">{t('stash_gold_wallet')}: {gold}</span>
            </div>
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
                <span className="stash-inv-lbl">{t('belt')} <em className="trade-bag-cta">({t('stash_belt_cta')})</em></span>
                <div className="stash-grid">
                  {Array.from({ length: beltCap }).map((_, i) => (
                    belt[i]
                      ? <button key={i} className="grave-cell" title={nameOf(belt[i].id)} onClick={() => beltToBag(i)}>
                          <ItemIcon icon={belt[i].icon} size={28} count={belt[i].count} />
                        </button>
                      : <div key={i} className="grave-cell dim" />
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
