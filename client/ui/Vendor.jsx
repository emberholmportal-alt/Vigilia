// Mercader: panel real de Flare (storage_generic.png) con pestañas Comprar / Vender.
// Comprar = stock del día (precio completo). Vender = tu inventario (25% del precio).
// Coordenadas de menus/vendor.txt (slots_area 64,112, grilla 8×10).
import { useState } from 'react'
import { useGameStore, equipSlotFor, sellValue } from '../store.js'
import { RARITY_COLOR, RARITY_LABEL } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832, SLOT = 64
const GRID = { x: 64, y: 112, cols: 8 }

const SLOT_LABEL = {
  head: 'Cabeza', chest: 'Torso', legs: 'Piernas', hands: 'Manos', feet: 'Pies',
  main: 'Arma', off: 'Escudo', ring: 'Anillo', artifact: 'Reliquia', potion: 'Poción', scroll: 'Pergamino',
}
const STAT_LABEL = {
  absorb_min: 'Def. mín', absorb_max: 'Def. máx', dmg_melee_min: 'Daño c.c. mín', dmg_melee_max: 'Daño c.c. máx',
  dmg_ranged_min: 'Daño dist. mín', dmg_ranged_max: 'Daño dist. máx', dmg_ment_min: 'Daño mental mín',
  dmg_ment_max: 'Daño mental máx', hp: 'Vida', mp: 'Maná', hp_regen: 'Regen. vida', mp_regen: 'Regen. maná',
  fire_resist: 'Res. fuego', ice_resist: 'Res. hielo', accuracy: 'Precisión', crit: 'Crítico',
  avoidance: 'Evasión', poise: 'Aplomo', currency_find: '+Oro', item_find: '+Botín', xp_gain: '+XP',
}
const statLabel = (k) => STAT_LABEL[k] || k

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
        <div className="shop-gold" style={{ top: (56 / PH * 100) + '%' }}>{gold} oro</div>

        <div className="shop-tabs" style={{ top: (82 / PH * 100) + '%' }}>
          <button className={tab === 'buy' ? 'on' : ''} onClick={() => pick('buy')}>Comprar</button>
          <button className={tab === 'sell' ? 'on' : ''} onClick={() => pick('sell')}>Vender</button>
        </div>

        {list.map((it, i) => {
          const col = i % GRID.cols, row = (i / GRID.cols) | 0
          const x = GRID.x + col * SLOT, y = GRID.y + row * SLOT
          return (
            <button key={i} className={'inv-cell' + (sel === i ? ' on' : '')} style={slotStyle(x, y)}
                    onClick={() => it && setSel(i)}>
              {it && <ItemIcon icon={it.icon} size={34} count={it.count} />}
            </button>
          )
        })}

        {selItem && (
          <Tooltip item={selItem} mode={tab} gold={gold}
                   pos={[GRID.x + (sel % GRID.cols) * SLOT, GRID.y + ((sel / GRID.cols) | 0) * SLOT]}
                   onAction={act} />
        )}
      </div>
    </div>
  )
}

function Tooltip({ item, mode, gold, pos, onAction }) {
  const [x, y] = pos
  const below = y < PH * 0.5
  const style = {
    left: ((x + SLOT / 2) / PW * 100) + '%',
    [below ? 'top' : 'bottom']: below ? ((y + SLOT + 6) / PH * 100) + '%' : ((PH - y + 6) / PH * 100) + '%',
  }
  const price = item.price || 0
  const gain = sellValue(item)
  const canBuy = mode === 'buy' ? gold >= price : true
  const stats = Object.entries(item.stats || {})
  return (
    <div className="inv-tooltip" style={style} onClick={(e) => e.stopPropagation()}>
      <b style={{ color: RARITY_COLOR[item.rarity] }}>{item.name}</b>
      <span className="tt-sub">{RARITY_LABEL[item.rarity]}{item.tier ? ` · Nivel ${item.tier}` : ''}</span>
      <span className="tt-sub">{SLOT_LABEL[item.slot] || item.slot}</span>
      {stats.map(([k, v]) => (
        <div className="tt-stat" key={k}><span>{statLabel(k)}</span><span>{v}</span></div>
      ))}
      <div className="tt-price">{mode === 'buy' ? `${price} oro` : `+${gain} oro`}</div>
      <button className="tt-do" onClick={onAction} disabled={!canBuy}>
        {mode === 'buy' ? (canBuy ? 'Comprar' : 'Sin oro') : 'Vender'}
      </button>
    </div>
  )
}
