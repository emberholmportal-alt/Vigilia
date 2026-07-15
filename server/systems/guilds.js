// Gremios (WORLD.md): estructura persistente con la que el mundo interactúa, no un chat con
// nombre. Fundar cuesta 500 de oro; el nivel sube donando oro; el ranking es público.
//
// Autoridad del oro: la fuente de verdad del oro es el blob del personaje persistido. El server
// lo lee/descuenta acá (getCharacterGold / setCharacterGold), así fundar y donar son
// server-autoritativos: el cliente guarda su estado, pide la operación y el server confirma el
// oro resultante. El cliente adopta ese oro.
import * as db from '../db/db.js'

export const FOUND_COST = 500

// Umbrales de oro DONADO acumulado por nivel (nivel 1 al fundar; cap 5). Ver ventajas en WORLD.md:
// n1 +oro de botín · n2 +defensa a todos · n3 +XP compartida · n4 Depósito · n5 estandarte.
const LEVEL_THRESHOLDS = [0, 1500, 5000, 12000, 30000] // índice 0 => nivel 1
export const MAX_LEVEL = LEVEL_THRESHOLDS.length

export function levelForDonated(donated) {
  let lvl = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (donated >= LEVEL_THRESHOLDS[i]) lvl = i + 1
  return Math.min(lvl, MAX_LEVEL)
}
// Oro que falta para el siguiente nivel (0 si está al tope).
export function nextThreshold(level) {
  return level >= MAX_LEVEL ? null : LEVEL_THRESHOLDS[level]
}

// Vista pública de un gremio (lo que ve el cliente).
function pubGuild(g) {
  if (!g) return null
  return {
    id: g.id, name: g.name, tag: g.tag, color: g.color || '#c9a227',
    level: g.level, donated: Number(g.donated) || 0,
    next: nextThreshold(g.level),
  }
}

function validName(name) {
  const n = String(name || '').trim()
  if (n.length < 3 || n.length > 24) return null
  if (!/^[\p{L}0-9 ''.-]+$/u.test(n)) return null
  return n
}
function validTag(tag) {
  const t = String(tag || '').trim().toUpperCase()
  return /^[A-Z0-9]{3}$/.test(t) ? t : null
}
function validColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(String(color || '')) ? color : '#c9a227'
}

// Info de gremio + miembros (para el panel). guildId opcional: si no, usa el del jugador.
export async function info(accountId, guildId) {
  const mem = await db.getGuildMembership(accountId)
  const id = guildId || mem?.guild_id
  if (!id) return { ok: true, guild: null, mine: null, members: [] }
  const g = await db.getGuild(id)
  if (!g) return { ok: true, guild: null, mine: null, members: [] }
  const members = await db.guildMembers(id)
  return { ok: true, guild: pubGuild(g), members, mine: mem?.guild_id === id ? (mem.role || 'member') : null }
}

// Ranking público.
export async function ranking(limit = 20) {
  const rows = await db.listGuilds(limit)
  return { ok: true, guilds: rows.map((g) => ({ ...pubGuild(g), members: g.members | 0 })) }
}

// Fundar un gremio. Cobra FOUND_COST del oro persistido del fundador.
export async function create(accountId, { name, tag, color }) {
  if (await db.getGuildMembership(accountId)) return { ok: false, error: 'ya pertenecés a un gremio' }
  const n = validName(name); if (!n) return { ok: false, error: 'nombre inválido (3 a 24 caracteres)' }
  const t = validTag(tag); if (!t) return { ok: false, error: 'la sigla debe ser 3 letras o números' }
  const c = validColor(color)
  if (await db.findGuildByName(n)) return { ok: false, error: 'ya existe un gremio con ese nombre' }
  if (await db.findGuildByTag(t)) return { ok: false, error: 'ya existe un gremio con esa sigla' }
  const gold = await db.getCharacterGold(accountId)
  if (gold < FOUND_COST) return { ok: false, error: `necesitás ${FOUND_COST} de oro para fundar` }
  const newGold = gold - FOUND_COST
  await db.setCharacterGold(accountId, newGold)
  const g = await db.createGuild({ name: n, tag: t, color: c, founder: accountId })
  await db.setGuildMembership(accountId, g.id, 'founder')
  return { ok: true, guild: pubGuild(g), gold: newGold, role: 'founder' }
}

// Unirse a un gremio por id o sigla.
export async function join(accountId, { guildId, tag }) {
  if (await db.getGuildMembership(accountId)) return { ok: false, error: 'ya pertenecés a un gremio' }
  const g = guildId ? await db.getGuild(guildId) : await db.findGuildByTag(tag)
  if (!g) return { ok: false, error: 'ese gremio no existe' }
  await db.setGuildMembership(accountId, g.id, 'member')
  return { ok: true, guild: pubGuild(g), role: 'member' }
}

// Salir del gremio. Si era el último miembro, el gremio se disuelve.
export async function leave(accountId) {
  const mem = await db.getGuildMembership(accountId)
  if (!mem) return { ok: false, error: 'no estás en un gremio' }
  await db.removeGuildMembership(accountId)
  const left = await db.guildMemberCount(mem.guild_id)
  return { ok: true, disbanded: left === 0 }
}

// Donar oro al gremio: descuenta del oro persistido y sube el nivel según el total donado.
export async function donate(accountId, amount) {
  const amt = Math.floor(Number(amount) || 0)
  if (amt <= 0) return { ok: false, error: 'monto inválido' }
  const mem = await db.getGuildMembership(accountId)
  if (!mem) return { ok: false, error: 'no estás en un gremio' }
  const gold = await db.getCharacterGold(accountId)
  if (gold < amt) return { ok: false, error: 'no tenés tanto oro' }
  const g = await db.getGuild(mem.guild_id)
  if (!g) return { ok: false, error: 'ese gremio no existe' }
  const newGold = gold - amt
  await db.setCharacterGold(accountId, newGold)
  const newDonated = (Number(g.donated) || 0) + amt
  const newLevel = levelForDonated(newDonated)
  const updated = await db.addGuildDonation(g.id, amt, newLevel)
  return { ok: true, guild: pubGuild(updated), gold: newGold, leveledUp: newLevel > g.level }
}
