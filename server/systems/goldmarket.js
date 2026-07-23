// Marketplace oro↔$VEL — order book P2P, NO-CUSTODIAL. Un jugador publica ORO (que se escrowea en el
// server) pidiendo una cantidad de $VEL a cambio. Otro jugador compra ese oro pagando el $VEL
// DIRECTO on-chain (95% a la wallet del vendedor + 5% al tesoro); el server nunca toca el $VEL, sólo
// verifica la transacción firmada (velchain.js) y libera el oro escrowed al comprador.
//
// Flujo:
//   1) list   -> el vendedor escrowea su oro (sale de su oro vivo) y crea la orden (precio en $VEL).
//   2) lock   -> un comprador reserva la orden (~3 min) y recibe las instrucciones de pago (montos
//                exactos en unidades base, wallet del vendedor, tesoro, memo que ata la orden).
//   3) settle -> el comprador firmó+mandó la transferencia SPL en su wallet; nos pasa la firma; el
//                server verifica on-chain y, si pagó lo pactado, le entrega el oro escrowed.
//   4) cancel -> el vendedor recupera su oro (si la orden no está bloqueada por una compra en curso).
//
// APAGADO por defecto: sin VEL_MARKET=on + VEL_MINT + VEL_TREASURY, todo devuelve { ok:false, off }.
import * as db from '../db/db.js'
import * as rooms from '../world/rooms.js'
import * as chain from './velchain.js'

const COMMISSION = 0.05                 // 5% al tesoro (el resto va al vendedor)
const MAX_ORDERS = 5                    // órdenes activas por vendedor
const MIN_GOLD = 100                    // oro mínimo por orden (evita spam de órdenes ridículas)
const LOCK_MS = 3 * 60 * 1000           // ventana para firmar+confirmar el pago on-chain

// El marketplace está prendido sólo con las 3 piezas de config puestas (token + tesoro + switch).
export function enabled() {
  const on = /^(1|on|true|yes)$/i.test(String(process.env.VEL_MARKET || ''))
  return !!(on && process.env.VEL_MINT && process.env.VEL_TREASURY)
}
const off = () => ({ ok: false, off: true, error: 'el mercado de $VEL está cerrado' })

// Corte del pago (unidades base, BigInt) para un precio entero de tokens. treasuryBase = 5% (hacia
// abajo), sellerBase = el resto. Devuelve strings para mandar al cliente sin perder precisión.
function split(price, decimals) {
  const base = chain.toBaseUnits(price, decimals)
  const treasuryBase = (base * 5n) / 100n
  const sellerBase = base - treasuryBase
  return { sellerBase: sellerBase.toString(), treasuryBase: treasuryBase.toString() }
}

// Config pública para el cliente (nunca claves ni RPC): con qué token se paga, a qué tesoro va el 5%,
// decimales del mint (para armar la transferencia), y los límites. { on:false } si está apagado.
export async function config() {
  if (!enabled()) return { on: false }
  const mint = process.env.VEL_MINT
  const decimals = await chain.mintDecimals(mint)
  return {
    on: true, mint, decimals,
    treasury: process.env.VEL_TREASURY,
    symbol: process.env.VEL_SYMBOL || 'VEL',
    commission: COMMISSION,
    buyUrl: process.env.VEL_BUY_URL || ('https://pump.fun/coin/' + mint),
    // RPC PÚBLICO para que el cliente arme la transacción (blockhash). Separado de SOLANA_RPC (que
    // puede llevar API key privada): NUNCA exponemos esa. Para devnet, poné VEL_RPC_PUBLIC a devnet.
    rpc: process.env.VEL_RPC_PUBLIC || 'https://api.mainnet-beta.solana.com',
    minGold: MIN_GOLD, lockMs: LOCK_MS,
  }
}

// Órdenes visibles para comprar: abiertas, o con el lock ya vencido (vuelven a estar disponibles).
const buyable = (o) => o.status === 'open' || (o.status === 'locked' && (o.lock_expires || 0) < Date.now())
const view = (o) => ({ id: o.id, seller: o.seller_name || '', gold: o.gold, price: o.price, locked: !buyable(o), createdAt: o.created_at })

export async function browse() {
  if (!enabled()) return off()
  return { ok: true, orders: (await db.goldOrderAll()).filter(buyable).map(view) }
}
export async function mine(accountId) {
  if (!enabled()) return off()
  if (!accountId) return { ok: false, error: 'no autenticado' }
  return { ok: true, orders: (await db.goldOrderBySeller(accountId)).map((o) => ({ ...view(o), status: o.status, lockExpires: o.lock_expires })) }
}

// Publicar oro. El oro sale del oro VIVO del vendedor (escrow). sellerWallet lo pone el server (la
// dirección SIWS de la cuenta), NUNCA el cliente — es la wallet que va a cobrar el $VEL.
export async function list(playerId, accountId, sellerName, sellerWallet, gold, price) {
  if (!enabled()) return off()
  if (!accountId || !sellerWallet) return { ok: false, error: 'no autenticado' }
  gold = Math.floor(Number(gold) || 0)
  price = Math.floor(Number(price) || 0)
  if (gold < MIN_GOLD) return { ok: false, error: 'mínimo ' + MIN_GOLD + ' de oro' }
  if (price <= 0) return { ok: false, error: 'precio en $VEL inválido' }
  if ((await db.goldOrderBySeller(accountId)).length >= MAX_ORDERS) return { ok: false, error: 'máximo ' + MAX_ORDERS + ' órdenes' }
  const ch = rooms.chargeGold(playerId, gold)                 // saca el oro del vendedor (escrow)
  if (!ch.ok) return { ok: false, error: ch.error || 'no tenés tanto oro' }
  try {
    const id = await db.goldOrderAdd({ seller: accountId, sellerName, sellerWallet, gold, price, createdAt: Date.now() })
    return { ok: true, id, gold: ch.gold }
  } catch {
    rooms.creditAccountGold(accountId, gold, 'refund')        // rollback del escrow
    return { ok: false, error: 'no se pudo publicar' }
  }
}

// Cancelar: el vendedor recupera su oro escrowed. Rechaza si hay una compra en curso (lock vigente).
export async function cancel(playerId, accountId, orderId) {
  if (!enabled()) return off()
  return db.withLock('gold:' + (orderId | 0), async () => {
    const o = await db.goldOrderGet(orderId)
    if (!o || o.seller !== accountId) return { ok: false, error: 'esa orden no es tuya' }
    if (o.status === 'locked' && (o.lock_expires || 0) >= Date.now()) return { ok: false, error: 'hay una compra en curso, esperá' }
    const removed = await db.goldOrderRemove(orderId)
    if (!removed) return { ok: false, error: 'esa orden ya no está' }
    if (!rooms.creditAccountGold(accountId, removed.gold, 'market_cancel')) await db.updateCharacterGold(accountId, (g) => g + removed.gold)
    const gold = rooms.playerGold(playerId)
    return { ok: true, gold: gold == null ? undefined : gold }
  })
}

// Reservar una orden para comprarla: la bloquea ~3 min y devuelve las instrucciones de pago exactas.
export async function lock(buyerId, buyerAccountId, buyerWallet, orderId) {
  if (!enabled()) return off()
  if (!buyerAccountId) return { ok: false, error: 'no autenticado' }
  const o = await db.goldOrderGet(orderId)
  if (!o) return { ok: false, error: 'esa orden ya no está' }
  if (o.seller === buyerAccountId) return { ok: false, error: 'no podés comprar tu propia orden' }
  const decimals = await chain.mintDecimals(process.env.VEL_MINT)
  if (decimals < 0) return { ok: false, error: 'no se pudo leer el token, reintentá', retry: true }
  const expires = Date.now() + LOCK_MS
  const okLock = await db.goldOrderLock(orderId, { lockedBy: buyerAccountId, lockedWallet: buyerWallet || '', lockExpires: expires })
  if (!okLock) return { ok: false, error: 'alguien la está comprando, probá otra' }
  const { sellerBase, treasuryBase } = split(o.price, decimals)
  return {
    ok: true,
    pay: {
      orderId: o.id, mint: process.env.VEL_MINT, decimals,
      seller: o.seller_wallet, treasury: process.env.VEL_TREASURY,
      sellerBase, treasuryBase, price: o.price,
      memo: 'velmkt:' + o.id, gold: o.gold, expiresAt: expires,
    },
  }
}

// Cancelar la reserva sin comprar (el comprador se arrepintió antes de firmar): libera el lock.
export async function unlock(buyerAccountId, orderId) {
  if (!enabled()) return off()
  await db.goldOrderUnlock(orderId, buyerAccountId)
  return { ok: true }
}

// Cerrar la compra: el comprador ya firmó+mandó el pago y nos pasa la firma. Verificamos on-chain y,
// si pagó lo pactado a vendedor+tesoro con el memo de la orden, le entregamos el oro escrowed.
export async function settle(buyerId, buyerAccountId, orderId, sig) {
  if (!enabled()) return off()
  if (!buyerAccountId) return { ok: false, error: 'no autenticado' }
  if (typeof sig !== 'string' || sig.length < 32 || sig.length > 128) return { ok: false, error: 'firma inválida' }
  return db.withLock('gold:' + (orderId | 0), async () => {
    // Anti-replay: una firma settlea UNA sola orden, una sola vez (guarda global). Si ya se usó, corta.
    if (!(await db.goldSigClaim(sig, orderId))) return { ok: false, error: 'esa transacción ya se usó' }
    const release = async (r) => { await db.goldSigRelease(sig); return r }  // libera la firma si no cerramos

    const o = await db.goldOrderGet(orderId)
    if (!o) return release({ ok: false, error: 'esa orden ya no está' })
    if (o.status !== 'locked' || o.locked_by !== buyerAccountId) return release({ ok: false, error: 'perdiste la reserva de esa orden' })

    const decimals = await chain.mintDecimals(process.env.VEL_MINT)
    if (decimals < 0) return release({ ok: false, error: 'no se pudo leer el token, reintentá', retry: true })
    const { sellerBase, treasuryBase } = split(o.price, decimals)
    const v = await chain.verifyPayment({
      sig, mint: process.env.VEL_MINT, memo: 'velmkt:' + o.id,
      expect: [
        { owner: o.seller_wallet, minBase: BigInt(sellerBase) },
        { owner: process.env.VEL_TREASURY, minBase: BigInt(treasuryBase) },
      ],
    })
    if (!v.ok) return release({ ok: false, error: v.error, retry: !!v.retry })

    const removed = await db.goldOrderRemove(orderId)
    if (!removed) return release({ ok: false, error: 'esa orden ya no está' })
    if (!rooms.creditAccountGold(buyerAccountId, removed.gold, 'market_buy')) await db.updateCharacterGold(buyerAccountId, (g) => g + removed.gold)
    const gold = rooms.playerGold(buyerId)
    return { ok: true, gold: gold == null ? undefined : gold, bought: removed.gold, price: removed.price }
  })
}
