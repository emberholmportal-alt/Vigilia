// Inventario con el panel REAL de Flare (menus/inventory.png) y las coordenadas
// exactas de menus/inventory.txt. Ítems superpuestos sobre los marcos ya dibujados,
// tooltip al tocar (nombre/nivel/slot/stats/precio) y oro. Look idéntico a Flare.
import { useState } from 'react'
import { useGameStore, equipSlotFor, beltEligible } from '../store.js'
import { RARITY_COLOR, isDurable, durabilityMax } from '../data/items.js'
import { inventoryCapacity } from '../data/progression.js'
import { armorDefense } from '../data/stats.js'
import ItemIcon from './ItemIcon.jsx'
import { useT } from './useT.js'

const hasAbsorb = (it) => !!(it.stats?.absorb_max || it.stats?.absorb_min)

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

// Panel de Flare (640×832) y posiciones de menus/inventory.txt.
const PW = 640, PH = 832, SLOT = 64
const EQUIP_POS = {
  head: [464, 72], chest: [464, 160], legs: [464, 248], feet: [464, 336],
  hands: [376, 136], artifact: [552, 136], ring: [376, 224], main: [376, 312], off: [552, 312],
}
const CARRIED = { x: 32, y: 64, cols: 5 }
const EQUIP_ORDER = ['head', 'chest', 'legs', 'feet', 'hands', 'artifact', 'ring', 'main', 'off']

// Estilo para centrar algo en un slot (coords de Flare, en % del panel).
function slotStyle(x, y) {
  return {
    left: ((x + SLOT / 2) / PW * 100) + '%',
    top: ((y + SLOT / 2) / PH * 100) + '%',
    width: (SLOT / PW * 100) + '%',
    height: (SLOT / PH * 100) + '%',
  }
}

export default function Inventory() {
  const inventory = useGameStore((s) => s.inventory)
  const equipment = useGameStore((s) => s.equipment)
  const gold = useGameStore((s) => s.gold)
  const equipFromInventory = useGameStore((s) => s.equipFromInventory)
  const unequip = useGameStore((s) => s.unequip)
  const assignBelt = useGameStore((s) => s.assignBelt)
  const equipBelt = useGameStore((s) => s.equipBelt)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()

  const level = useGameStore((s) => s.stats?.level || 1)
  const cap = inventoryCapacity(level)

  const [sel, setSel] = useState(null) // {src, i|slot, pos:[x,y]}
  const selItem = sel?.src === 'inv' ? inventory[sel.i] : sel?.src === 'equip' ? equipment[sel.slot] : null

  function act() {
    if (!sel) return
    if (sel.src === 'inv') equipFromInventory(sel.i)
    else unequip(sel.slot)
    setSel(null)
  }

  function toBelt() {
    if (sel?.src === 'inv') { assignBelt(sel.i); setSel(null) }
  }

  function doEquipBelt() {
    if (sel?.src === 'inv') { equipBelt(sel.i); setSel(null) }
  }

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}inventory.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />

        {/* equipo (muñeco) */}
        {EQUIP_ORDER.map((slot) => {
          const [x, y] = EQUIP_POS[slot]
          const it = equipment[slot]
          return (
            <button key={slot} className={'inv-cell' + (sel?.src === 'equip' && sel.slot === slot ? ' on' : '')}
                    style={slotStyle(x, y)}
                    onClick={() => setSel({ src: 'equip', slot, pos: [x, y] })}>
              {it && <ItemIcon icon={it.icon} size={34} />}
            </button>
          )
        })}

        {/* grilla (las celdas por encima de la capacidad actual están bloqueadas) */}
        {inventory.map((it, i) => {
          const col = i % CARRIED.cols, row = (i / CARRIED.cols) | 0
          const x = CARRIED.x + col * SLOT, y = CARRIED.y + row * SLOT
          const locked = i >= cap
          return (
            <button key={i} disabled={locked}
                    className={'inv-cell' + (sel?.src === 'inv' && sel.i === i ? ' on' : '') + (locked ? ' locked' : '')}
                    style={slotStyle(x, y)}
                    title={locked ? t('locked_hint') : undefined}
                    onClick={() => !locked && it && setSel({ src: 'inv', i, pos: [x, y] })}>
              {it && <ItemIcon icon={it.icon} size={34} count={it.count} />}
              {locked && <span className="inv-lock">🔒</span>}
            </button>
          )
        })}

        {/* oro */}
        <div className="inv-gold" style={{ top: (823 / PH * 100) + '%' }}>{gold} {t('gold')}</div>

        {selItem && (
          <Tooltip item={selItem} pos={sel.pos} t={t}
                   compareTo={sel.src === 'inv' ? equipment[equipSlotFor(selItem)] : null}
                   actionLabel={sel.src === 'inv' ? t('equip') : t('unequip')} onAction={act}
                   onBelt={sel.src === 'inv' && beltEligible(selItem) ? toBelt : null}
                   onEquipBelt={sel.src === 'inv' && selItem.slot === 'belt' ? doEquipBelt : null} />
        )}
      </div>
    </div>
  )
}

function Tooltip({ item, pos, compareTo, actionLabel, onAction, onBelt, onEquipBelt, t }) {
  const keys = [...new Set([...Object.keys(item.stats || {}), ...Object.keys(compareTo?.stats || {})])]
  // ancla arriba o abajo del ítem según dónde esté en el panel
  const [x, y] = pos
  const below = y < PH * 0.5
  // Anclado horizontal según la columna, para que el tooltip NO se salga del panel:
  // izquierda -> alinea por la izquierda; derecha -> por la derecha; centro -> centrado.
  const cx = (x + SLOT / 2) / PW
  const style = {
    [below ? 'top' : 'bottom']: below ? ((y + SLOT + 6) / PH * 100) + '%' : ((PH - y + 6) / PH * 100) + '%',
  }
  if (cx > 0.6) { style.right = ((PW - x - SLOT) / PW * 100) + '%'; style.transform = 'none' }
  else if (cx < 0.4) { style.left = (x / PW * 100) + '%'; style.transform = 'none' }
  else { style.left = (cx * 100) + '%'; style.transform = 'translateX(-50%)' }
  return (
    <div className="inv-tooltip" style={style} onClick={(e) => e.stopPropagation()}>
      <b style={{ color: RARITY_COLOR[item.rarity] }}>{t.item(item)}</b>
      <span className="tt-sub">{t.rarity(item.rarity)}{item.tier ? ` · ${t('level_n', { n: item.tier })}` : ''}</span>
      <span className="tt-sub">{t.slot(item.slot)}</span>
      {armorDefense(item) > 0 && !hasAbsorb(item) && (
        <div className="tt-stat"><span>{t('stat_def')}</span><span>{armorDefense(item)}</span></div>
      )}
      {keys.map((k) => {
        const cur = item.stats?.[k] || 0, prev = compareTo?.stats?.[k] || 0, d = cur - prev
        return (
          <div className="tt-stat" key={k}>
            <span>{t.stat(k)}</span>
            <span>{cur}{compareTo && d !== 0 && <b className={d > 0 ? 'up' : 'down'}> {d > 0 ? '+' : ''}{d}</b>}</span>
          </div>
        )
      })}
      {item.slot === 'belt' && item.beltSlots != null && (
        <div className="tt-stat"><span>{t('spaces')}</span><span>{item.beltSlots}</span></div>
      )}
      {isDurable(item) && item.dur != null && (
        <div className={'tt-stat' + (item.dur <= 0 ? ' broken' : '')}>
          <span>{t('durability')}</span><span>{item.dur <= 0 ? t('broken') : `${item.dur}/${durabilityMax(item)}`}</span>
        </div>
      )}
      {item.price ? <div className="tt-price">{item.price} {t('gold')}</div> : null}
      {onEquipBelt
        ? <button className="tt-do" onClick={onEquipBelt}>{t('equip_belt')}</button>
        : onBelt
          ? <button className="tt-do" onClick={onBelt}>{t('to_belt')}</button>
          : <button className="tt-do" onClick={onAction} disabled={!equipSlotFor(item)}>{actionLabel}</button>}
    </div>
  )
}
