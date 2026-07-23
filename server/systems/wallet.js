// Login por billetera (Solana): "Sign-In With Solana". El jugador prueba que controla una
// wallet firmando un desafío; la CUENTA es la dirección de la wallet (sin contraseña).
//
// Gate de acceso del token $VEL (modelo "play-to-access", ver docs/ECONOMY_VEL.md): para entrar,
// la wallet tiene que holdear un mínimo de $VEL. El mínimo puede ser DINÁMICO en USD (fijamos el
// USD, la cantidad de tokens flota con el precio vía oráculo) o fijo en tokens. Está APAGADO hasta
// que exista el token: sin VEL_MINT, cualquiera entra.
//   VEL_MINT      -> dirección del token (sin esto, gate apagado)
//   VEL_MIN_USD   -> mínimo en USD (ej. 3). Prende el modo dinámico (oráculo de precio).
//   VEL_MIN       -> mínimo fijo en tokens (fallback si no hay VEL_MIN_USD)
//   VEL_ORACLE    -> endpoint de precio (Jupiter Price API por defecto)
//   SOLANA_RPC    -> RPC para leer el balance
//
// Sin dependencias nuevas: verificación ed25519 con node:crypto + base58 inline; balance y precio
// por fetch a JSON-RPC / API pública.
import crypto from 'node:crypto'
import { findAccount, createAccount } from '../db/db.js'
import { issueToken } from './auth.js'

const NONCE_TTL = 5 * 60 * 1000
const challenges = new Map() // pubkey -> { message, exp }

// --- base58 (alfabeto Bitcoin) -> Buffer ---
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B58MAP = Object.fromEntries([...B58].map((c, i) => [c, i]))
function b58decode(s) {
  const bytes = [0]
  for (const ch of s) {
    const val = B58MAP[ch]
    if (val === undefined) throw new Error('base58 inválido')
    let carry = val
    for (let j = 0; j < bytes.length; j++) { carry += bytes[j] * 58; bytes[j] = carry & 0xff; carry >>= 8 }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8 }
  }
  for (let k = 0; k < s.length && s[k] === '1'; k++) bytes.push(0)
  return Buffer.from(bytes.reverse())
}

// Verifica una firma ed25519 (pubkey en base58, mensaje utf8, firma en hex) con node:crypto.
const ED_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex') // DER SPKI de ed25519
function verifySignature(pubkeyB58, message, sigHex) {
  try {
    const raw = b58decode(pubkeyB58)
    if (raw.length !== 32) return false
    const sig = Buffer.from(sigHex, 'hex')
    if (sig.length !== 64) return false
    const key = crypto.createPublicKey({ key: Buffer.concat([ED_SPKI_PREFIX, raw]), format: 'der', type: 'spki' })
    return crypto.verify(null, Buffer.from(message, 'utf8'), key, sig)
  } catch { return false }
}

// Mensaje-desafío para que la wallet firme. Guarda el texto exacto para verificar después.
export function challenge(pubkey) {
  const nonce = crypto.randomBytes(16).toString('hex')
  const message = `Velgrim — iniciá sesión.\nBilletera: ${pubkey}\nNonce: ${nonce}`
  challenges.set(pubkey, { message, exp: Date.now() + NONCE_TTL })
  return message
}

// Balance de $VEL (uiAmount, suma de todas las token accounts) de una wallet. -1 ante error de RPC.
async function velBalance(pubkey, mint, rpc) {
  try {
    const res = await fetch(rpc, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
        params: [pubkey, { mint }, { encoding: 'jsonParsed' }],
      }),
    })
    const j = await res.json()
    let total = 0
    for (const acc of j?.result?.value || []) {
      total += acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0
    }
    return total
  } catch { return -1 }
}

// Precio de $VEL en USD desde un oráculo (Jupiter Price API por defecto). Cacheado ~60s para no
// pegarle al oráculo en cada login. 0 ante error (el caller falla cerrado). Formato Jupiter v2:
// { data: { "<mint>": { price: "0.0001" } } }.
const VEL_ORACLE = process.env.VEL_ORACLE || 'https://api.jup.ag/price/v2'
let _priceCache = { at: 0, usd: 0 }
async function velPriceUsd(mint) {
  const now = Date.now()
  if (now - _priceCache.at < 60_000 && _priceCache.usd > 0) return _priceCache.usd
  try {
    const url = VEL_ORACLE + (VEL_ORACLE.includes('?') ? '&' : '?') + 'ids=' + encodeURIComponent(mint)
    const res = await fetch(url)
    const j = await res.json()
    const usd = Number(j?.data?.[mint]?.price) || 0
    if (usd > 0) _priceCache = { at: now, usd }
    return usd
  } catch { return 0 }
}

// Cuántos tokens de $VEL exige el gate ahora mismo (para mostrar en la UI o loguear). 0 = sin gate.
export async function velRequirement() {
  const mint = process.env.VEL_MINT
  if (!mint) return { gate: false, tokens: 0, usd: 0 }
  const usdMin = Number(process.env.VEL_MIN_USD || 0)
  if (usdMin > 0) {
    const price = await velPriceUsd(mint)
    return { gate: true, mode: 'usd', usd: usdMin, price, tokens: price > 0 ? Math.ceil(usdMin / price) : null }
  }
  return { gate: true, mode: 'fixed', usd: 0, tokens: Number(process.env.VEL_MIN || 0) }
}

// Gate de acceso del token $VEL. APAGADO si no hay VEL_MINT (por ahora, cualquiera entra).
// Con mínimo DINÁMICO en USD (VEL_MIN_USD) la cantidad de tokens flota con el precio; si no, usa el
// mínimo fijo en tokens (VEL_MIN). Fail-closed: ante error de RPC u oráculo, NO deja pasar.
async function meetsTokenGate(pubkey) {
  const mint = process.env.VEL_MINT
  if (!mint) return true   // gate apagado hasta que exista el token
  const rpc = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
  const total = await velBalance(pubkey, mint, rpc)
  if (total < 0) return false   // error de RPC -> fail-closed
  const usdMin = Number(process.env.VEL_MIN_USD || 0)
  const fixedMin = Number(process.env.VEL_MIN || 0)
  if (usdMin > 0) {
    // Modo dinámico: exigir el equivalente en tokens de VEL_MIN_USD al precio actual.
    const price = await velPriceUsd(mint)
    if (price > 0) return total >= usdMin / price
    // Sin precio (token recién nacido en pump.fun / oráculo caído): NO cerramos para todos —eso
    // lockearía a toda la gente justo en el lanzamiento. Si hay mínimo fijo de respaldo, usamos ese
    // (sigue gateado); sólo si no hay respaldo caemos a fail-closed.
    if (fixedMin > 0) return total >= fixedMin
    return false
  }
  // Modo fijo: mínimo en tokens.
  return total >= fixedMin
}

// Config pública del token para el cliente (pantalla de compra + requisito). El cliente NUNCA
// necesita claves ni RPC: sólo el símbolo, el link de compra y cuánto exige el gate ahora.
export async function velConfig() {
  const mint = process.env.VEL_MINT || ''
  if (!mint) return { gate: false }
  const symbol = process.env.VEL_SYMBOL || 'VEL'
  const buyUrl = process.env.VEL_BUY_URL || ('https://pump.fun/coin/' + mint)
  const req = await velRequirement()   // { tokens, usd, price, mode }
  return { gate: true, mint, symbol, buyUrl, minUsd: req.usd || 0, price: req.price || 0, requiredTokens: req.tokens ?? null }
}

// Verifica la firma del desafío y devuelve { ok, token, pubkey } o { ok:false, error }.
export async function walletVerify(pubkey, sigHex) {
  const rec = challenges.get(pubkey)
  if (!rec || rec.exp < Date.now()) return { ok: false, error: 'el desafío venció, reintentá' }
  if (!verifySignature(pubkey, rec.message, sigHex)) return { ok: false, error: 'firma inválida' }
  challenges.delete(pubkey)
  // Gate del token: si no alcanza el mínimo, devolvemos la config para que el cliente muestre la
  // pantalla de compra (símbolo, link de pump.fun, cuánto falta) en vez de un error seco.
  if (!(await meetsTokenGate(pubkey))) return { ok: false, error: 'gate', vel: await velConfig() }
  let account = await findAccount(pubkey)
  if (!account) account = await createAccount(pubkey, '')  // cuenta = dirección de la wallet
  return { ok: true, token: issueToken(account), pubkey }
}
