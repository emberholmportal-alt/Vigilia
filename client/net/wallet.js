// Billetera Solana (Phantom/Solflare): conectar + firmar el desafío del servidor. La cuenta es
// la dirección de la wallet. Por ahora NO se exige tener ninguna moneda (el server tiene el gate
// de $VEL apagado hasta que exista). El token de sesión se guarda para reusarlo en el juego.
const KEY = 'velgrim:wallet'

// Provider inyectado por la extensión (Phantom expone window.solana / window.phantom.solana).
export function getProvider() {
  if (typeof window === 'undefined') return null
  return window.phantom?.solana || window.solana || window.solflare || null
}
export function hasWallet() { return !!getProvider() }

function saveSession(s) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }
export function loadSession() { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
export function clearSession() { try { localStorage.removeItem(KEY) } catch {} }

// Conecta la wallet (abre la extensión). Devuelve { provider, pubkey } o tira error.
export async function connectWallet() {
  const provider = getProvider()
  if (!provider) throw new Error('no-wallet')
  const res = await provider.connect()
  const pubkey = (res?.publicKey || provider.publicKey)?.toString()
  if (!pubkey) throw new Error('sin-pubkey')
  return { provider, pubkey }
}

// Flujo completo: conectar -> pedir desafío -> firmar -> verificar -> sesión. `net` ya conectado.
// Devuelve { ok, pubkey, token, char } o { ok:false, error }.
export async function walletSignIn(net) {
  let provider, pubkey
  try { ({ provider, pubkey } = await connectWallet()) }
  catch (e) { return { ok: false, error: e.message === 'no-wallet' ? 'no-wallet' : 'conexión cancelada' } }

  const ch = await net.walletChallenge(pubkey)
  const bytes = new TextEncoder().encode(ch.message)
  let signed
  try { signed = await provider.signMessage(bytes, 'utf8') }
  catch { return { ok: false, error: 'firma cancelada' } }
  const sig = signed?.signature || signed
  const sigHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')

  const auth = await net.walletVerify(pubkey, sigHex)
  // Gate del token: el server rechaza con error 'gate' + la config (vel) para la pantalla de compra.
  if (!auth.ok) return { ok: false, error: auth.error || 'no se pudo verificar', vel: auth.vel, pubkey }
  saveSession({ pubkey, token: auth.token })
  return { ok: true, pubkey, token: auth.token, char: auth.char }
}
