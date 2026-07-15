// Alquimista: prepara pociones reales con recetas de Flare. Cada receta muestra los
// materiales (con lo que tenés / lo que necesitás) y el resultado. "Preparar" descuenta los
// materiales y agrega la poción. Usa el mismo panel de Flare (powers.png) que el herrero.
import { useGameStore } from '../store.js'
import { ALCHEMY_RECIPES, recipeView } from '../data/alchemy.js'
import ItemIcon from './ItemIcon.jsx'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

export default function Alchemy() {
  const inventory = useGameStore((s) => s.inventory)
  const alchemyName = useGameStore((s) => s.alchemyName)
  const craftAlchemy = useGameStore((s) => s.craftAlchemy)
  const setPanel = useGameStore((s) => s.setPanel)
  const shopStock = useGameStore((s) => s.shopStock)
  const gold = useGameStore((s) => s.gold)
  const buyItem = useGameStore((s) => s.buyItem)
  const t = useT()

  const countOf = (id) => inventory.reduce((n, it) => n + (it && it.id === id ? (it.count || 1) : 0), 0)

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={() => setPanel(null)} />
        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{alchemyName}</div>

        <div className="alch-body">
          {/* Venta: pociones de vida/maná + Pergamino de Retorno (sólo la bruja los vende). */}
          <div className="alch-shop">
            <div className="alch-hint">{t('alch_buy_hint')} · <b className="alch-gold">{gold} {t('gold')}</b></div>
            <div className="alch-buy-row">
              {(shopStock || []).map((it, i) => (
                <div className="alch-buy" key={it.id} title={t.item(it)}>
                  <ItemIcon icon={it.icon} size={30} />
                  <span className="alch-buy-name">{t.item(it)}</span>
                  <button className="alch-craft" disabled={gold < (it.price || 0)} onClick={() => buyItem(i)}>
                    {it.price} {t('gold')}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="alch-hint">{t('alch_hint')}</div>
          <div className="alch-list">
            {ALCHEMY_RECIPES.map((r, i) => {
              const rv = recipeView(r)
              const can = r.ins.every(([id, qty]) => countOf(id) >= qty)
              return (
                <div className={'alch-recipe' + (can ? '' : ' lack')} key={i}>
                  <div className="alch-ins">
                    {rv.ins.map(({ item, qty }, j) => (
                      <span className="alch-in" key={j} title={t.item(item)}>
                        <ItemIcon icon={item?.icon ?? 0} size={26} />
                        <em className={countOf(r.ins[j][0]) >= qty ? '' : 'short'}>{countOf(r.ins[j][0])}/{qty}</em>
                      </span>
                    ))}
                  </div>
                  <span className="alch-arrow">→</span>
                  <div className="alch-out" title={t.item(rv.out)}>
                    <ItemIcon icon={rv.out?.icon ?? 0} size={30} />
                    <span className="alch-out-name">{t.item(rv.out)}</span>
                  </div>
                  <button className="alch-craft" disabled={!can} onClick={() => craftAlchemy(r)}>
                    {can ? t('alch_craft') : t('alch_lack')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
