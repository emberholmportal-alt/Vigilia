// Login por billetera (Solana): "Sign-In With Solana". El jugador prueba que controla una
// wallet firmando un desafío; la CUENTA es la dirección de la wallet (sin contraseña).
//
// El gate del token $VEL está previsto pero APAGADO por ahora (no exigimos ninguna moneda
// hasta que exista): se enciende seteando VEL_MINT (+ VEL_MIN, SOLANA_RPC).
//
// Sin dependencias nuevas: verificación ed25519 con node:crypto + base58 inline.
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

// Gate opcional del token $VEL. APAGADO si no hay VEL_MINT (por ahora, cualquiera entra).
async function meetsTokenGate(pubkey) {
  const mint = process.env.VEL_MINT
  if (!mint) return true
  const rpc = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
  const min = Number(process.env.VEL_MIN || 0)
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
    return total >= min
  } catch { return false } // ante error de RPC, no dejamos pasar (fail-closed)
}

// Verifica la firma del desafío y devuelve { ok, token, pubkey } o { ok:false, error }.
export async function walletVerify(pubkey, sigHex) {
  const rec = challenges.get(pubkey)
  if (!rec || rec.exp < Date.now()) return { ok: false, error: 'el desafío venció, reintentá' }
  if (!verifySignature(pubkey, rec.message, sigHex)) return { ok: false, error: 'firma inválida' }
  challenges.delete(pubkey)
  if (!(await meetsTokenGate(pubkey))) return { ok: false, error: 'no alcanzás el mínimo de $VEL' }
  let account = await findAccount(pubkey)
  if (!account) account = await createAccount(pubkey, '')  // cuenta = dirección de la wallet
  return { ok: true, token: issueToken(account), pubkey }
}
