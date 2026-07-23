// Mercado (casa de subastas, precio fijo, global) — Kintara #4. Todo AUTORITATIVO:
// - Publicar saca el ítem del bag del server (escrow en el listado, persistido en DB).
// - Comprar reclama el listado ATÓMICO (dos compradores no se llevan el mismo), cobra al comprador,
//   entrega el ítem, y acredita al vendedor menos comisión (sumidero de oro). Online o offline.
// - Cancelar/vencer devuelven el ítem al vendedor (online: bag; offline: blob).
import * as db from '../db/db.js'
import * as rooms from '../world/rooms.js'

const COMMISSION = 0.05                 // 5% al vender (sumidero de oro)
const MAX_LISTINGS = 5                  // publicaciones activas por vendedor
const DURATION_MS = 48 * 3600 * 1000    // 48 horas

const view = (l) => ({ id: l.id, seller: l.seller_name || '', item: l.item, price: l.price, expiresAt: l.expires_at })
const readd = (l) => db.marketAdd({ seller: l.seller, sellerName: l.seller_name, item: l.item, price: l.price, createdAt: l.created_at, expiresAt: l.expires_at })

// Barrido de vencidos: devuelve el ítem al vendedor (online: bag; offline o bag lleno: blob).
export async function sweepExpired(now) {
  for (const l of await db.marketAll()) {
    if (l.expires_at > now) continue
    const claimed = await db.marketClaim(l.id); if (!claimed) continue
    const on = rooms.giveItemToAccount(claimed.seller, claimed.item)   // true online-ok / false online-lleno / null offline
    if (on !== true) await db.addToCharacterInventory(claimed.seller, claimed.item)
  }
}

export async function browse() {
  const now = Date.now(); await sweepExpired(now)
  return { ok: true, listings: (await db.marketAll()).filter((l) => l.expires_at > now).map(view) }
}
export async function mine(accountId) {
  const now = Date.now(); await sweepExpired(now)
  return { ok: true, listings: (await db.marketBySeller(accountId)).filter((l) => l.expires_at > now).map(view) }
}

// Publicar: saca la pila entera del slot y crea el listado. Máx 5 activos por vendedor.
export async function list(playerId, accountId, sellerName, bagIndex, price) {
  price = Math.floor(Number(price) || 0)
  if (price <= 0) return { ok: false, error: 'precio inválido' }
  if ((await db.marketBySeller(accountId)).length >= MAX_LISTINGS) return { ok: false, error: 'máximo ' + MAX_LISTINGS + ' publicaciones' }
  const taken = rooms.takeForListing(playerId, bagIndex)
  if (!taken.ok) return { ok: false, error: taken.error || 'no tenés ese ítem' }
  const now = Date.now()
  try {
    const id = await db.marketAdd({ seller: accountId, sellerName, item: taken.item, price, createdAt: now, expiresAt: now + DURATION_MS })
    await rooms.flushInv(accountId)   // durabilidad: el descuento del bag tan durable como el listado (anti-dupe por crash)
    return { ok: true, id, inv: taken.inv }
  } catch {
    rooms.giveFromMarket(playerId, taken.item)   // rollback
    return { ok: false, error: 'no se pudo publicar' }
  }
}

// Comprar: reclama ATÓMICO; valida oro + lugar; cobra, entrega, acredita al vendedor (menos comisión).
export async function buy(buyerId, buyerAccountId, listingId) {
  const l = await db.marketClaim(listingId)
  if (!l) return { ok: false, error: 'esa publicación ya no está' }
  if (l.seller === buyerAccountId) { await readd(l); return { ok: false, error: 'no podés comprar lo tuyo' } }
  if ((rooms.playerGold(buyerId) || 0) < l.price) { await readd(l); return { ok: false, error: 'no tenés tanto oro' } }
  if (!rooms.hasBagRoom(buyerId)) { await readd(l); return { ok: false, error: 'inventario lleno' } }
  const ch = rooms.chargeGold(buyerId, l.price)
  if (!ch.ok) { await readd(l); return { ok: false, error: ch.error || 'no tenés tanto oro' } }
  const give = rooms.giveFromMarket(buyerId, l.item)
  if (!give.ok) { rooms.creditAccountGold(buyerAccountId, l.price, 'refund'); await readd(l); return { ok: false, error: 'inventario lleno' } }
  const net = Math.max(1, Math.floor(l.price * (1 - COMMISSION)))   // 5% se destruye (sumidero)
  if (!rooms.creditAccountGold(l.seller, net, 'market_sale')) await db.updateCharacterGold(l.seller, (g) => g + net)
  return { ok: true, inv: give.inv, gold: ch.gold, item: l.item, net }
}

// Cancelar: el vendedor recupera su ítem. Verifica propiedad.
export async function cancel(playerId, accountId, listingId) {
  if (!(await db.marketBySeller(accountId)).some((l) => l.id === (listingId | 0))) return { ok: false, error: 'no es tuya' }
  const l = await db.marketClaim(listingId)
  if (!l) return { ok: false, error: 'ya no está' }
  const give = rooms.giveFromMarket(playerId, l.item)
  if (!give.ok) { await readd(l); return { ok: false, error: 'inventario lleno' } }
  return { ok: true, inv: give.inv }
}
