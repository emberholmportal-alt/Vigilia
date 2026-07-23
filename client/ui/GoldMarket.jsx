// Marketplace oro↔$VEL (order book P2P, NO-CUSTODIAL). Tres pestañas: comprar oro (pagás $VEL desde
// tu wallet), mis órdenes (cancelar), y vender oro (publicás oro pidiendo $VEL). El pago es on-chain:
// el server escrowea el oro, verifica la transacción de $VEL (95% al vendedor + 5% al tesoro) y libera
// el oro. Todo lo valida el server; acá sólo la UI. Se abre desde el mercader (sólo si el token existe).
import { useState } from 'react'
import { useT } from './useT.js'
import { useGameStore } from '../store.js'
import { Gold } from './Icon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const fmt = (n) => Number(n || 0).toLocaleString('es-AR')

export default function GoldMarket() {
  const t = useT()
  const setPanel = useGameStore((s) => s.setPanel)
  const cfg = useGameStore((s) => s.goldCfg)
  const orders = useGameStore((s) => s.goldOrders)
  const mine = useGameStore((s) => s.goldMine)
  const gold = useGameStore((s) => s.gold)
  const paying = useGameStore((s) => s.goldPaying)
  const buy = useGameStore((s) => s.goldBuyOrder)
  const cancel = useGameStore((s) => s.goldCancelOrder)
  const listOrder = useGameStore((s) => s.goldListOrder)
  const [tab, setTab] = useState('browse')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')

  const sym = cfg?.symbol || 'VEL'
  const minGold = cfg?.minGold || 100
  const close = () => setPanel(null)

  // Lo que RECIBE el vendedor (95% del precio; el 5% va al tesoro).
  const sellerGets = (p) => Math.floor((Number(p) || 0) * (1 - (cfg?.commission || 0.05)))

  async function publish() {
    const g = Math.floor(Number(amount)), p = Math.floor(Number(price))
    if (!(g >= minGold) || !(p > 0)) return
    const r = await listOrder(g, p)
    if (r?.ok) { setAmount(''); setPrice(''); setTab('mine') }
  }

  const payStep = paying && (
    paying.step === 'sign' ? t('gm_pay_sign') :
    paying.step === 'settle' ? t('gm_pay_verify') : t('gm_pay_lock'))

  return (
    <div className="gframe-backdrop" onClick={paying ? undefined : close}>
      <div className="gframe market-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={close} aria-label="close" />
        <div className="gframe-head">
          <div>
            <h2 className="gframe-title">{t('gm_title', { sym })}</h2>
            <p className="gframe-sub">{t('gm_sub', { sym })} · <Gold n={gold} /></p>
          </div>
        </div>

        <div className="market-tabs">
          <button className={tab === 'browse' ? 'on' : ''} onClick={() => setTab('browse')}>{t('gm_tab_buy')}</button>
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>{t('gm_tab_mine')}</button>
          <button className={tab === 'sell' ? 'on' : ''} onClick={() => setTab('sell')}>{t('gm_tab_sell')}</button>
        </div>

        <div className="market-body">
          {tab === 'browse' && (
            orders.length ? orders.map((o) => (
              <div key={o.id} className="market-row gm-row">
                <div className="market-row-info">
                  <span className="market-row-name"><Gold n={o.gold} /></span>
                  <span className="market-row-sub">{t('market_seller')}: {o.seller || '—'}</span>
                </div>
                <span className="gm-price">{fmt(o.price)} <b>${sym}</b></span>
                <button className="market-buy" disabled={!!paying} onClick={() => buy(o)}>{t('gm_buy')}</button>
              </div>
            )) : <p className="market-empty">{t('gm_empty')}</p>
          )}

          {tab === 'mine' && (
            mine.length ? mine.map((o) => (
              <div key={o.id} className="market-row gm-row">
                <div className="market-row-info">
                  <span className="market-row-name"><Gold n={o.gold} /></span>
                  <span className="market-row-sub">{fmt(o.price)} ${sym}{o.status === 'locked' ? ' · ' + t('gm_locked') : ''}</span>
                </div>
                <button className="market-cancel" onClick={() => cancel(o.id)}>{t('market_cancel')}</button>
              </div>
            )) : <p className="market-empty">{t('gm_mine_empty')}</p>
          )}

          {tab === 'sell' && (
            <div className="market-sell gm-sell">
              <p className="market-sell-hint">{t('gm_sell_hint', { sym, min: fmt(minGold) })}</p>
              <div className="gm-form">
                <label>{t('gm_gold_amount')}</label>
                <input type="number" min={minGold} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(minGold)} />
                <label>{t('gm_ask_price', { sym })}</label>
                <input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                {Number(price) > 0 && <p className="gm-net">{t('gm_you_receive', { n: fmt(sellerGets(price)), sym })}</p>}
                <button className="gframe-close" disabled={!(Math.floor(Number(amount)) >= minGold) || !(Number(price) > 0) || Number(amount) > gold}
                        onClick={publish}>{t('gm_publish')}</button>
                {Number(amount) > gold && <p className="gm-warn">{t('gm_not_enough_gold')}</p>}
              </div>
              <a className="gm-buy-link" href={cfg?.buyUrl} target="_blank" rel="noreferrer">{t('gm_get_vel', { sym })}</a>
            </div>
          )}
        </div>

        {paying && (
          <div className="gm-paying">
            <div className="gm-paying-card">
              <div className="gm-spinner" />
              <p>{payStep}</p>
              {paying.step === 'sign' && <span className="gm-paying-hint">{t('gm_pay_hint', { sym })}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
