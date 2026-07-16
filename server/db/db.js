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
        created_at TIMESTAMPTZ DEFAULT now(),
        last_seen TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();
      CREATE TABLE IF NOT EXISTS characters (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        name TEXT, race TEXT, data JSONB, updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS guilds (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        tag TEXT UNIQUE NOT NULL,
        color TEXT,
        level INTEGER DEFAULT 1,
        donated BIGINT DEFAULT 0,
        founder INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        contract_week TEXT,
        contract_progress INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE guilds ADD COLUMN IF NOT EXISTS contract_week TEXT;
      ALTER TABLE guilds ADD COLUMN IF NOT EXISTS contract_progress INTEGER DEFAULT 0;
      CREATE TABLE IF NOT EXISTS guild_members (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS guild_deposit (
        guild_id INTEGER PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
        gold BIGINT DEFAULT 0,
        items JSONB DEFAULT '[]'::jsonb
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
  if (!file.guilds) file.guilds = []                 // [{id,name,tag,color,level,donated,founder,contract_week,contract_progress}]
  if (!file.guildMembers) file.guildMembers = {}     // account_id -> {guild_id, role}
  if (!file.guildDeposit) file.guildDeposit = {}     // guild_id -> {gold, items:[]}
  if (file.guildSeq == null) file.guildSeq = file.guilds.reduce((m, g) => Math.max(m, g.id), 0) + 1
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

// Marca actividad de una cuenta (para el contador de jugadores mensuales).
export async function touchAccount(accountId) {
  if (pg) { await pg.query('UPDATE accounts SET last_seen=now() WHERE id=$1', [accountId]); return }
  const acc = file.accounts.find((a) => a.id === accountId)
  if (acc) { acc.last_seen = Date.now(); flush() }
}

// Cuenta de jugadores distintos vistos en los últimos 30 días.
export async function monthlyCount() {
  if (pg) {
    const r = await pg.query("SELECT count(*)::int AS n FROM accounts WHERE last_seen > now() - interval '30 days'")
    return r.rows[0]?.n || 0
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return file.accounts.filter((a) => (a.last_seen || 0) > cutoff).length
}

// Carga el personaje de una cuenta. Devuelve {name, race, data} o null.
export async function loadCharacter(accountId) {
  if (pg) {
    const r = await pg.query('SELECT name, race, data FROM characters WHERE account_id=$1', [accountId])
    return r.rows[0] || null
  }
  return file.chars[accountId] || null
}

// ---------- Gremios ----------
// El oro de fundación/donación lo descuenta el server del blob persistido del personaje
// (la única fuente de verdad del oro), no del cliente. Ver server/systems/guilds.js.

// Sólo el oro del blob del personaje, para validar donaciones sin cargar todo. Devuelve número.
export async function getCharacterGold(accountId) {
  const ch = await loadCharacter(accountId)
  return ch?.data?.gold | 0
}

// Escribe el oro del blob del personaje (descuento de fundación/donación), preservando el resto.
export async function setCharacterGold(accountId, gold) {
  const ch = await loadCharacter(accountId)
  if (!ch) return false
  const data = { ...(ch.data || {}), gold: gold | 0 }
  await saveCharacter(accountId, { name: ch.name, race: ch.race, data })
  return true
}

export async function findGuildByTag(tag) {
  const t = String(tag).toUpperCase()
  if (pg) return (await pg.query('SELECT * FROM guilds WHERE upper(tag)=$1', [t])).rows[0] || null
  return file.guilds.find((g) => g.tag.toUpperCase() === t) || null
}
export async function findGuildByName(name) {
  const n = String(name).toLowerCase()
  if (pg) return (await pg.query('SELECT * FROM guilds WHERE lower(name)=$1', [n])).rows[0] || null
  return file.guilds.find((g) => g.name.toLowerCase() === n) || null
}
export async function getGuild(id) {
  if (pg) return (await pg.query('SELECT * FROM guilds WHERE id=$1', [id])).rows[0] || null
  return file.guilds.find((g) => g.id === id) || null
}
export async function createGuild({ name, tag, color, founder }) {
  if (pg) {
    const r = await pg.query(
      'INSERT INTO guilds (name, tag, color, founder, level, donated) VALUES ($1,$2,$3,$4,1,0) RETURNING *',
      [name, String(tag).toUpperCase(), color || null, founder])
    return r.rows[0]
  }
  const g = { id: file.guildSeq++, name, tag: String(tag).toUpperCase(), color: color || null, level: 1, donated: 0, founder }
  file.guilds.push(g); flush()
  return g
}
export async function addGuildDonation(guildId, amount, newLevel) {
  if (pg) {
    const r = await pg.query(
      'UPDATE guilds SET donated=donated+$2, level=$3 WHERE id=$1 RETURNING *',
      [guildId, amount, newLevel])
    return r.rows[0]
  }
  const g = file.guilds.find((x) => x.id === guildId)
  if (g) { g.donated += amount; g.level = newLevel; flush() }
  return g
}
export async function getGuildMembership(accountId) {
  if (pg) return (await pg.query('SELECT guild_id, role FROM guild_members WHERE account_id=$1', [accountId])).rows[0] || null
  return file.guildMembers[accountId] || null
}
export async function setGuildMembership(accountId, guildId, role = 'member') {
  if (pg) {
    await pg.query(
      `INSERT INTO guild_members (account_id, guild_id, role) VALUES ($1,$2,$3)
       ON CONFLICT (account_id) DO UPDATE SET guild_id=$2, role=$3, joined_at=now()`,
      [accountId, guildId, role])
    return
  }
  file.guildMembers[accountId] = { guild_id: guildId, role }; flush()
}
export async function removeGuildMembership(accountId) {
  if (pg) { await pg.query('DELETE FROM guild_members WHERE account_id=$1', [accountId]); return }
  delete file.guildMembers[accountId]; flush()
}
export async function guildMemberCount(guildId) {
  if (pg) return (await pg.query('SELECT count(*)::int AS n FROM guild_members WHERE guild_id=$1', [guildId])).rows[0]?.n || 0
  return Object.values(file.guildMembers).filter((m) => m.guild_id === guildId).length
}
// Miembros de un gremio con su nombre de cuenta y rol. Ordena fundador primero.
export async function guildMembers(guildId) {
  if (pg) {
    const r = await pg.query(
      `SELECT a.username, m.role FROM guild_members m JOIN accounts a ON a.id=m.account_id
       WHERE m.guild_id=$1 ORDER BY (m.role='founder') DESC, m.joined_at ASC`, [guildId])
    return r.rows
  }
  return Object.entries(file.guildMembers)
    .filter(([, m]) => m.guild_id === guildId)
    .map(([aid, m]) => ({ username: (file.accounts.find((a) => a.id === +aid) || {}).username, role: m.role }))
    .sort((a, b) => (b.role === 'founder') - (a.role === 'founder'))
}
// Ranking público: gremios por nivel y oro donado, con conteo de miembros.
export async function listGuilds(limit = 20) {
  if (pg) {
    const r = await pg.query(
      `SELECT g.*, (SELECT count(*)::int FROM guild_members m WHERE m.guild_id=g.id) AS members
       FROM guilds g ORDER BY g.level DESC, g.donated DESC, g.created_at ASC LIMIT $1`, [limit])
    return r.rows
  }
  return file.guilds
    .map((g) => ({ ...g, members: Object.values(file.guildMembers).filter((m) => m.guild_id === g.id).length }))
    .sort((a, b) => b.level - a.level || b.donated - a.donated || a.id - b.id)
    .slice(0, limit)
}

// --- Contrato semanal del gremio ---
// Suma `inc` al progreso del contrato de la semana `week`. Si la semana guardada difiere,
// reinicia el progreso (contrato nuevo). Devuelve el progreso resultante, o null si no existe.
export async function bumpContract(guildId, week, inc) {
  if (pg) {
    const r = await pg.query(
      `UPDATE guilds SET
         contract_progress = CASE WHEN contract_week = $2 THEN contract_progress ELSE 0 END + $3,
         contract_week = $2
       WHERE id = $1 RETURNING contract_progress`, [guildId, week, inc])
    return r.rows[0]?.contract_progress ?? null
  }
  const g = file.guilds.find((x) => x.id === guildId)
  if (!g) return null
  g.contract_progress = (g.contract_week === week ? (g.contract_progress || 0) : 0) + inc
  g.contract_week = week
  flush()
  return g.contract_progress
}

// --- Depósito del Gremio (banco compartido) ---
export async function getDeposit(guildId) {
  if (pg) {
    const r = await pg.query('SELECT gold, items FROM guild_deposit WHERE guild_id=$1', [guildId])
    return r.rows[0] || { gold: 0, items: [] }
  }
  return file.guildDeposit[guildId] || { gold: 0, items: [] }
}
export async function setDeposit(guildId, { gold, items }) {
  if (pg) {
    await pg.query(
      `INSERT INTO guild_deposit (guild_id, gold, items) VALUES ($1,$2,$3)
       ON CONFLICT (guild_id) DO UPDATE SET gold=$2, items=$3`,
      [guildId, gold | 0, JSON.stringify(items || [])])
    return
  }
  file.guildDeposit[guildId] = { gold: gold | 0, items: items || [] }
  flush()
}
