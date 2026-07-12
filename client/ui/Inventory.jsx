// Inventario + equipo estilo Diablo: muñeco con slots alrededor del retrato del
// héroe, grilla de inventario abajo, y detalle con comparación de stats.
import { useEffect, useState } from 'react'
import { useGameStore, equipSlotFor } from '../store.js'
import { RARITY_COLOR, RARITY_LABEL } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'

const SLOT_LABEL = {
  head: 'Cabeza', chest: 'Torso', legs: 'Piernas', hands: 'Manos', feet: 'Pies',
  main: 'Arma', off: 'Escudo', ring: 'Anillo', artifact: 'Reliquia',
}

// Disposición del muñeco (grid-areas). El retrato ocupa el centro.
const DOLL = [
  { slot: 'head', area: 'head' },
  { slot: 'artifact', area: 'arti' },
  { slot: 'main', area: 'main' },
  { slot: 'off', area: 'off' },
  { slot: 'chest', area: 'chest' },
  { slot: 'legs', area: 'legs' },
  { slot: 'hands', area: 'hands' },
  { slot: 'feet', area: 'feet' },
  { slot: 'ring', area: 'ring' },
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
  const gameApi = useGameStore((s) => s.gameApi)

  const [sel, setSel] = useState(null)
  const [portrait, setPortrait] = useState(null)

  // Retrato real del paperdoll; se regenera al cambiar el equipo.
  useEffect(() => {
    if (!gameApi) return
    const t = setTimeout(() => setPortrait(gameApi.renderPortrait()), 260)
    return () => clearTimeout(t)
  }, [gameApi, equipment])

  const selectedItem =
    sel?.src === 'inv' ? inventory[sel.i] : sel?.src === 'equip' ? equipment[sel.slot] : null

  function act() {
    if (!sel) return
    if (sel.src === 'inv') equipFromInventory(sel.i)
    else unequip(sel.slot)
    setSel(null)
  }

  const slotBtn = (slot, area) => {
    const it = equipment[slot]
    return (
      <button
        key={slot}
        className={'slot doll-slot' + (sel?.src === 'equip' && sel.slot === slot ? ' on' : '')}
        style={{ gridArea: area, ...(it ? { borderColor: RARITY_COLOR[it.rarity] } : null) }}
        onClick={() => setSel({ src: 'equip', slot })}
        title={SLOT_LABEL[slot]}
      >
        {it ? <ItemIcon icon={it.icon} /> : <em>{SLOT_LABEL[slot]}</em>}
      </button>
    )
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <b>Vigilante {race ? '· ' + race.name : ''}</b>
        <span className="gold">{gold} oro</span>
        <button className="x" onClick={() => setPanel(null)}>✕</button>
      </div>

      <div className="doll">
        {DOLL.map((d) => slotBtn(d.slot, d.area))}
        <div className="portrait" style={{ gridArea: 'port' }}>
          {portrait ? <img src={portrait} alt="héroe" /> : <div className="portrait-empty" />}
        </div>
      </div>

      <div className="inv-grid">
        {inventory.map((it, i) => (
          <button
            key={i}
            className={'slot' + (sel?.src === 'inv' && sel.i === i ? ' on' : '')}
            style={it ? { borderColor: RARITY_COLOR[it.rarity] } : undefined}
            onClick={() => it && setSel({ src: 'inv', i })}
          >
            {it && <ItemIcon icon={it.icon} />}
          </button>
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
  )
}

function ItemDetail({ item, compareTo, actionLabel, onAction }) {
  const keys = new Set([...Object.keys(item.stats || {}), ...Object.keys(compareTo?.stats || {})])
  return (
    <div className="detail">
      <div className="detail-head">
        <ItemIcon icon={item.icon} size={40} />
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
