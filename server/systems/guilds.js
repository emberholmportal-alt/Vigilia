// Gremios (WORLD.md): estructura persistente con la que el mundo interactúa, no un chat con
// nombre. Fundar cuesta 500 de oro; el nivel sube donando oro; el ranking es público.
//
// Autoridad del oro: la fuente de verdad del oro es el blob del personaje persistido. El server
// lo lee/descuenta acá (getCharacterGold / setCharacterGold), así fundar y donar son
// server-autoritativos: el cliente guarda su estado, pide la operación y el server confirma el
// oro resultante. El cliente adopta ese oro.
import * as db from '../db/db.js'

export const FOUND_COST = 500

// Umbrales de oro DONADO acumulado por nivel. Los primeros 5 son explícitos (definen cuándo se
// desbloquea cada VENTAJA — n1 +oro de botín · n2 +defensa · n3 +XP · n4 Depósito · n5 estandarte).
// El NIVEL en sí NO tiene tope: pasado el nivel 5, cada +POST_STEP de oro donado suma un nivel más
// (prestigio, sin ventaja nueva). Las ventajas se saturan en el nivel 5.
const LEVEL_THRESHOLDS = [0, 1500, 5000, 12000, 30000] // índice 0 => nivel 1
export const PERK_LEVELS = LEVEL_THRESHOLDS.length      // 5 = último nivel con ventaja nueva
const POST_STEP = 30000                                 // oro donado por cada nivel pasado el 5

export function levelForDonated(donated) {
  const d = Math.max(0, Number(donated) || 0)
  let lvl = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (d >= LEVEL_THRESHOLDS[i]) lvl = i + 1
  const top = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]   // 30000 = nivel 5
  if (d > top) lvl = LEVEL_THRESHOLDS.length + Math.floor((d - top) / POST_STEP)
  return lvl
}
// Oro DONADO acumulado necesario para ALCANZAR el próximo nivel (nunca null: el nivel no topa).
export function nextThreshold(level) {
  const L = Math.max(1, level | 0)
  if (L < LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[L]  // próximo umbral explícito
  const top = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  return top + (L - LEVEL_THRESHOLDS.length + 1) * POST_STEP   // prestigio: +POST_STEP por nivel
}

// ---------- Contrato semanal (WORLD.md) ----------
// Un objetivo compartido del gremio que se renueva cada semana. Determinista: la misma semana
// da el mismo contrato para todos los gremios (como las dailies). El progreso es POR gremio: cada
// miembro que mata enemigos de la categoría suma al contador común. Al completarlo, el gremio
// recibe una recompensa colectiva (oro al pozo -> sube el nivel).
export const NEED_DEPOSIT_LEVEL = 4   // el Depósito se desbloquea a nivel 4 (WORLD.md)
const CONTRACT_REWARD = 2500          // oro al pozo del gremio al completar (empuja el nivel)

const CONTRACTS = [
  { id: 'undead', target: 120, match: (c) => /zombie|undead|skeleton|ghoul|ghost|wraith/i.test(c || '') },
  { id: 'goblin', target: 150, match: (c) => /goblin/i.test(c || '') },
  { id: 'beast',  target: 100, match: (c) => /wolf|bear|spider|antlion|rat|bat|beast|slime/i.test(c || '') },
]

// Clave de semana ISO (año-semana). Usa la fecha del server (Node). Todos los gremios comparten
// la misma clave, así el contrato es el mismo para todos esa semana.
function weekKey(d = new Date()) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)                       // jueves de esta semana
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7)
  return dt.getUTCFullYear() + '-W' + String(week).padStart(2, '0')
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

// Contrato de ESTA semana (mismo para todos).
export function weeklyContract() {
  const wk = weekKey()
  const c = CONTRACTS[hashStr(wk) % CONTRACTS.length]
  return { week: wk, id: c.id, target: c.target }
}
function contractMatches(category) {
  const wk = weekKey()
  const c = CONTRACTS[hashStr(wk) % CONTRACTS.length]
  return c.match(category)
}
// Estado del contrato para un gremio (progreso de ESTA semana; si la guardada difiere, 0).
function contractStatus(g) {
  const wc = weeklyContract()
  const progress = g.contract_week === wc.week ? Math.min(wc.target, g.contract_progress || 0) : 0
  return { id: wc.id, target: wc.target, progress, done: progress >= wc.target, reward: CONTRACT_REWARD }
}

// Cache en memoria de a qué gremio pertenece cada cuenta (para no pegarle a la DB en cada kill).
// Se invalida al fundar/unirse/salir.
const guildCache = new Map()   // accountId -> guildId | null
export function invalidateGuildCache(accountId) { guildCache.delete(accountId) }
async function cachedGuildId(accountId) {
  if (guildCache.has(accountId)) return guildCache.get(accountId)
  const mem = await db.getGuildMembership(accountId)
  const id = mem?.guild_id || null
  guildCache.set(accountId, id)
  return id
}

// Acredita una kill al contrato del gremio del matador (lo llama la simulación de combate).
// No await en el hot-path: fire-and-forget con catch. Devuelve el resultado (o null).
export async function onKill(accountId, category) {
  if (!accountId || !contractMatches(category)) return null
  const guildId = await cachedGuildId(accountId)
  if (!guildId) return null
  const wc = weeklyContract()
  const before = (await db.getGuild(guildId))?.contract_progress || 0
  const wasWeek = (await db.getGuild(guildId))?.contract_week
  const progress = await db.bumpContract(guildId, wc.week, 1)
  if (progress == null) return null
  db.bumpMemberContract(accountId, wc.week, 1).catch(() => {})   // aporte individual al contrato (esta semana)
  // ¿recién se completó? (cruzó el target esta semana) -> recompensa colectiva.
  const prevInWeek = wasWeek === wc.week ? before : 0
  if (prevInWeek < wc.target && progress >= wc.target) {
    const g = await db.getGuild(guildId)
    const newDonated = (Number(g.donated) || 0) + CONTRACT_REWARD
    await db.addGuildDonation(guildId, CONTRACT_REWARD, levelForDonated(newDonated))
    return { guildId, completed: true }
  }
  return { guildId, progress }
}

// Vista pública de un gremio (lo que ve el cliente).
function pubGuild(g) {
  if (!g) return null
  return {
    id: g.id, name: g.name, tag: g.tag, color: g.color || '#c9a227',
    level: g.level, donated: Number(g.donated) || 0,
    next: nextThreshold(g.level),
    contract: contractStatus(g),
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
  const wc = weeklyContract()
  const members = (await db.guildMembers(id)).map((m) => ({
    account_id: m.account_id, username: m.username, role: m.role,
    donated: m.donated || 0, kills: m.contract_week === wc.week ? (m.contract_kills || 0) : 0,   // aporte al contrato de ESTA semana
  }))
  return { ok: true, guild: pubGuild(g), members, mine: mem?.guild_id === id ? (mem.role || 'member') : null, you: accountId }
}

// Poder del gremio: cinco ejes, todos server-autoritativos y SIN TOPE, así el ranking siempre
// puede seguir subiendo.
//   Poder = Σniveles×10 + promedioNivel×30 + miembros×10 + nivelGremio×40 + floor(donado/500)
// - Σniveles: suma del nivel de personaje (experiencia) de cada miembro — fuerza colectiva (ya
//   crece con el tamaño, por eso miembros pesa poco: para no premiar el tamaño dos veces).
// - promedioNivel: nivel medio de los miembros — calidad del roster (la mejor señal anti-alt).
// - miembros: cantidad de miembros — tamaño del gremio (bonus modesto).
// - nivelGremio: nivel institucional del gremio (sin tope: sube donando; cada nivel es caro).
// - donado: oro donado acumulado al pozo (sin techo).
export function guildPower({ sumLevels = 0, members = 0, level = 1, donated = 0 }) {
  const avg = members > 0 ? sumLevels / members : 0
  return Math.round(
    Math.max(0, sumLevels) * 10 + avg * 30 + Math.max(0, members) * 10 +
    Math.max(1, level) * 40 + Math.floor(Math.max(0, donated) / 500))
}

// Ranking público, ordenado por Poder. El límite lo pide el cliente; lo acotamos server-side
// (1..200) para no filtrar toda la tabla de un pedido malicioso. Cada fila trae el desglose del
// Poder (nivel de gremio, miembros, Σniveles, oro donado) para mostrarlo en el ranking.
export async function ranking(limit = 20) {
  const lim = Math.max(1, Math.min(200, (limit | 0) || 20))
  const rows = await db.listGuildsWithStats()
  const scored = rows.map((g) => {
    const members = g.members | 0
    const sumLevels = g.sumLevels | 0
    return {
      ...pubGuild(g), members, sumLevels,
      avgLevel: members > 0 ? Math.round((sumLevels / members) * 10) / 10 : 0,
      power: guildPower({ sumLevels, members, level: g.level, donated: Number(g.donated) || 0 }),
    }
  })
  scored.sort((a, b) => b.power - a.power || b.level - a.level || a.id - b.id)
  return { ok: true, guilds: scored.slice(0, lim) }
}

// Fundar un gremio. Cobra FOUND_COST del oro persistido del fundador.
export async function create(accountId, { name, tag, color }) {
  if (await db.getGuildMembership(accountId)) return { ok: false, error: 'ya pertenecés a un gremio' }
  const n = validName(name); if (!n) return { ok: false, error: 'nombre inválido (3 a 24 caracteres)' }
  const t = validTag(tag); if (!t) return { ok: false, error: 'la sigla debe ser 3 letras o números' }
  const c = validColor(color)
  if (await db.findGuildByName(n)) return { ok: false, error: 'ya existe un gremio con ese nombre' }
  if (await db.findGuildByTag(t)) return { ok: false, error: 'ya existe un gremio con esa sigla' }
  // Cobra el costo de forma atómica (lee+descuenta bajo el lock de la cuenta): no se puede fundar
  // dos gremios con el mismo oro por dos pedidos simultáneos.
  const paid = await db.updateCharacterGold(accountId, (gold) => gold >= FOUND_COST ? gold - FOUND_COST : null)
  if (!paid.ok) return { ok: false, error: `necesitás ${FOUND_COST} de oro para fundar` }
  const g = await db.createGuild({ name: n, tag: t, color: c, founder: accountId })
  await db.setGuildMembership(accountId, g.id, 'founder')
  invalidateGuildCache(accountId)
  return { ok: true, guild: pubGuild(g), gold: paid.gold, role: 'founder' }
}

// Unirse a un gremio por id o sigla.
export async function join(accountId, { guildId, tag }) {
  if (await db.getGuildMembership(accountId)) return { ok: false, error: 'ya pertenecés a un gremio' }
  const g = guildId ? await db.getGuild(guildId) : await db.findGuildByTag(tag)
  if (!g) return { ok: false, error: 'ese gremio no existe' }
  await db.setGuildMembership(accountId, g.id, 'member')
  invalidateGuildCache(accountId)
  return { ok: true, guild: pubGuild(g), role: 'member' }
}

// Salir del gremio. Si era el último miembro, el gremio se disuelve. Si se va el FUNDADOR y quedan
// miembros, el liderazgo pasa al más antiguo (oficiales primero) para no dejar el gremio huérfano.
export async function leave(accountId) {
  const mem = await db.getGuildMembership(accountId)
  if (!mem) return { ok: false, error: 'no estás en un gremio' }
  if (mem.role === 'founder') {
    const others = (await db.guildMembers(mem.guild_id)).filter((m) => m.account_id !== accountId)
    if (others.length) {   // guildMembers ya ordena fundador>oficial>miembro, luego por antigüedad
      const heir = others[0]
      await db.setMemberRole(heir.account_id, 'founder')
      await db.setGuildFounder(mem.guild_id, heir.account_id)
    }
  }
  await db.removeGuildMembership(accountId)
  invalidateGuildCache(accountId)
  const left = await db.guildMemberCount(mem.guild_id)
  return { ok: true, disbanded: left === 0 }
}

// ---------- Invitaciones (fundador + oficiales invitan; el ingreso por sigla sigue abierto) ----------
// Invitación pendiente en memoria por cuenta objetivo. Caduca a los 2 minutos. El accept la consume
// server-side, así nadie se une "aceptando" una invitación que no recibió.
const invites = new Map()   // targetAccountId -> { guildId, from, at }
const INVITE_TTL = 120 * 1000
export async function invite(inviterAccountId, targetAccountId) {
  const a = await db.getGuildMembership(inviterAccountId)
  if (!a || (a.role !== 'founder' && a.role !== 'officer')) return { ok: false, error: 'sólo el fundador y los oficiales invitan' }
  if (inviterAccountId === targetAccountId) return { ok: false, error: 'no podés invitarte' }
  if (await db.getGuildMembership(targetAccountId)) return { ok: false, error: 'ese jugador ya está en un gremio' }
  const g = await db.getGuild(a.guild_id)
  if (!g) return { ok: false, error: 'gremio inexistente' }
  invites.set(targetAccountId, { guildId: g.id, from: inviterAccountId, at: Date.now() })
  return { ok: true, guild: { id: g.id, name: g.name, tag: g.tag, color: g.color || '#c9a227' } }
}
export async function acceptInvite(accountId) {
  const inv = invites.get(accountId)
  if (!inv) return { ok: false, error: 'no tenés invitaciones' }
  invites.delete(accountId)
  if (Date.now() - inv.at > INVITE_TTL) return { ok: false, error: 'la invitación caducó' }
  if (await db.getGuildMembership(accountId)) return { ok: false, error: 'ya estás en un gremio' }
  const g = await db.getGuild(inv.guildId)
  if (!g) return { ok: false, error: 'ese gremio ya no existe' }
  await db.setGuildMembership(accountId, g.id, 'member')
  invalidateGuildCache(accountId)
  return { ok: true, guild: pubGuild(g), role: 'member' }
}
export function declineInvite(accountId) { invites.delete(accountId); return { ok: true } }

// Sigla del gremio de una cuenta (para el estandarte sobre la cabeza), o null.
export async function tagOf(accountId) {
  const mem = await db.getGuildMembership(accountId)
  if (!mem) return null
  const g = await db.getGuild(mem.guild_id)
  return g ? g.tag : null
}

// Datos para difundir un mensaje al chat del gremio: la sigla + los ids de cuenta de todos los
// miembros (para que rooms difunda a los que estén online). null si no está en un gremio.
export async function chatInfo(accountId) {
  const mem = await db.getGuildMembership(accountId)
  if (!mem) return null
  const g = await db.getGuild(mem.guild_id)
  if (!g) return null
  const members = await db.guildMembers(mem.guild_id)
  return { tag: g.tag, ids: members.map((x) => x.account_id) }
}

// ---------- Gestión de miembros (roles: founder > officer > member) ----------
// El fundador asciende/desciende oficiales y transfiere el liderazgo. Fundador y oficiales expulsan;
// nadie expulsa al fundador; un oficial no expulsa a otro oficial.
export async function setRole(actorId, targetId, role) {
  if (role !== 'officer' && role !== 'member') return { ok: false, error: 'rol inválido' }
  const a = await db.getGuildMembership(actorId)
  if (!a || a.role !== 'founder') return { ok: false, error: 'sólo el fundador cambia rangos' }
  if (actorId === targetId) return { ok: false, error: 'no podés cambiar tu propio rango' }
  const t = await db.getGuildMembership(targetId)
  if (!t || t.guild_id !== a.guild_id) return { ok: false, error: 'no está en tu gremio' }
  if (t.role === 'founder') return { ok: false, error: 'no podés cambiar al fundador' }
  await db.setMemberRole(targetId, role)
  return { ok: true, guildId: a.guild_id }
}
export async function kick(actorId, targetId) {
  const a = await db.getGuildMembership(actorId)
  if (!a || (a.role !== 'founder' && a.role !== 'officer')) return { ok: false, error: 'no tenés permiso' }
  if (actorId === targetId) return { ok: false, error: 'para irte usá "salir"' }
  const t = await db.getGuildMembership(targetId)
  if (!t || t.guild_id !== a.guild_id) return { ok: false, error: 'no está en tu gremio' }
  if (t.role === 'founder') return { ok: false, error: 'no podés expulsar al fundador' }
  if (a.role === 'officer' && t.role === 'officer') return { ok: false, error: 'un oficial no expulsa a otro oficial' }
  await db.removeGuildMembership(targetId)
  invalidateGuildCache(targetId)
  return { ok: true, guildId: a.guild_id, kicked: targetId }
}
export async function transfer(actorId, targetId) {
  const a = await db.getGuildMembership(actorId)
  if (!a || a.role !== 'founder') return { ok: false, error: 'sólo el fundador transfiere el liderazgo' }
  if (actorId === targetId) return { ok: false, error: 'ya sos el fundador' }
  const t = await db.getGuildMembership(targetId)
  if (!t || t.guild_id !== a.guild_id) return { ok: false, error: 'no está en tu gremio' }
  await db.setMemberRole(targetId, 'founder')
  await db.setMemberRole(actorId, 'officer')
  await db.setGuildFounder(a.guild_id, targetId)
  return { ok: true, guildId: a.guild_id }
}

// Donar oro al gremio: descuenta del oro persistido y sube el nivel según el total donado.
export async function donate(accountId, amount) {
  const amt = Math.floor(Number(amount) || 0)
  if (amt <= 0) return { ok: false, error: 'monto inválido' }
  const mem = await db.getGuildMembership(accountId)
  if (!mem) return { ok: false, error: 'no estás en un gremio' }
  // Descuento del personaje + crédito al gremio en UNA transacción (dos filas): un crash en el
  // medio ya no puede perder ni duplicar el oro. (OJO: no evita que un autosave del cliente con
  // oro viejo pise el descuento — eso es economía server-autoritativa, pendiente con la $VEL.)
  const r = await db.txDonate(accountId, mem.guild_id, amt, levelForDonated)
  if (!r.ok) return r
  db.bumpMemberDonated(accountId, amt).catch(() => {})   // contribución individual (display, fire-and-forget)
  return { ok: true, guild: pubGuild(r.guild), gold: r.gold, leveledUp: r.leveledUp }
}

// ---------- Depósito del Gremio (banco compartido, desbloquea a nivel 4) ----------
const DEPOSIT_MAX_ITEMS = 40

// Chequea membresía + nivel; devuelve { g, mem } o { error }.
async function depositGuard(accountId) {
  const mem = await db.getGuildMembership(accountId)
  if (!mem) return { error: 'no estás en un gremio' }
  const g = await db.getGuild(mem.guild_id)
  if (!g) return { error: 'ese gremio no existe' }
  if (g.level < NEED_DEPOSIT_LEVEL) return { error: `el Depósito se desbloquea a nivel ${NEED_DEPOSIT_LEVEL}` }
  return { g, mem }
}

// Vista del depósito (oro + ítems) para el panel.
export async function depositView(accountId) {
  const gd = await depositGuard(accountId)
  if (gd.error) return { ok: false, error: gd.error }
  const dep = await db.getDeposit(gd.g.id)
  return { ok: true, deposit: { gold: Number(dep.gold) || 0, items: dep.items || [] } }
}

// Depositar oro: sale del oro persistido del personaje y entra al pozo del depósito. Bajo el lock
// del gremio: dos miembros depositando a la vez no se pisan la fila del depósito compartido.
export async function depositGold(accountId, amount) {
  const amt = Math.floor(Number(amount) || 0)
  if (amt <= 0) return { ok: false, error: 'monto inválido' }
  const gd = await depositGuard(accountId)
  if (gd.error) return { ok: false, error: gd.error }
  // Personaje -> banco del gremio en una transacción (sin pérdida por crash entre las dos filas).
  return db.txDepositGold(accountId, gd.g.id, amt)
}

// Retirar oro: sale del depósito y vuelve al oro del personaje. Bajo el lock del gremio para que
// dos retiros simultáneos no lean el mismo saldo y dupliquen el oro del pozo.
export async function withdrawGold(accountId, amount) {
  const amt = Math.floor(Number(amount) || 0)
  if (amt <= 0) return { ok: false, error: 'monto inválido' }
  const gd = await depositGuard(accountId)
  if (gd.error) return { ok: false, error: gd.error }
  // Banco del gremio -> personaje en una transacción (sin pérdida por crash entre las dos filas).
  return db.txWithdrawGold(accountId, gd.g.id, amt)
}

// Depositar un ítem: el cliente manda el ítem (dueño de su inventario); el server lo guarda en
// el depósito compartido (fuente de verdad del stash) y confirma. El cliente lo saca de su bolsa.
export async function depositItem(accountId, item) {
  if (!item || typeof item !== 'object') return { ok: false, error: 'ítem inválido' }
  const gd = await depositGuard(accountId)
  if (gd.error) return { ok: false, error: gd.error }
  return db.withGuildLock(gd.g.id, async () => {
    const dep = await db.getDeposit(gd.g.id)
    const items = dep.items || []
    if (items.length >= DEPOSIT_MAX_ITEMS) return { ok: false, error: 'el depósito está lleno' }
    items.push(item)
    const nd = { gold: Number(dep.gold) || 0, items }
    await db.setDeposit(gd.g.id, nd)
    return { ok: true, deposit: nd }
  })
}

// Retirar un ítem por índice: el server lo saca del depósito y lo devuelve; el cliente lo mete
// en su inventario. Autoritativo sobre el stash compartido (no se puede duplicar).
export async function withdrawItem(accountId, index) {
  const i = index | 0
  const gd = await depositGuard(accountId)
  if (gd.error) return { ok: false, error: gd.error }
  // Bajo el lock del gremio: dos retiros del mismo índice a la vez no pueden llevarse el ítem
  // duplicado (leerían el mismo array antes de escribir).
  return db.withGuildLock(gd.g.id, async () => {
    const dep = await db.getDeposit(gd.g.id)
    const items = dep.items || []
    if (i < 0 || i >= items.length) return { ok: false, error: 'ese ítem no está' }
    const [item] = items.splice(i, 1)
    const nd = { gold: Number(dep.gold) || 0, items }
    await db.setDeposit(gd.g.id, nd)
    return { ok: true, item, deposit: nd }
  })
}
