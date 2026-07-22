// Cuentas: registro y login con contraseña hasheada (scrypt, del core de Node — sin deps) y
// tokens de sesión en memoria. El servidor es autoritativo: sin token válido no se juega.
// (Los tokens viven en memoria: al reiniciar el server, los clientes vuelven a loguearse.)
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { findAccount, createAccount } from '../db/db.js'

const tokens = new Map() // token -> { accountId, username }

// scrypt ASÍNCRONO (libpthread pool): la versión Sync bloqueaba el único hilo del server ~decenas
// de ms por login/registro, congelando la simulación de combate y todas las conexiones. Con la
// async, el hash corre fuera del event loop.
const scrypt = promisify(crypto.scrypt)

// scrypt: hash = "salt:derivada" en hex. Comparación en tiempo constante.
async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const dk = await scrypt(password, salt, 32)
  return salt.toString('hex') + ':' + dk.toString('hex')
}
async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(':')
  if (!saltHex || !hashHex) return false
  const dk = await scrypt(password, Buffer.from(saltHex, 'hex'), 32)
  const a = Buffer.from(hashHex, 'hex')
  return a.length === dk.length && crypto.timingSafeEqual(a, dk)
}

function newToken(account) {
  const token = crypto.randomBytes(24).toString('hex')
  tokens.set(token, { accountId: account.id, username: account.username })
  return token
}
// Emite un token de sesión para una cuenta ya resuelta (lo usa también el login por wallet).
export function issueToken(account) { return newToken(account) }

// Valida usuario/contraseña. Reglas mínimas para no guardar basura.
function validate(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return 'datos inválidos'
  const u = username.trim()
  if (u.length < 3 || u.length > 20) return 'el usuario debe tener 3 a 20 caracteres'
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'el usuario sólo admite letras, números y _'
  if (password.length < 6) return 'la contraseña debe tener al menos 6 caracteres'
  return null
}

// Registra una cuenta nueva. Devuelve { ok, token, username } o { ok:false, error }.
export async function register(username, password) {
  const err = validate(username, password)
  if (err) return { ok: false, error: err }
  if (await findAccount(username)) return { ok: false, error: 'ese usuario ya existe' }
  const account = await createAccount(username.trim(), await hashPassword(password))
  return { ok: true, token: newToken(account), username: account.username }
}

// Login. Devuelve { ok, token, username } o { ok:false, error }.
export async function login(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return { ok: false, error: 'datos inválidos' }
  const account = await findAccount(username)
  if (!account || !(await verifyPassword(password, account.pass_hash))) return { ok: false, error: 'usuario o contraseña incorrectos' }
  return { ok: true, token: newToken(account), username: account.username }
}

// Sesión de un token (o null).
export function session(token) { return tokens.get(token) || null }
export function logout(token) { tokens.delete(token) }
