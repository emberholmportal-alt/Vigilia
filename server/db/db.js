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
      );
      CREATE TABLE IF NOT EXISTS market_listings (
        id SERIAL PRIMARY KEY,
        seller INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        seller_name TEXT,
        item JSONB NOT NULL,
        price BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS player_stash (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        items JSONB DEFAULT '[]'::jsonb,
        gold BIGINT DEFAULT 0
      );`)
    // Migración: sumar la columna de oro del alijo a tablas ya creadas sin ella.
    await pg.query(`ALTER TABLE player_stash ADD COLUMN IF NOT EXISTS gold BIGINT DEFAULT 0;`)
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
  if (!file.market) file.market = []                 // [{id, seller, seller_name, item, price, created_at, expires_at}]
  if (!file.stash) file.stash = {}                   // account_id -> items[] (alijo privado)
  if (!file.stashGold) file.stashGold = {}           // account_id -> gold (bóveda del alijo)
  if (file.marketSeq == null) file.marketSeq = file.market.reduce((m, l) => Math.max(m, l.id), 0) + 1
  if (file.guildSeq == null) file.guildSeq = file.guilds.reduce((m, g) => Math.max(m, g.id), 0) + 1
  seq = file.accounts.reduce((m, a) => Math.max(m, a.id), 0) + 1
  console.log('[db] Sin DATABASE_URL: usando archivo local (' + DATA_FILE + ')')
}

function flush() {
  if (pg) return
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(file)) } catch (e) { console.error('[db] flush', e.message) }
}

// --- Serialización de escrituras por clave (cuenta / gremio) --------------------------------
// El oro y el stash tienen VARIOS escritores concurrentes: el autosave del cliente (blob entero),
// las donaciones/depósitos del gremio (descuento server) y los depósitos compartidos entre
// miembros. Sin coordinar, dos operaciones se pisan en la ventana entre el `await` de lectura y
// el de escritura -> se duplica o se corrompe oro/ítems. Esta cola serializa las escrituras por
// clave (una cuenta, un gremio) sin bloquear el resto del servidor.
const _locks = new Map()   // clave -> cola (promesa "tail" que nunca rechaza)
export function withLock(key, fn) {
  const prev = _locks.get(key) || Promise.resolve()
  const next = prev.then(fn, fn)                  // corre fn cuando el anterior se asienta
  const tail = next.then(() => {}, () => {})      // cola que nunca rechaza (mantiene la cadena viva)
  _locks.set(key, tail)
  tail.then(() => { if (_locks.get(key) === tail) _locks.delete(key) })   // limpia si nadie encoló detrás
  return next
}
export const withAccountLock = (accountId, fn) => withLock('a:' + accountId, fn)
export const withGuildLock = (guildId, fn) => withLock('g:' + guildId, fn)

// Mutación ATÓMICA del oro del personaje bajo el lock de la cuenta. `apply(gold)` recibe el oro
// actual y devuelve el nuevo, o null/negativo para abortar (p.ej. saldo insuficiente). Así el
// descuento de gremios no puede interleaveearse con un autosave del cliente. Devuelve
// { ok, gold, error? }.
export function updateCharacterGold(accountId, apply) {
  return withAccountLock(accountId, async () => {
    const ch = await loadCharacter(accountId)
    if (!ch) return { ok: false, error: 'sin personaje' }
    const cur = Math.floor(Number(ch.data?.gold) || 0)
    const nextGold = apply(cur)
    if (nextGold == null || !Number.isFinite(nextGold) || nextGold < 0) return { ok: false, error: 'oro insuficiente', gold: cur }
    const data = { ...(ch.data || {}), gold: Math.floor(nextGold) }
    await saveCharacter(accountId, { name: ch.name, race: ch.race, data })
    return { ok: true, gold: Math.floor(nextGold) }
  })
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
// Todos los personajes persistidos: [{ accountId, data }]. Para migraciones batch al arranque.
export async function allCharacters() {
  if (pg) {
    const r = await pg.query('SELECT account_id, data FROM characters')
    return r.rows.map((row) => ({ accountId: row.account_id, data: row.data || {} }))
  }
  return Object.entries(file.chars || {}).map(([aid, ch]) => ({ accountId: Number(aid), data: (ch && ch.data) || {} }))
}

// ---------- Gremios ----------
// El oro de fundación/donación lo descuenta el server del blob persistido del personaje
// (la única fuente de verdad del oro), no del cliente. Ver server/systems/guilds.js.

// Sólo el oro del blob del personaje, para validar donaciones sin cargar todo. Devuelve número.
// (`Math.floor(Number())` en vez de `| 0`: `| 0` trunca a int32 y envuelve a negativo con oro
// ≥ 2.147.483.648, rompiendo los chequeos `oro < monto`.)
export async function getCharacterGold(accountId) {
  const ch = await loadCharacter(accountId)
  return Math.floor(Number(ch?.data?.gold) || 0)
}

// Escribe el oro del blob del personaje (descuento de fundación/donación), preservando el resto.
// Bajo el lock de la cuenta para no pisarse con el autosave del cliente. Para descuentos
// condicionados al saldo usá `updateCharacterGold` (lee y escribe atómico).
export async function setCharacterGold(accountId, gold) {
  return withAccountLock(accountId, async () => {
    const ch = await loadCharacter(accountId)
    if (!ch) return false
    const data = { ...(ch.data || {}), gold: Math.floor(Number(gold) || 0) }
    await saveCharacter(accountId, { name: ch.name, race: ch.race, data })
    return true
  })
}

// Escribe el inventario (bag) autoritativo del server al blob del personaje, preservando el resto.
// Bajo el lock de la cuenta para no pisarse con el autosave del cliente.
export async function setCharacterInventory(accountId, inv) {
  return withAccountLock(accountId, async () => {
    const ch = await loadCharacter(accountId)
    if (!ch) return false
    const data = { ...(ch.data || {}), inventory: Array.isArray(inv) ? inv : [] }
    await saveCharacter(accountId, { name: ch.name, race: ch.race, data })
    return true
  })
}

// Escribe el ledger "checkout" AUTORITATIVO del server (Fase A.3): objeto {id: cuenta} de lo que el
// jugador tiene fuera del bag y puede devolver. Persistirlo evita que un save manipulado lo infle.
export async function setCharacterLedger(accountId, ledger) {
  return withAccountLock(accountId, async () => {
    const ch = await loadCharacter(accountId)
    if (!ch) return false
    const data = { ...(ch.data || {}), _outLedger: (ledger && typeof ledger === 'object') ? ledger : {} }
    await saveCharacter(accountId, { name: ch.name, race: ch.race, data })
    return true
  })
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

// --- Alijo privado por cuenta (personal, sólo el dueño) ---
export async function getStash(accountId) {
  if (pg) {
    const r = await pg.query('SELECT items FROM player_stash WHERE account_id=$1', [accountId])
    return (r.rows[0] && r.rows[0].items) || []
  }
  return file.stash[accountId] || []
}
export async function setStash(accountId, items) {
  if (pg) {
    await pg.query(
      `INSERT INTO player_stash (account_id, items) VALUES ($1,$2)
       ON CONFLICT (account_id) DO UPDATE SET items=$2`,
      [accountId, JSON.stringify(items || [])])
    return
  }
  file.stash[accountId] = items || []
  flush()
}

// Oro guardado en el alijo (bóveda personal). Se mueve contra el oro VIVO del jugador (rooms), no
// contra el oro persistido del personaje, así no desincroniza con la sesión.
export async function getStashGold(accountId) {
  if (pg) {
    const r = await pg.query('SELECT gold FROM player_stash WHERE account_id=$1', [accountId])
    return Math.floor(Number(r.rows[0] && r.rows[0].gold) || 0)
  }
  return Math.floor(Number(file.stashGold[accountId]) || 0)
}
export async function setStashGold(accountId, gold) {
  const g = Math.max(0, Math.floor(Number(gold) || 0))
  if (pg) {
    await pg.query(
      `INSERT INTO player_stash (account_id, gold) VALUES ($1,$2)
       ON CONFLICT (account_id) DO UPDATE SET gold=$2`,
      [accountId, g])
    return
  }
  file.stashGold[accountId] = g
  flush()
}

// --- Mercado (casa de subastas, precio fijo, global) ---
// Todos los listados activos (los vencidos los limpia el barrido del sistema de mercado).
export async function marketAll() {
  if (pg) { const r = await pg.query('SELECT id, seller, seller_name, item, price, created_at, expires_at FROM market_listings ORDER BY id DESC'); return r.rows.map((l) => ({ ...l, price: Number(l.price), created_at: Number(l.created_at), expires_at: Number(l.expires_at) })) }
  return file.market.slice().reverse()
}
export async function marketBySeller(accountId) {
  if (pg) { const r = await pg.query('SELECT id, seller, seller_name, item, price, created_at, expires_at FROM market_listings WHERE seller=$1', [accountId]); return r.rows.map((l) => ({ ...l, price: Number(l.price), created_at: Number(l.created_at), expires_at: Number(l.expires_at) })) }
  return file.market.filter((l) => l.seller === accountId)
}
export async function marketAdd({ seller, sellerName, item, price, createdAt, expiresAt }) {
  if (pg) { const r = await pg.query('INSERT INTO market_listings (seller, seller_name, item, price, created_at, expires_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [seller, sellerName || '', JSON.stringify(item), price | 0, createdAt, expiresAt]); return r.rows[0].id }
  const id = file.marketSeq++; file.market.push({ id, seller, seller_name: sellerName || '', item, price: price | 0, created_at: createdAt, expires_at: expiresAt }); flush(); return id
}
// Reclama (saca+devuelve) un listado de forma ATÓMICA. Si dos compradores corren, sólo uno lo obtiene.
export async function marketClaim(id) {
  if (pg) { const r = await pg.query('DELETE FROM market_listings WHERE id=$1 RETURNING id, seller, seller_name, item, price, created_at, expires_at', [id | 0]); const l = r.rows[0]; return l ? { ...l, price: Number(l.price), created_at: Number(l.created_at), expires_at: Number(l.expires_at) } : null }
  const i = file.market.findIndex((l) => l.id === (id | 0)); if (i < 0) return null; const [l] = file.market.splice(i, 1); flush(); return l
}
// Agrega un ítem al inventario (bag) persistido de un personaje OFFLINE (devolución de vencidos).
// Al primer hueco libre dentro de las 55 celdas; si no entra, se pierde (raro: bag lleno + offline).
export async function addToCharacterInventory(accountId, rec) {
  return withAccountLock(accountId, async () => {
    const ch = await loadCharacter(accountId); if (!ch) return false
    const inv = Array.isArray(ch.data?.inventory) ? ch.data.inventory.slice() : []
    while (inv.length < 55) inv.push(null)
    let at = inv.findIndex((x) => x == null); if (at < 0) return false
    inv[at] = rec
    const data = { ...(ch.data || {}), inventory: inv }
    await saveCharacter(accountId, { name: ch.name, race: ch.race, data })
    return true
  })
}

// --- Movimientos de oro ATÓMICOS entre el personaje (JSONB) y el gremio/depósito -------------
// El oro del personaje y el del gremio/depósito son filas distintas; moverlos con dos escrituras
// sueltas puede perder o duplicar oro si algo falla en el medio. En Postgres se hace en UNA
// transacción con SELECT ... FOR UPDATE (lockea las filas); en el backend de archivo, bajo los
// locks + un solo flush (dev). Devuelven { ok, gold, ... } o { ok:false, error }.
async function _txReadChar(c, accountId) {
  const r = await c.query('SELECT data FROM characters WHERE account_id=$1 FOR UPDATE', [accountId])
  if (!r.rows[0]) return null
  return { data: r.rows[0].data || {}, gold: Math.floor(Number(r.rows[0].data?.gold) || 0) }
}
const _txWriteCharGold = (c, accountId, data, gold) =>
  c.query('UPDATE characters SET data=$2, updated_at=now() WHERE account_id=$1', [accountId, { ...data, gold: Math.floor(gold) }])
const _txUpsertDeposit = (c, guildId, gold, items) =>
  c.query(`INSERT INTO guild_deposit (guild_id, gold, items) VALUES ($1,$2,$3)
           ON CONFLICT (guild_id) DO UPDATE SET gold=$2, items=$3`, [guildId, gold | 0, JSON.stringify(items || [])])

// Donar: personaje -> pozo del gremio (donated += amt, nivel recalculado por levelFn).
export async function txDonate(accountId, guildId, amt, levelFn) {
  amt = Math.floor(amt)
  if (pg) {
    const c = await pg.connect()
    try {
      await c.query('BEGIN')
      const ch = await _txReadChar(c, accountId)
      if (!ch) { await c.query('ROLLBACK'); return { ok: false, error: 'sin personaje' } }
      if (ch.gold < amt) { await c.query('ROLLBACK'); return { ok: false, error: 'no tenés tanto oro' } }
      await _txWriteCharGold(c, accountId, ch.data, ch.gold - amt)
      const gr = await c.query('SELECT donated, level FROM guilds WHERE id=$1 FOR UPDATE', [guildId])
      if (!gr.rows[0]) { await c.query('ROLLBACK'); return { ok: false, error: 'ese gremio no existe' } }
      const prevLevel = gr.rows[0].level
      const newLevel = levelFn((Number(gr.rows[0].donated) || 0) + amt)
      const ug = await c.query('UPDATE guilds SET donated=donated+$2, level=$3 WHERE id=$1 RETURNING *', [guildId, amt, newLevel])
      await c.query('COMMIT')
      return { ok: true, gold: ch.gold - amt, guild: ug.rows[0], leveledUp: newLevel > prevLevel }
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e } finally { c.release() }
  }
  return withGuildLock(guildId, () => withAccountLock(accountId, async () => {
    const ch = file.chars[accountId]
    if (!ch) return { ok: false, error: 'sin personaje' }
    const gold = Math.floor(Number(ch.data?.gold) || 0)
    if (gold < amt) return { ok: false, error: 'no tenés tanto oro' }
    const g = file.guilds.find((x) => x.id === guildId)
    if (!g) return { ok: false, error: 'ese gremio no existe' }
    ch.data.gold = gold - amt
    const prevLevel = g.level
    g.donated = (Number(g.donated) || 0) + amt
    g.level = levelFn(g.donated)
    flush()
    return { ok: true, gold: gold - amt, guild: { ...g }, leveledUp: g.level > prevLevel }
  }))
}

// Depositar: personaje -> banco del gremio (guild_deposit.gold += amt).
export async function txDepositGold(accountId, guildId, amt) {
  amt = Math.floor(amt)
  if (pg) {
    const c = await pg.connect()
    try {
      await c.query('BEGIN')
      const ch = await _txReadChar(c, accountId)
      if (!ch) { await c.query('ROLLBACK'); return { ok: false, error: 'sin personaje' } }
      if (ch.gold < amt) { await c.query('ROLLBACK'); return { ok: false, error: 'no tenés tanto oro' } }
      await _txWriteCharGold(c, accountId, ch.data, ch.gold - amt)
      const dr = await c.query('SELECT gold, items FROM guild_deposit WHERE guild_id=$1 FOR UPDATE', [guildId])
      const items = dr.rows[0]?.items || []
      const nd = { gold: (Number(dr.rows[0]?.gold) || 0) + amt, items }
      await _txUpsertDeposit(c, guildId, nd.gold, items)
      await c.query('COMMIT')
      return { ok: true, gold: ch.gold - amt, deposit: nd }
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e } finally { c.release() }
  }
  return withGuildLock(guildId, () => withAccountLock(accountId, async () => {
    const ch = file.chars[accountId]
    if (!ch) return { ok: false, error: 'sin personaje' }
    const gold = Math.floor(Number(ch.data?.gold) || 0)
    if (gold < amt) return { ok: false, error: 'no tenés tanto oro' }
    ch.data.gold = gold - amt
    const dep = file.guildDeposit[guildId] || { gold: 0, items: [] }
    const nd = { gold: (Number(dep.gold) || 0) + amt, items: dep.items || [] }
    file.guildDeposit[guildId] = nd; flush()
    return { ok: true, gold: gold - amt, deposit: nd }
  }))
}

// Retirar: banco del gremio -> personaje (guild_deposit.gold -= amt).
export async function txWithdrawGold(accountId, guildId, amt) {
  amt = Math.floor(amt)
  if (pg) {
    const c = await pg.connect()
    try {
      await c.query('BEGIN')
      const dr = await c.query('SELECT gold, items FROM guild_deposit WHERE guild_id=$1 FOR UPDATE', [guildId])
      const curGold = Number(dr.rows[0]?.gold) || 0
      if (curGold < amt) { await c.query('ROLLBACK'); return { ok: false, error: 'el depósito no tiene tanto oro' } }
      const ch = await _txReadChar(c, accountId)
      if (!ch) { await c.query('ROLLBACK'); return { ok: false, error: 'sin personaje' } }
      await _txWriteCharGold(c, accountId, ch.data, ch.gold + amt)
      const items = dr.rows[0]?.items || []
      const nd = { gold: curGold - amt, items }
      await _txUpsertDeposit(c, guildId, nd.gold, items)
      await c.query('COMMIT')
      return { ok: true, gold: ch.gold + amt, deposit: nd }
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e } finally { c.release() }
  }
  return withGuildLock(guildId, () => withAccountLock(accountId, async () => {
    const dep = file.guildDeposit[guildId] || { gold: 0, items: [] }
    if ((Number(dep.gold) || 0) < amt) return { ok: false, error: 'el depósito no tiene tanto oro' }
    const ch = file.chars[accountId]
    if (!ch) return { ok: false, error: 'sin personaje' }
    const gold = Math.floor(Number(ch.data?.gold) || 0)
    ch.data.gold = gold + amt
    const nd = { gold: (Number(dep.gold) || 0) - amt, items: dep.items || [] }
    file.guildDeposit[guildId] = nd; flush()
    return { ok: true, gold: gold + amt, deposit: nd }
  }))
}
