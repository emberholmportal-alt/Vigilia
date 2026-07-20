// Mercado entre jugadores (casa de subastas, precio fijo) — Kintara #4. Tres pestañas: comprar
// (listados de todos), mis ventas (retirar), y vender (publicar un ítem del bag). Todo lo valida el
// server (escrow del ítem, comisión, oro); acá sólo la UI. Se abre desde el mercader.
import { useState } from 'react'
import { useT } from './useT.js'
import { useGameStore } from '../store.js'
import { itemName } from '../i18n.js'
import { itemById } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'
import { Gold } from './Icon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

export default function Market() {
  const t = useT()
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const setPanel = useGameStore((s) => s.setPanel)
  const listings = useGameStore((s) => s.marketListings)
  const mineList = useGameStore((s) => s.marketMine)
  const inventory = useGameStore((s) => s.inventory)
  const gold = useGameStore((s) => s.gold)
  const buy = useGameStore((s) => s.marketBuy)
  const cancel = useGameStore((s) => s.marketCancel)
  const listItem = useGameStore((s) => s.marketListItem)
  const [tab, setTab] = useState('browse')
  const [sel, setSel] = useState(null)   // índice del bag elegido para vender
  const [price, setPrice] = useState('')

  const close = () => setPanel(null)
  const nameOf = (id) => itemName(itemById(id), lang)

  async function publish() {
    if (sel == null || !(Number(price) > 0)) return
    const r = await listItem(sel, Math.floor(Number(price)))
    if (r?.ok) { setSel(null); setPrice(''); setTab('mine') }
  }

  return (
    <div className="gframe-backdrop" onClick={close}>
      <div className="gframe market-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={close} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title">{t('market_title')}</h2>
            <p className="gframe-sub">{t('market_commission')} · <Gold n={gold} /></p>
          </div>
        </div>

        <div className="market-tabs">
          <button className={tab === 'browse' ? 'on' : ''} onClick={() => setTab('browse')}>{t('market_tab_browse')}</button>
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>{t('market_tab_mine')}</button>
          <button className={tab === 'sell' ? 'on' : ''} onClick={() => setTab('sell')}>{t('market_tab_sell')}</button>
        </div>

        <div className="market-body">
          {tab === 'browse' && (
            listings.length ? listings.map((l) => (
              <div key={l.id} className="market-row">
                <ItemIcon icon={itemById(l.item.id)?.icon} size={34} count={l.item.count} />
                <div className="market-row-info">
                  <span className="market-row-name">{nameOf(l.item.id)}{l.item.count > 1 ? ' ×' + l.item.count : ''}</span>
                  <span className="market-row-sub">{t('market_seller')}: {l.seller || '—'}</span>
                </div>
                <span className="market-row-price"><Gold n={l.price} /></span>
                <button className="market-buy" disabled={gold < l.price} onClick={() => buy(l.id)}>{t('market_buy')}</button>
              </div>
            )) : <p className="market-empty">{t('market_empty')}</p>
          )}

          {tab === 'mine' && (
            mineList.length ? mineList.map((l) => (
              <div key={l.id} className="market-row">
                <ItemIcon icon={itemById(l.item.id)?.icon} size={34} count={l.item.count} />
                <div className="market-row-info">
                  <span className="market-row-name">{nameOf(l.item.id)}{l.item.count > 1 ? ' ×' + l.item.count : ''}</span>
                  <span className="market-row-sub"><Gold n={l.price} /></span>
                </div>
                <button className="market-cancel" onClick={() => cancel(l.id)}>{t('market_cancel')}</button>
              </div>
            )) : <p className="market-empty">{t('market_mine_empty')}</p>
          )}

          {tab === 'sell' && (
            <div className="market-sell">
              <p className="market-sell-hint">{t('market_your_bag')}</p>
              <div className="market-bag">
                {inventory.map((it, i) => (it
                  ? <button key={i} className={'trade-slot' + (sel === i ? ' on' : '')} onClick={() => setSel(i)} title={nameOf(it.id)}><ItemIcon icon={it.icon} size={30} count={it.count} /></button>
                  : null))}
              </div>
              <div className="market-sell-form">
                <span>{t('market_price')}</span>
                <input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                <button className="gframe-close" disabled={sel == null || !(Number(price) > 0)} onClick={publish}>{t('market_publish')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
