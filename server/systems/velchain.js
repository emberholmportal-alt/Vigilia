// Lectura de la cadena de Solana para el marketplace oro↔$VEL. TODO por fetch a JSON-RPC público
// (igual que el gate en wallet.js): SIN dependencias nuevas en el server, y el server NUNCA firma ni
// custodia nada — sólo LEE una transacción ya confirmada y verifica que pagó lo que tenía que pagar.
//
// El flujo no-custodial: el comprador firma en su wallet (Phantom) una transferencia SPL de $VEL
// (95% al vendedor + 5% al tesoro), la manda a la red, y nos pasa la firma. Acá verificamos on-chain
// que esa transacción:
//   1) existe y está finalizada, sin error,
//   2) movió >= la parte del vendedor a la wallet del vendedor (por delta de balance del token),
//   3) movió >= la parte del tesoro a la wallet del tesoro,
//   4) lleva el memo `velmkt:<orderId>` (ata la transacción a ESTA orden, no a otra),
// y recién ahí liberamos el oro escrowed. La unicidad global de la firma (una firma sólo settlea una
// orden) la garantiza el caller (goldmarket.js) con la tabla de firmas usadas.

const RPC = () => process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

async function rpc(method, params) {
  const res = await fetch(RPC(), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const j = await res.json()
  if (j.error) throw new Error(j.error.message || 'rpc error')
  return j.result
}

// Decimales del mint (cacheado: un mint no cambia sus decimales). -1 ante error.
const _decCache = new Map()
export async function mintDecimals(mint) {
  if (_decCache.has(mint)) return _decCache.get(mint)
  try {
    const r = await rpc('getTokenSupply', [mint])
    const d = r?.value?.decimals
    if (Number.isInteger(d)) { _decCache.set(mint, d); return d }
    return -1
  } catch { return -1 }
}

// Convierte una cantidad ENTERA de tokens (UI) a unidades base (BigInt) con los decimales del mint.
export function toBaseUnits(uiTokens, decimals) {
  return BigInt(Math.floor(Number(uiTokens) || 0)) * (10n ** BigInt(decimals))
}

// Suma (BigInt) del balance de `mint` que controla `owner` en una lista pre/post de getTransaction.
function ownerBalance(list, owner, mint) {
  let total = 0n
  for (const b of list || []) {
    if (b.owner === owner && b.mint === mint) total += BigInt(b.uiTokenAmount?.amount || '0')
  }
  return total
}

// Junta todos los memos (programa spl-memo) de una transacción jsonParsed (instrucciones top-level e
// internas). El memo es texto libre; nosotros ponemos `velmkt:<orderId>`.
function collectMemos(tx) {
  const out = []
  const scan = (ins) => {
    for (const ix of ins || []) {
      if (ix.program === 'spl-memo' && typeof ix.parsed === 'string') out.push(ix.parsed)
    }
  }
  scan(tx?.transaction?.message?.instructions)
  for (const inner of tx?.meta?.innerInstructions || []) scan(inner.instructions)
  return out
}

// Verifica una transacción de pago del marketplace. Devuelve { ok } o { ok:false, error, retry? }.
// `retry:true` = todavía no está confirmada/visible (el caller puede pedir reintentar); sin retry =
// rechazo definitivo (pagó de menos, a quien no era, o el memo no ata la orden).
export async function verifyPayment({ sig, mint, expect, memo }) {
  let tx
  try { tx = await rpc('getTransaction', [sig, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]) }
  catch { return { ok: false, error: 'no se pudo leer la transacción', retry: true } }
  if (!tx) return { ok: false, error: 'la transacción todavía no está finalizada', retry: true }
  if (tx.meta?.err) return { ok: false, error: 'la transacción falló en la red' }

  const pre = tx.meta?.preTokenBalances || []
  const post = tx.meta?.postTokenBalances || []
  for (const { owner, minBase } of expect) {
    const delta = ownerBalance(post, owner, mint) - ownerBalance(pre, owner, mint)
    if (delta < minBase) return { ok: false, error: 'el pago no alcanza (' + owner.slice(0, 6) + '…)' }
  }
  if (memo && !collectMemos(tx).some((m) => m.includes(memo))) return { ok: false, error: 'la transacción no corresponde a esta orden' }
  return { ok: true }
}
