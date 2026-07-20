// Mercader: panel real de Flare (storage_generic.png) con pestañas Comprar / Vender.
// Comprar = stock del día (precio completo). Vender = tu inventario (25% del precio).
// Coordenadas de menus/vendor.txt (slots_area 64,112, grilla 8×10).
import { useState } from 'react'
import { useGameStore, equipSlotFor, sellValue } from '../store.js'
import { RARITY_COLOR } from '../data/items.js'
import { armorDefense, itemAffinity } from '../data/stats.js'
import ItemIcon from './ItemIcon.jsx'
import { Gold } from './Icon.jsx'
import { useT } from './useT.js'

const hasAbsorb = (it) => !!(it.stats?.absorb_max || it.stats?.absorb_min)

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832, SLOT = 64
const GRID = { x: 64, y: 112, cols: 8 }

function slotStyle(x, y) {
  return {
    left: ((x + SLOT / 2) / PW * 100) + '%', top: ((y + SLOT / 2) / PH * 100) + '%',
    width: (SLOT / PW * 100) + '%', height: (SLOT / PH * 100) + '%',
  }
}

export default function Vendor() {
  const stock = useGameStore((s) => s.shopStock)
  const inventory = useGameStore((s) => s.inventory)
  const gold = useGameStore((s) => s.gold)
  const vendor = useGameStore((s) => s.shopVendor)
  const buyItem = useGameStore((s) => s.buyItem)
  const sellItem = useGameStore((s) => s.sellItem)
  const setPanel = useGameStore((s) => s.setPanel)
  const openMarket = useGameStore((s) => s.openMarket)
  const t = useT()

  const [tab, setTab] = useState('buy') // 'buy' | 'sell'
  const [sel, setSel] = useState(null)  // índice en la lista activa

  const list = tab === 'buy' ? stock : inventory
  const selItem = sel != null ? list[sel] : null

  function act() {
    if (sel == null) return
    if (tab === 'buy') buyItem(sel)
    else sellItem(sel)
    setSel(null)
  }

  function pick(t) { setTab(t); setSel(null) }

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}storage_generic.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />

        <div className="shop-title" style={{ top: (24 / PH * 100) + '%' }}>{vendor}</div>
        <div className="shop-gold" style={{ top: (56 / PH * 100) + '%' }}><Gold n={gold} /></div>

        <div className="shop-tabs" style={{ top: (82 / PH * 100) + '%' }}>
          <button className={tab === 'buy' ? 'on' : ''} onClick={() => pick('buy')}>{t('buy')}</button>
          <button className={tab === 'sell' ? 'on' : ''} onClick={() => pick('sell')}>{t('sell')}</button>
          <button className="shop-market-btn" onClick={openMarket} title={t('market_open')}>{t('market_title')}</button>
        </div>

        {list.map((it, i) => {
          const col = i % GRID.cols, row = (i / GRID.cols) | 0
          const x = GRID.x + col * SLOT, y = GRID.y + row * SLOT
          return (
            <button key={i} className={'inv-cell' + (sel === i ? ' on' : '')}
                    style={slotStyle(x, y)} onClick={() => it && setSel(i)}>
              {it && <ItemIcon icon={it.icon} size={34} count={tab === 'buy' ? undefined : it.count} />}
            </button>
          )
        })}

        {selItem && (
          <Tooltip item={selItem} mode={tab} gold={gold} t={t}
                   pos={[GRID.x + (sel % GRID.cols) * SLOT, GRID.y + ((sel / GRID.cols) | 0) * SLOT]}
                   onAction={act} />
        )}
      </div>
    </div>
  )
}

function Tooltip({ item, mode, gold, pos, onAction, t }) {
  const [x, y] = pos
  const below = y < PH * 0.5
  // Anclado horizontal por columna para que el tooltip NO se salga del panel.
  const cx = (x + SLOT / 2) / PW
  const style = {
    [below ? 'top' : 'bottom']: below ? ((y + SLOT + 6) / PH * 100) + '%' : ((PH - y + 6) / PH * 100) + '%',
  }
  if (cx > 0.6) { style.right = ((PW - x - SLOT) / PW * 100) + '%'; style.transform = 'none' }
  else if (cx < 0.4) { style.left = (x / PW * 100) + '%'; style.transform = 'none' }
  else { style.left = (cx * 100) + '%'; style.transform = 'translateX(-50%)' }
  const price = item.price || 0
  const gain = sellValue(item)
  const canBuy = mode === 'buy' ? gold >= price : true
  const stats = Object.entries(item.stats || {})
  return (
    <div className="inv-tooltip" style={style} onClick={(e) => e.stopPropagation()}>
      <b style={{ color: RARITY_COLOR[item.rarity] }}>{t.item(item)}</b>
      <span className="tt-sub">{t.rarity(item.rarity)}{item.tier ? ` · ${t('level_n', { n: item.tier })}` : ''}</span>
      <span className="tt-sub">{t.slot(item.slot)}</span>
      {itemAffinity(item) && <span className="tt-sub aff">{t('affinity', { race: t('race_' + itemAffinity(item)) })}</span>}
      {armorDefense(item) > 0 && !hasAbsorb(item) && (
        <div className="tt-stat"><span>{t('stat_def')}</span><span>{armorDefense(item)}</span></div>
      )}
      {stats.map(([k, v]) => (
        <div className="tt-stat" key={k}><span>{t.stat(k)}</span><span>{v}</span></div>
      ))}
      <div className="tt-price">{mode === 'buy' ? `${price} ${t('gold')}` : `+${gain} ${t('gold')}`}</div>
      <button className="tt-do" onClick={onAction} disabled={!canBuy}>
        {mode === 'buy' ? (canBuy ? t('buy') : t('no_gold')) : t('sell')}
      </button>
    </div>
  )
}
