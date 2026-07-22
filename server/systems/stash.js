// Alijo privado por cuenta (Kintara-ish): un cofre personal en el pueblo donde el jugador deja
// ítems que no quiere cargar. SÓLO el dueño lo ve/accede. Autoritativo con escrow: los ítems viven
// en el server (DB, tabla player_stash) ligados a la cuenta, no en la bolsa — no se pueden duplicar.
//
// El flujo espeja al depósito del gremio: depositar saca el ítem del bag autoritativo (por índice) y
// lo guarda acá; retirar lo saca de acá y lo mete al bag. Bajo lock por cuenta para que dos
// operaciones simultáneas no dupliquen ni pierdan un ítem.
import * as db from '../db/db.js'

export const STASH_MAX = 20   // capacidad inicial (5×4). Ampliable más adelante.

export async function view(accountId) {
  if (!accountId) return { ok: false, error: 'no autenticado' }
  const items = await db.getStash(accountId)
  const gold = await db.getStashGold(accountId)
  return { ok: true, items, gold, max: STASH_MAX }
}

// Suma oro a la bóveda del alijo (el caller ya debitó el oro VIVO del jugador). Bajo lock por cuenta.
export async function depositGold(accountId, amount) {
  const amt = Math.floor(Number(amount) || 0)
  if (amt <= 0) return { ok: false, error: 'monto inválido' }
  return db.withAccountLock(accountId, async () => {
    const g = await db.getStashGold(accountId)
    await db.setStashGold(accountId, g + amt)
    return { ok: true, gold: g + amt }
  })
}

// Saca oro de la bóveda (el caller lo acredita al oro vivo). Falla si no alcanza. Bajo lock por cuenta.
export async function withdrawGold(accountId, amount) {
  const amt = Math.floor(Number(amount) || 0)
  if (amt <= 0) return { ok: false, error: 'monto inválido' }
  return db.withAccountLock(accountId, async () => {
    const g = await db.getStashGold(accountId)
    if (g < amt) return { ok: false, error: 'no hay tanto oro en el alijo' }
    await db.setStashGold(accountId, g - amt)
    return { ok: true, gold: g - amt }
  })
}

// Guarda un ítem (registro ya sacado del bag por el caller). Devuelve { ok, items } o error.
export async function depositItem(accountId, item) {
  if (!item || typeof item !== 'object') return { ok: false, error: 'ítem inválido' }
  return db.withAccountLock(accountId, async () => {
    const items = (await db.getStash(accountId)).slice()
    if (items.length >= STASH_MAX) return { ok: false, error: 'el alijo está lleno' }
    items.push(item)
    await db.setStash(accountId, items)
    return { ok: true, items, max: STASH_MAX }
  })
}

// Saca un ítem por índice y lo devuelve (el caller lo mete al bag). Bajo lock: dos retiros del mismo
// índice no pueden llevarse el ítem duplicado. Devuelve { ok, item, items } o error.
export async function withdrawItem(accountId, index) {
  const i = index | 0
  return db.withAccountLock(accountId, async () => {
    const items = (await db.getStash(accountId)).slice()
    if (i < 0 || i >= items.length) return { ok: false, error: 'ese ítem no está' }
    const [item] = items.splice(i, 1)
    await db.setStash(accountId, items)
    return { ok: true, item, items, max: STASH_MAX }
  })
}
