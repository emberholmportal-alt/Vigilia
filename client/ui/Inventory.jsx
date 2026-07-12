// Inventario: modal compacto (no pantalla completa) con el arte de slots de Flare.
// Muñeco de equipo (arreglo de Flare) + grilla, sin retrato. Detalle con comparación.
import { useState } from 'react'
import { useGameStore, equipSlotFor } from '../store.js'
import { RARITY_COLOR, RARITY_LABEL } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'
import Slot from './Slot.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'

const SLOT_LABEL = {
  head: 'Cabeza', chest: 'Torso', legs: 'Piernas', hands: 'Manos', feet: 'Pies',
  main: 'Arma', off: 'Escudo', ring: 'Anillo', artifact: 'Reliquia',
}

// Muñeco 3×3 (arreglo de Flare, compacto).
const DOLL = [
  { slot: 'hands', area: 'hands' }, { slot: 'head', area: 'head' }, { slot: 'artifact', area: 'arti' },
  { slot: 'main', area: 'main' }, { slot: 'chest', area: 'chest' }, { slot: 'off', area: 'off' },
  { slot: 'ring', area: 'ring' }, { slot: 'legs', area: 'legs' }, { slot: 'feet', area: 'feet' },
]

const STAT_LABEL = {
  absorb_min: 'Def. mín', absorb_max: 'Def. máx',
  dmg_melee_min: 'Daño c.c. mín', dmg_melee_max: 'Daño c.c. máx',
  dmg_ranged_min: 'Daño dist. mín', dmg_ranged_max: 'Daño dist. máx',
  dmg_ment_min: 'Daño mental mín', dmg_ment_max: 'Daño mental máx',
  hp: 'Vida', mp: 'Maná', hp_regen: 'Regen. vida', mp_regen: 'Regen. maná',
  fire_resist: 'Res. fuego', ice_resist: 'Res. hielo',
  physical: 'Físico', mental: 'Mental', offense: 'Ofensiva', defense: 'Defensa',
  crit: 'Crítico', accuracy: 'Precisión', avoidance: 'Evasión', speed: 'Velocidad',
}
const statLabel = (k) => STAT_LABEL[k] || k

export default function Inventory() {
  const inventory = useGameStore((s) => s.inventory)
  const equipment = useGameStore((s) => s.equipment)
  const gold = useGameStore((s) => s.gold)
  const race = useGameStore((s) => s.race)
  const equipFromInventory = useGameStore((s) => s.equipFromInventory)
  const unequip = useGameStore((s) => s.unequip)
  const setPanel = useGameStore((s) => s.setPanel)

  const [sel, setSel] = useState(null)

  const selectedItem =
    sel?.src === 'inv' ? inventory[sel.i] : sel?.src === 'equip' ? equipment[sel.slot] : null

  function act() {
    if (!sel) return
    if (sel.src === 'inv') equipFromInventory(sel.i)
    else unequip(sel.slot)
    setSel(null)
  }

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="modal inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>Equipo</b>
          <span className="gold">{gold} oro</span>
          <button
            className="close-btn"
            style={{ backgroundImage: `url(${UI}button_x.png)` }}
            onClick={() => setPanel(null)}
          />
        </div>

        <div className="doll">
          {DOLL.map((d) => (
            <div key={d.slot} style={{ gridArea: d.area }} className="doll-cell">
              <Slot
                item={equipment[d.slot]}
                size={48}
                selected={sel?.src === 'equip' && sel.slot === d.slot}
                label={SLOT_LABEL[d.slot]}
                onClick={() => setSel({ src: 'equip', slot: d.slot })}
              />
            </div>
          ))}
        </div>

        <div className="inv-grid">
          {inventory.map((it, i) => (
            <Slot
              key={i}
              item={it}
              size={46}
              selected={sel?.src === 'inv' && sel.i === i}
              onClick={() => it && setSel({ src: 'inv', i })}
            />
          ))}
        </div>

        {selectedItem && (
          <ItemDetail
            item={selectedItem}
            compareTo={sel.src === 'inv' ? equipment[equipSlotFor(selectedItem)] : null}
            actionLabel={sel.src === 'inv' ? 'Equipar' : 'Sacar'}
            onAction={act}
          />
        )}
      </div>
    </div>
  )
}

function ItemDetail({ item, compareTo, actionLabel, onAction }) {
  const keys = new Set([...Object.keys(item.stats || {}), ...Object.keys(compareTo?.stats || {})])
  return (
    <div className="detail">
      <div className="detail-head">
        <ItemIcon icon={item.icon} size={36} />
        <div>
          <b style={{ color: RARITY_COLOR[item.rarity] }}>{item.name}</b>
          <span className="detail-sub">
            {RARITY_LABEL[item.rarity]} · {SLOT_LABEL[item.slot] || item.slot}
            {item.tier ? ` · tier ${item.tier}` : ''}
          </span>
        </div>
      </div>
      {keys.size > 0 && (
        <div className="stats">
          {[...keys].map((k) => {
            const cur = item.stats?.[k] || 0
            const prev = compareTo?.stats?.[k] || 0
            const delta = cur - prev
            return (
              <div className="stat" key={k}>
                <span>{statLabel(k)}</span>
                <span>
                  {cur}
                  {compareTo && delta !== 0 && (
                    <b className={delta > 0 ? 'up' : 'down'}> {delta > 0 ? '+' : ''}{delta}</b>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {item.equip_flags && <div className="flags">{item.equip_flags}</div>}
      <button className="do" onClick={onAction} disabled={!equipSlotFor(item)}>
        {actionLabel}
      </button>
    </div>
  )
}
