// Autenticación de dispositivo: para probar el online sin una pantalla de login todavía, cada
// navegador se registra una cuenta propia y guarda sus credenciales. Al reconectar, reanuda con
// el token o vuelve a loguear. (La pantalla de registro/login con usuario elegido es el paso
// siguiente; el servidor ya soporta cuentas reales.)
import { loadSession as loadWallet } from './wallet.js'

const KEY = 'velgrim:device'

function loadDev() { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
function saveDev(d) { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {} }
function rand(n) { let s = ''; const c = 'abcdef0123456789'; for (let i = 0; i < n; i++) s += c[(Math.random() * 16) | 0]; return s }

// Autentica contra el servidor con la cuenta de dispositivo. Devuelve { ok, char } — char es el
// blob guardado en el server (o null si es cuenta nueva).
export async function deviceAuth(net) {
  // Si el jugador conectó su billetera en la pantalla de inicio, esa identidad manda.
  const w = loadWallet()
  if (w?.token) {
    const r = await net.resume(w.token).catch(() => ({ ok: false }))
    if (r.ok) return { ok: true, char: r.char, wallet: w.pubkey }
  }
  const dev = loadDev()
  if (dev?.token) {
    const r = await net.resume(dev.token).catch(() => ({ ok: false }))
    if (r.ok) return { ok: true, char: r.char }
  }
  if (dev?.user) {
    const r = await net.login(dev.user, dev.pass).catch(() => ({ ok: false }))
    if (r.ok) { saveDev({ ...dev, token: r.token }); return { ok: true, char: r.char } }
  }
  const user = 'dev_' + rand(10), pass = rand(16)
  const r = await net.register(user, pass).catch(() => ({ ok: false }))
  if (!r.ok) return { ok: false, error: r.error }
  saveDev({ user, pass, token: r.token })
  return { ok: true, char: null }
}
