// Persistencia del servidor. Usa PostgreSQL si hay DATABASE_URL (producción, Render); si no,
// cae a un archivo JSON local (server/.data/db.json) para poder correr sin base. La API es la
// misma para ambos backends, así el resto del servidor no sabe cuál está activo.
//
// Tablas: accounts (login) y characters (un personaje por cuenta; el blob del save del cliente
// va como JSONB — mismo shape que client/data/save.js).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '.data')
const DATA_FILE = path.join(DATA_DIR, 'db.json')

let pg = null            // pool de Postgres (si hay DATABASE_URL)
let file = null          // { accounts: {id, username, pass_hash}[], chars: {account_id -> {...}} }
let seq = 1              // id incremental para el backend de archivo

export function usingPostgres() { return !!pg }

export async function init() {
  const url = process.env.DATABASE_URL
  if (url) {
    const { default: pkg } = await import('pg')
    pg = new pkg.Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } })
    await pg.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        pass_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS characters (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        name TEXT, race TEXT, data JSONB, updated_at TIMESTAMPTZ DEFAULT now()
      );`)
    console.log('[db] PostgreSQL conectado')
    return
  }
  // Fallback a archivo.
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DATA_FILE)) {
    try { file = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { file = null }
  }
  if (!file) file = { accounts: [], chars: {} }
  seq = file.accounts.reduce((m, a) => Math.max(m, a.id), 0) + 1
  console.log('[db] Sin DATABASE_URL: usando archivo local (' + DATA_FILE + ')')
}

function flush() {
  if (pg) return
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(file)) } catch (e) { console.error('[db] flush', e.message) }
}

// Cuenta por nombre de usuario (case-insensitive). Devuelve {id, username, pass_hash} o null.
export async function findAccount(username) {
  const u = String(username).toLowerCase()
  if (pg) {
    const r = await pg.query('SELECT id, username, pass_hash FROM accounts WHERE lower(username)=$1', [u])
    return r.rows[0] || null
  }
  return file.accounts.find((a) => a.username.toLowerCase() === u) || null
}

// Crea una cuenta. Devuelve {id, username}. Asume que ya se chequeó que no existe.
export async function createAccount(username, passHash) {
  if (pg) {
    const r = await pg.query('INSERT INTO accounts (username, pass_hash) VALUES ($1,$2) RETURNING id, username', [username, passHash])
    return r.rows[0]
  }
  const acc = { id: seq++, username, pass_hash: passHash }
  file.accounts.push(acc)
  flush()
  return { id: acc.id, username: acc.username }
}

// Guarda (upsert) el personaje de una cuenta. `data` es el blob del save del cliente.
export async function saveCharacter(accountId, { name, race, data }) {
  if (pg) {
    await pg.query(
      `INSERT INTO characters (account_id, name, race, data, updated_at) VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (account_id) DO UPDATE SET name=$2, race=$3, data=$4, updated_at=now()`,
      [accountId, name || null, race || null, data || {}])
    return
  }
  file.chars[accountId] = { name: name || null, race: race || null, data: data || {} }
  flush()
}

// Carga el personaje de una cuenta. Devuelve {name, race, data} o null.
export async function loadCharacter(accountId) {
  if (pg) {
    const r = await pg.query('SELECT name, race, data FROM characters WHERE account_id=$1', [accountId])
    return r.rows[0] || null
  }
  return file.chars[accountId] || null
}
