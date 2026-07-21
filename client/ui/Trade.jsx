// Ventana de intercambio P2P (Kintara #3). Muestra el pedido entrante y, al abrir, dos columnas
// (tu oferta / la del otro) + tu bolsa para ofrecer ítems y un campo de oro. Doble confirmación;
// el server hace el swap ATÓMICO (valida posesión). Toda la lógica de red vive en el store.
import { useT } from './useT.js'
import { useGameStore, beltCapacityOf } from '../store.js'
import { itemName } from '../i18n.js'
import { itemById } from '../data/items.js'
import ItemIcon from './ItemIcon.jsx'
import { Gold, Swap } from './Icon.jsx'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const ARMOR_SLOTS = ['head', 'chest', 'legs', 'feet', 'hands', 'main', 'off']

export default function Trade() {
  const t = useT()
  const lang = useGameStore((s) => s.lang) === 'es' ? 'es' : 'en'
  const tradeReq = useGameStore((s) => s.tradeReq)
  const trade = useGameStore((s) => s.trade)
  const inventory = useGameStore((s) => s.inventory)
  const equipment = useGameStore((s) => s.equipment)
  const belt = useGameStore((s) => s.belt)
  const equippedBelt = useGameStore((s) => s.equippedBelt)
  const gold = useGameStore((s) => s.gold)
  const accept = useGameStore((s) => s.acceptTradeReq)
  const decline = useGameStore((s) => s.declineTradeReq)
  const toggle = useGameStore((s) => s.toggleTradeItem)
  const setGold = useGameStore((s) => s.setTradeGold)
  const confirm = useGameStore((s) => s.confirmTrade)
  const cancel = useGameStore((s) => s.cancelTrade)

  // Pedido entrante (todavía sin ventana abierta): aceptar / rechazar.
  if (tradeReq && !trade) {
    return (
      <div className="gframe-backdrop">
        <div className="gframe trade-req" onClick={(e) => e.stopPropagation()}>
          <p className="trade-req-msg"><Swap /> {t('trade_req_msg', { name: tradeReq.name })}</p>
          <div className="trade-actions">
            <button className="welcome-guide" onClick={decline}>{t('trade_decline')}</button>
            <button className="gframe-close" onClick={accept}>{t('trade_accept')}</button>
          </div>
        </div>
      </div>
    )
  }
  if (!trade) return null

  const youItems = trade.youIdx.map((i) => ({ i, it: inventory[i] })).filter((x) => x.it)
  const themItems = trade.them?.items || []

  return (
    <div className="gframe-backdrop">
      <div className="gframe trade-frame" onClick={(e) => e.stopPropagation()}>
        <button className="gframe-x" style={{ backgroundImage: `url(${UI}button_x.png)` }} onClick={cancel} aria-label="close" />
        <div className="gframe-head"><h2 className="gframe-title">{t('trade_title', { name: trade.withName })}</h2></div>

        <div className="trade-cols">
          <div className="trade-col">
            <h3>{t('trade_your_offer')} {youItems.length > 0 && <em className="trade-remove-cta">({t('trade_tap_to_remove')})</em>}</h3>
            <div className="trade-slots">
              {youItems.map(({ i, it }) => (
                <button key={i} className="trade-slot on" onClick={() => toggle(i)} title={itemName(it, lang)}>
                  <ItemIcon icon={it.icon} size={30} count={it.count} />
                </button>
              ))}
              {!youItems.length && <span className="trade-empty">{t('trade_offer_empty')}</span>}
            </div>
            <div className="trade-gold-row">
              <span className="trade-gold-lbl"><Gold /> {t('trade_gold')}</span>
              <input type="number" min="0" max={gold} value={trade.youGold} onChange={(e) => setGold(e.target.value)} />
              <span className="trade-gold-max">/ {gold}</span>
            </div>
            <div className={'trade-ok' + (trade.youOk ? ' on' : '')}>{trade.youOk ? t('trade_confirmed') : ''}</div>
          </div>

          <div className="trade-col">
            <h3>{t('trade_their_offer')}</h3>
            <div className="trade-slots">
              {themItems.map((r, j) => (
                <div key={j} className="trade-slot" title={itemName(itemById(r.id), lang)}>
                  <ItemIcon icon={itemById(r.id)?.icon} size={30} count={r.count} />
                </div>
              ))}
              {!themItems.length && <span className="trade-empty">{t('trade_empty')}</span>}
            </div>
            <div className="trade-gold-row"><span className="trade-gold-lbl"><Gold /> {t('trade_gold')}</span> <b>{trade.them?.gold || 0}</b></div>
            <div className={'trade-ok' + (trade.themOk ? ' on' : '')}>{trade.themOk ? t('trade_them_ok') : t('trade_waiting_them')}</div>
          </div>
        </div>

        <p className="trade-howto">{t('trade_howto')}</p>

        {/* tu inventario completo: armadura + cinturón (contexto) + bolsa (tocá para ofrecer) */}
        <div className="trade-bag">
          <h4>{t('trade_your_inv')}</h4>
          <div className="stash-inv-block">
            <span className="stash-inv-lbl">{t('grave_armor')}</span>
            <div className="stash-grid">
              {ARMOR_SLOTS.map((k, idx) => { const it = equipment[k]; return (
                <div key={idx} className="grave-cell dim" title={it ? itemName(it, lang) : ''}>{it && <ItemIcon icon={it.icon} size={26} />}</div>
              ) })}
            </div>
          </div>
          {beltCapacityOf(equippedBelt) > 0 && (
            <div className="stash-inv-block">
              <span className="stash-inv-lbl">{t('belt')}</span>
              <div className="stash-grid">
                {Array.from({ length: beltCapacityOf(equippedBelt) }).map((_, i) => (
                  <div key={i} className="grave-cell dim" title={belt[i] ? itemName(belt[i], lang) : ''}>{belt[i] && <ItemIcon icon={belt[i].icon} size={26} count={belt[i].count} />}</div>
                ))}
              </div>
            </div>
          )}
          <div className="stash-inv-block">
            <span className="stash-inv-lbl">{t('stash_your_bag')} <em className="trade-bag-cta">({t('trade_tap_to_offer')})</em></span>
            <div className="stash-grid">
              {inventory.some((it, i) => it && !trade.youIdx.includes(i))
                ? inventory.map((it, i) => (it && !trade.youIdx.includes(i)
                    ? <button key={i} className="grave-cell" onClick={() => toggle(i)} title={itemName(it, lang)}><ItemIcon icon={it.icon} size={26} count={it.count} /></button>
                    : null))
                : <p className="stash-empty">{t('trade_bag_empty')}</p>}
            </div>
          </div>
        </div>

        <div className="trade-actions">
          <button className="welcome-guide" onClick={cancel}>{t('trade_cancel')}</button>
          <button className="gframe-close" onClick={confirm} disabled={trade.youOk}>{trade.youOk ? t('trade_confirmed') : t('trade_confirm')}</button>
        </div>
      </div>
    </div>
  )
}
