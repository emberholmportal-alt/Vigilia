// Servidor autoritativo de Velgrim: HTTP (health) + WebSocket (ws). Maneja cuentas (registro/
// login), persistencia del personaje (PostgreSQL o archivo) y presencia multijugador por mapa.
//
// Protocolo: mensajes JSON `{ t: <tipo>, ... }`. El cliente vive en client/net/net.js.
// Correr: `npm run server` (PORT y DATABASE_URL por entorno; deploy en Render).
import http from 'node:http'
import { WebSocketServer } from 'ws'
import * as db from './db/db.js'
import { register, login, session, logout } from './systems/auth.js'
import * as wallet from './systems/wallet.js'
import * as guilds from './systems/guilds.js'
import * as rooms from './world/rooms.js'
import * as market from './systems/market.js'
import * as goldmarket from './systems/goldmarket.js'
import * as stash from './systems/stash.js'
import { startingKit, startingLedger } from '../shared/starterkit.js'

const PORT = process.env.PORT || 8787
// Wallet obligatoria (producción): rechaza el alta/login por usuario+contraseña, así la única vía de
// cuenta es la billetera. Se enciende con WALLET_REQUIRED=1 (render.yaml). Apagado en dev/local (tests).
const WALLET_REQUIRED = process.env.WALLET_REQUIRED === '1' || process.env.WALLET_REQUIRED === 'true'

// Grandfather del ledger "checkout" para personajes VIEJOS sin ledger persistido (migración A.3).
// El blob (equipo/cinturón/tumbas) es controlado por el cliente, así que NO se puede confiar en él
// para acuñar créditos: se siembra 1 unidad por slot conocido de equipo + cinturón, IGNORANDO los
// `count` (vector de mint por stacks) y SIN tumbas (vector de ítems arbitrarios), con tope total.
// Alcanza para que un jugador viejo pueda des-equiparse su equipo real (bag_give), sin permitir
// fabricar ítems. `itemById` (en rooms.join) descarta ids inexistentes.
const GF_EQUIP_SLOTS = ['head', 'chest', 'legs', 'feet', 'hands', 'artifact', 'ring', 'ring2', 'main', 'off']
const GF_BELT_MAX = 8
const GF_SEED_MAX = 24
function grandfatherSeed(d) {
  const seed = []
  const eq = (d && d.equipment) || {}
  for (const slot of GF_EQUIP_SLOTS) { const it = eq[slot]; if (it && it.id != null) seed.push(it.id | 0) }
  const belt = Array.isArray(d && d.belt) ? d.belt : []
  for (let i = 0; i < belt.length && i < GF_BELT_MAX; i++) { const b = belt[i]; if (b && b.id != null) seed.push(b.id | 0) }
  if (d && d.equippedBelt && d.equippedBelt.id != null) seed.push(d.equippedBelt.id | 0)
  return seed.slice(0, GF_SEED_MAX)   // tope duro; sin `count`, sin tumbas
}

await db.init()

// Migración batch (una vez, idempotente): sella un ledger "checkout" SANEADO en todo personaje viejo
// que todavía no tenga `_outLedger` persistido. Usa la MISMA sanitización que el grandfather del join
// (1 por slot de equipo/cinturón, sin `count` ni tumbas, con tope), pero desde el servidor y de una.
// Después de esto, ningún personaje queda en el estado migrable: el join ya nunca grandfatherea desde
// el blob del cliente, cerrando definitivamente ese vector de mint. Corre en cada arranque; los
// personajes que ya tienen ledger se saltean, así que es un no-op salvo la primera vez.
async function migrateLegacyLedgers() {
  try {
    const chars = await db.allCharacters()
    let n = 0
    for (const { accountId, data } of chars) {
      if (data && data._outLedger && typeof data._outLedger === 'object') continue   // ya migrado
      const ledger = {}
      for (const id of grandfatherSeed(data || {})) ledger[id] = (ledger[id] || 0) + 1
      await db.setCharacterLedger(accountId, ledger)
      n++
    }
    if (n) console.log(`[migración] ledger sellado en ${n} personaje(s) sin ledger persistido`)
  } catch (e) { console.error('[migración] fallo sellando ledgers viejos:', e && e.message) }
}
await migrateLegacyLedgers()

// Mercado: barrido periódico de publicaciones vencidas (devuelven el ítem al vendedor). El browse
// también barre, pero esto cubre listados vencidos sin nadie mirando.
setInterval(() => { market.sweepExpired(Date.now()).catch(() => {}) }, 5 * 60 * 1000)

// HTTP mínimo: health, /stats (contadores para el landing) y una raíz informativa. CORS abierto
// para que el static site (otro origen) pueda leer /stats.
const http_server = http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')
  const path = (req.url || '').split('?')[0]
  if (path === '/health' || path === '/healthz') {
    // `rev` = commit desplegado (Render inyecta RENDER_GIT_COMMIT). Permite verificar desde afuera
    // que el server tomó el último push, sin adivinar.
    const rev = (process.env.RENDER_GIT_COMMIT || 'dev').slice(0, 7)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, rev, players: rooms.playerCount(), db: db.usingPostgres() ? 'postgres' : 'file' }))
    return
  }
  if (path === '/stats') {
    let monthly = 0
    try { monthly = await db.monthlyCount() } catch {}
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ online: rooms.playerCount(), monthly }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('Velgrim server — WebSocket en la misma URL. GET /health o /stats.')
})

const wss = new WebSocketServer({ server: http_server })

// Una sola sesión de juego por cuenta: si la misma cuenta entra de nuevo, se expulsa a la anterior
// (evita jugar dos veces con el mismo usuario, y con eso duplicar acciones/loops entre dos ventanas).
const liveConns = new Map() // accountId -> ws

wss.on('connection', (ws) => {
  const conn = { accountId: null, username: null, playerId: null }
  const send = (msg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)) }

  ws.on('message', async (raw) => {
    let m
    try { m = JSON.parse(raw) } catch { return }
    if (!m || typeof m.t !== 'string') return

    try {
      switch (m.t) {
        case 'ping': return send({ t: 'pong' })

        case 'register': {
          // Wallet obligatoria (producción): no se crean cuentas por usuario/contraseña — sólo por
          // billetera. En dev/local (WALLET_REQUIRED apagado) sigue habilitado para tests.
          if (WALLET_REQUIRED) return send({ t: 'auth', ok: false, error: 'iniciá sesión con tu billetera' })
          const r = await register(m.user, m.pass)
          if (r.ok) { conn.accountId = session(r.token).accountId; conn.username = r.username }
          return send({ t: 'auth', ok: r.ok, token: r.token, username: r.username, error: r.error })
        }

        case 'login': {
          if (WALLET_REQUIRED) return send({ t: 'auth', ok: false, error: 'iniciá sesión con tu billetera' })
          const r = await login(m.user, m.pass)
          if (!r.ok) return send({ t: 'auth', ok: false, error: r.error })
          conn.accountId = session(r.token).accountId
          conn.username = r.username
          const char = await db.loadCharacter(conn.accountId)
          return send({ t: 'auth', ok: true, token: r.token, username: r.username, char: char ? char.data : null })
        }

        case 'velinfo': {            // config pública del token $VEL (para la pantalla de compra). Sin gate: { gate:false }.
          return send({ t: 'velinfo', ...(await wallet.velConfig()) })
        }

        case 'wallet_challenge': {   // paso 1 del login por wallet: pedir el texto a firmar
          if (!m.pubkey || typeof m.pubkey !== 'string') return send({ t: 'error', error: 'falta la dirección de la wallet' })
          return send({ t: 'challenge', message: wallet.challenge(m.pubkey) })
        }

        case 'wallet_verify': {      // paso 2: verificar la firma -> sesión (cuenta = la wallet)
          const r = await wallet.walletVerify(m.pubkey, m.signature)
          if (!r.ok) return send({ t: 'auth', ok: false, error: r.error, vel: r.vel })
          conn.accountId = session(r.token).accountId
          conn.username = r.pubkey
          const char = await db.loadCharacter(conn.accountId)
          return send({ t: 'auth', ok: true, token: r.token, username: r.pubkey, char: char ? char.data : null, wallet: r.pubkey })
        }

        case 'resume': {   // reanudar con un token existente (reconexión)
          const s = session(m.token)
          if (!s) return send({ t: 'auth', ok: false, error: 'sesión vencida' })
          conn.accountId = s.accountId; conn.username = s.username
          const char = await db.loadCharacter(conn.accountId)
          return send({ t: 'auth', ok: true, token: m.token, username: s.username, char: char ? char.data : null })
        }

        case 'save': {
          if (!conn.accountId) return send({ t: 'saved', ok: false, error: 'no autenticado' })
          // El ORO y el INVENTARIO son autoritativos del servidor (Fase A/A.2): si hay sesión
          // activa, sus valores pisan el blob del cliente (un save hackeado no puede setear oro ni
          // ítems). El resto (xp, equipo, etc.) sigue viniendo del cliente. Bajo el lock de la cuenta.
          // Los campos AUTORITATIVOS (oro, inventario, ledger) nunca se toman del blob del cliente para
          // un personaje EXISTENTE: vienen de la sesión viva (autoritativo) o, si no hay sesión, se
          // PRESERVAN del personaje persistido. Así un save sin sesión (autenticado pero sin join) no
          // puede pisarlos. Sólo en la CREACIÓN (personaje inexistente) se aceptan los valores del
          // cliente (kit inicial). Cierra el bypass "guardar sin entrar al mundo".
          const g = rooms.goldOf(conn.accountId)
          const sv = rooms.sealsOf(conn.accountId)
          const inv = rooms.invOf(conn.accountId)
          const led = rooms.ledgerOf(conn.accountId)
          const qc = rooms.questClaimsOf(conn.accountId)
          const ft = rooms.featsOf(conn.accountId)
          const data = { ...(m.char || {}) }
          await db.withAccountLock(conn.accountId, async () => {
            const existing = await db.loadCharacter(conn.accountId)
            const ed = existing?.data || null
            if (g != null) data.gold = g
            else if (ed) data.gold = Math.floor(Number(ed.gold) || 0)
            // Sellos AUTORITATIVOS (moneda premium): igual que el oro, la sesión viva pisa el blob;
            // sin sesión se preservan del personaje. Cierra "editar el save para tener sellos".
            if (sv != null) data.seals = sv
            else if (ed) data.seals = Math.floor(Number(ed.seals) || 0)
            if (inv != null) data.inventory = inv
            else if (ed) data.inventory = ed.inventory || []
            if (led != null) data._outLedger = led
            else if (ed) { if (ed._outLedger && typeof ed._outLedger === 'object') data._outLedger = ed._outLedger; else delete data._outLedger }
            // Quests reclamadas (server-owned): igual que el ledger, nunca se toman del blob del
            // cliente — vienen de la sesión viva o se preservan del personaje. Un save no las borra.
            if (qc != null) data._qclaimed = qc
            else if (ed) { if (Array.isArray(ed._qclaimed)) data._qclaimed = ed._qclaimed; else delete data._qclaimed }
            // Hazañas (server-owned): jefes derrotados + zona más profunda. Igual que las quests: de la
            // sesión viva o preservadas del personaje; un save del cliente no las inventa ni las borra.
            if (ft != null) data._feats = ft
            else if (ed) { if (ed._feats && typeof ed._feats === 'object') data._feats = ed._feats; else delete data._feats }
            // CREACIÓN (personaje inexistente): el server ASIGNA el kit inicial canónico (oro/equipo/
            // inventario/cinturón + ledger), ignorando el blob del cliente. Cierra "crearse con oro/
            // equipo falso". El ledger canónico se persiste ya, así el 1er join no grandfatherea.
            if (!ed) {
              const kit = startingKit(m.race)
              data.gold = kit.gold
              data.seals = 0                 // un personaje nuevo arranca sin sellos (moneda premium)
              data.inventory = kit.inventory
              data.equipment = kit.equipment
              data.belt = kit.belt
              data.equippedBelt = null
              data._outLedger = startingLedger(m.race)
              data._qclaimed = []            // personaje nuevo: ninguna quest reclamada
            }
            await db.saveCharacter(conn.accountId, { name: m.name, race: m.race, data })
          })
          return send({ t: 'saved', ok: true })
        }

        // ---------- Gremios (WORLD.md) ----------
        case 'guild_info': {   // gremio del jugador (o uno puntual por id) + miembros
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.info(conn.accountId, m.id)) })
        }
        case 'guild_list': {   // ranking público
          return send({ t: 'guild_list', ...(await guilds.ranking(m.limit)) })
        }
        case 'hall': {   // Salón de la Fama: rankings públicos de jugadores (nivel/jefes/profundidad)
          return send({ t: 'hall', ...(await rooms.hallOfFame(m.limit)) })
        }
        case 'guild_create': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          const r = await guilds.create(conn.accountId, { name: m.name, tag: m.tag, color: m.color })
          if (r.ok && conn.playerId != null) rooms.setGuildTag(conn.playerId, r.guild?.tag || null)
          return send({ t: 'guild', ...r })
        }
        case 'guild_join': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          const r = await guilds.join(conn.accountId, { guildId: m.id, tag: m.tag })
          if (r.ok && conn.playerId != null) rooms.setGuildTag(conn.playerId, r.guild?.tag || null)
          return send({ t: 'guild', ...r })
        }
        case 'guild_leave': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          const r = await guilds.leave(conn.accountId)
          if (r.ok && conn.playerId != null) rooms.setGuildTag(conn.playerId, null)
          return send({ t: 'guild', ...r, left: true })
        }
        case 'guild_donate': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.donate(conn.accountId, m.amount)) })
        }
        case 'guild_kick': {   // expulsar a un miembro (fundador/oficial)
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.kick(conn.accountId, m.target)) })
        }
        case 'guild_role': {   // ascender/descender oficial (m.role: 'officer'|'member') — sólo fundador
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.setRole(conn.accountId, m.target, m.role)) })
        }
        case 'guild_transfer': {   // transferir el liderazgo — sólo fundador
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.transfer(conn.accountId, m.target)) })
        }
        case 'guild_invite': {     // invitar a un jugador visible (m.target = su playerId) al gremio
          if (!conn.accountId || conn.playerId == null) return send({ t: 'guild', error: 'sin sesión' })
          const targetAcct = rooms.accountOf(m.target)
          if (!targetAcct) return send({ t: 'guild', error: 'ese jugador no está' })
          const r = await guilds.invite(conn.accountId, targetAcct)
          if (r.ok) rooms.notify(m.target, { t: 'guild_invite', from: rooms.nameOf(conn.playerId), guildName: r.guild.name, tag: r.guild.tag })
          return send({ t: 'guild', ok: r.ok, error: r.error, invited: r.ok })
        }
        case 'guild_accept_invite': {   // aceptar la invitación pendiente
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          const r = await guilds.acceptInvite(conn.accountId)
          if (r.ok && conn.playerId != null) rooms.setGuildTag(conn.playerId, r.guild?.tag || null)
          return send({ t: 'guild', ...r })
        }
        case 'guild_decline_invite': {  // rechazar (silencioso)
          if (!conn.accountId) return
          return void guilds.declineInvite(conn.accountId)
        }
        case 'guild_chat': {   // chat del gremio: se difunde a todos los miembros ONLINE (sin importar mapa)
          if (!conn.accountId || conn.playerId == null) return
          const text = String(m.text || '').replace(/\s+/g, ' ').trim().slice(0, 200)
          if (!text) return
          const ci = await guilds.chatInfo(conn.accountId)
          if (!ci) return
          rooms.guildBroadcast(ci.ids, { t: 'gchat', from: rooms.nameOf(conn.playerId), tag: ci.tag, text })
          return
        }
        // Depósito del Gremio (banco compartido)
        case 'guild_dep_view': {
          if (!conn.accountId) return send({ t: 'guild_dep', error: 'no autenticado' })
          return send({ t: 'guild_dep', ...(await guilds.depositView(conn.accountId)) })
        }
        case 'guild_dep_gold': {   // m.dir: 'in' deposita, 'out' retira
          if (!conn.accountId) return send({ t: 'guild_dep', error: 'no autenticado' })
          const r = m.dir === 'out' ? await guilds.withdrawGold(conn.accountId, m.amount)
                                    : await guilds.depositGold(conn.accountId, m.amount)
          return send({ t: 'guild_dep', ...r })
        }
        case 'guild_dep_item_in': {   // depositar: el server saca el ítem del bag autoritativo (por índice) y lo guarda
          if (!conn.accountId) return send({ t: 'guild_dep', error: 'no autenticado' })
          if (conn.playerId == null) return send({ t: 'guild_dep', error: 'sin sesión' })
          const taken = rooms.takeItemAt(conn.playerId, m.index)
          if (!taken.ok) return send({ t: 'guild_dep', error: taken.error || 'no tenés ese ítem' })
          const dep = await guilds.depositItem(conn.accountId, taken.item)
          if (!dep.ok) { rooms.giveItem(conn.playerId, taken.item) }   // rollback al bag si el depósito falló
          else await rooms.flushInv(conn.accountId)   // durabilidad: el descuento del bag tan durable como el depósito (anti-dupe por crash)
          return send({ t: 'guild_dep', ...dep, inv: rooms.invOf(conn.accountId) })
        }
        case 'guild_dep_item_out': {  // retirar: el server saca del stash y lo mete en el bag autoritativo
          if (!conn.accountId) return send({ t: 'guild_dep', error: 'no autenticado' })
          if (conn.playerId == null) return send({ t: 'guild_dep', error: 'sin sesión' })
          const out = await guilds.withdrawItem(conn.accountId, m.index)
          if (!out.ok) return send({ t: 'guild_dep', ...out })
          const give = rooms.giveItem(conn.playerId, out.item)
          if (!give.ok) { await guilds.depositItem(conn.accountId, out.item); return send({ t: 'guild_dep', error: 'bag lleno' }) }   // rollback al stash
          return send({ t: 'guild_dep', ...out, inv: rooms.invOf(conn.accountId) })
        }
        case 'stash_view': {   // ver el alijo privado (sólo el dueño)
          if (!conn.accountId) return send({ t: 'stash', error: 'no autenticado' })
          return send({ t: 'stash', ...(await stash.view(conn.accountId)) })
        }
        case 'stash_in': {     // depositar: saca el ítem del bag autoritativo (por índice) y lo guarda
          if (!conn.accountId) return send({ t: 'stash', error: 'no autenticado' })
          if (conn.playerId == null) return send({ t: 'stash', error: 'sin sesión' })
          const taken = rooms.takeItemAt(conn.playerId, m.index)
          if (!taken.ok) return send({ t: 'stash', error: taken.error || 'no tenés ese ítem' })
          const dep = await stash.depositItem(conn.accountId, taken.item)
          if (!dep.ok) { rooms.giveItem(conn.playerId, taken.item); return send({ t: 'stash', ...dep }) }   // rollback al bag
          await rooms.flushInv(conn.accountId)   // durabilidad: el descuento del bag tan durable como el alijo (anti-dupe por crash)
          return send({ t: 'stash', ...dep, inv: rooms.invOf(conn.accountId) })
        }
        case 'stash_out': {    // retirar: saca del alijo y lo mete en el bag autoritativo
          if (!conn.accountId) return send({ t: 'stash', error: 'no autenticado' })
          if (conn.playerId == null) return send({ t: 'stash', error: 'sin sesión' })
          const out = await stash.withdrawItem(conn.accountId, m.index)
          if (!out.ok) return send({ t: 'stash', ...out })
          const give = rooms.giveItem(conn.playerId, out.item)
          if (!give.ok) { await stash.depositItem(conn.accountId, out.item); return send({ t: 'stash', error: 'bag lleno' }) }   // rollback al alijo
          return send({ t: 'stash', ...out, inv: rooms.invOf(conn.accountId) })
        }
        case 'stash_gold': {   // oro: m.dir 'in' deposita (oro vivo -> bóveda), 'out' retira (bóveda -> oro vivo)
          if (!conn.accountId) return send({ t: 'stash', error: 'no autenticado' })
          if (conn.playerId == null) return send({ t: 'stash', error: 'sin sesión' })
          const amt = Math.floor(Number(m.amount) || 0)
          if (amt <= 0) return send({ t: 'stash', error: 'monto inválido' })
          if (m.dir === 'out') {
            const w = await stash.withdrawGold(conn.accountId, amt)
            if (!w.ok) return send({ t: 'stash', ...w })
            const gold = rooms.awardGold(conn.playerId, amt, 'stash_out')   // acredita al oro vivo (broadcast 'gold')
            return send({ t: 'stash', ok: true, stashGold: w.gold, gold })
          }
          // depositar: primero debitá el oro VIVO (autoritativo); si no alcanza, abortá antes de tocar la bóveda
          const spent = rooms.spendGold(conn.playerId, amt, 'stash_in')
          if (!spent.ok) return send({ t: 'stash', error: spent.error || 'no tenés tanto oro' })
          const dep = await stash.depositGold(conn.accountId, amt)
          if (!dep.ok) { rooms.awardGold(conn.playerId, amt, 'stash_rollback'); return send({ t: 'stash', ...dep }) }   // rollback al oro vivo
          return send({ t: 'stash', ok: true, stashGold: dep.gold, gold: spent.gold })
        }

        case 'join': {
          if (!conn.accountId) return send({ t: 'error', error: 'no autenticado' })
          db.touchAccount(conn.accountId).catch(() => {})   // actividad (jugadores mensuales)
          // Single-session: si esta cuenta ya está jugando en otra conexión, la echamos. El cliente
          // viejo recibe 'kicked' y NO reintenta reconectar (si no, haría ping-pong con el nuevo).
          const prev = liveConns.get(conn.accountId)
          if (prev && prev !== ws) {
            try { prev.send(JSON.stringify({ t: 'kicked', reason: 'Tu cuenta entró desde otro lugar.' })) } catch {}
            try { prev.close(4001, 'another session') } catch {}
          }
          liveConns.set(conn.accountId, ws)
          // Sacar + PERSISTIR (awaited) cualquier sesión previa de esta cuenta ANTES de leer el saldo,
          // o cargaríamos oro viejo (race con el persist async del socket que cierra). Cubre tanto la
          // reconexión en esta misma ws como una segunda pestaña.
          const oldPid = rooms.playerIdOfAccount(conn.accountId)
          if (oldPid != null) await rooms.leaveFlush(oldPid)
          conn.playerId = null
          // Oro + inventario autoritativos: se cargan del personaje al entrar (fuente de verdad).
          let gold = 0, seals = 0, inv = null, outSeed = null, ledger = null, qclaimed = null, feats = null, guildTag = null
          if (!m.spectator) {
            const ch = await db.loadCharacter(conn.accountId)
            gold = Math.floor(Number(ch?.data?.gold) || 0)
            seals = Math.floor(Number(ch?.data?.seals) || 0)
            inv = ch?.data?.inventory || null
            qclaimed = Array.isArray(ch?.data?._qclaimed) ? ch.data._qclaimed : null
            feats = (ch?.data?._feats && typeof ch.data._feats === 'object') ? ch.data._feats : null   // hazañas server-owned
            guildTag = await guilds.tagOf(conn.accountId)   // estandarte sobre la cabeza (sigla del gremio)
            const d = ch?.data || {}
            // Ledger "checkout" AUTORITATIVO (Fase A.3): si el personaje ya tiene ledger guardado, se
            // carga de ahí (server-owned, el cliente no lo puede inflar). Si NO (personaje viejo, 1ª vez),
            // se grandfatherea desde el equipo/cinturón/tumbas del blob y se persiste desde entonces.
            ledger = (d._outLedger && typeof d._outLedger === 'object') ? d._outLedger : null
            // Grandfather sólo la 1ª vez (personaje viejo sin ledger), SANITIZADO: 1 unidad por slot
            // de equipo/cinturón, sin `count` ni tumbas y con tope. Evita el mint de stackables por un
            // save manipulado (belt/graves con count enorme) en cuentas sin ledger persistido.
            if (!ledger) outSeed = grandfatherSeed(d)
          }
          const { id, channel, present } = rooms.join(send, { name: m.name, race: m.race, body: m.body, map: m.map, x: m.x, y: m.y, dir: m.dir, channel: m.channel, spectator: m.spectator, gfx: m.gfx, accountId: conn.accountId, gold, seals, inv, outSeed, ledger, qclaimed, feats })
          conn.playerId = id
          send({ t: 'present', you: id, players: present, map: m.map, channel })
          if (!m.spectator) { send({ t: 'gold', gold, reason: 'init' }); send({ t: 'seals', seals }); send({ t: 'inv', inv: rooms.invOf(conn.accountId) }) }   // sincroniza saldo + sellos + bag
          return
        }

        case 'move': {
          if (conn.playerId == null) return
          const r = rooms.move(conn.playerId, m.map, m.x, m.y, m.dir)
          if (r) send({ t: 'present', you: conn.playerId, players: r.present, map: m.map, channel: r.channel }) // cambió de mapa
          return
        }

        case 'chat': {
          if (conn.playerId == null) return
          return rooms.chat(conn.playerId, m.text)
        }

        case 'setstats': {   // stats de combate del jugador (para que el server tire el daño)
          if (conn.playerId == null) return
          return rooms.setStats(conn.playerId, m.stats)
        }

        case 'setgfx': {     // equipo visible del jugador (capas del paperdoll)
          if (conn.playerId == null) return
          return rooms.setGfx(conn.playerId, m.gfx)
        }

        case 'setcard': {    // tarjeta pública del jugador (lo que ven al inspeccionarlo)
          if (conn.playerId == null) return
          return rooms.setCard(conn.playerId, m.card)
        }

        case 'inspect': {    // pedir la tarjeta pública de otro jugador (sólo si lo ves)
          if (conn.playerId == null) return
          return send({ t: 'inspect', ...rooms.inspectCard(conn.playerId, m.id) })
        }

        case 'php': {        // vida del jugador (para su barra que ven los demás)
          if (conn.playerId == null) return
          return rooms.playerHp(conn.playerId, m.hp, m.hpMax)
        }

        case 'atk': {        // pedido de ataque a un enemigo (lo valida la simulación)
          if (conn.playerId == null) return
          return rooms.attack(conn.playerId, m.eid)
        }

        case 'cast': {       // habilidad especial M2: enemigos alcanzados + daño (server valida/clampea/aplica)
          if (conn.playerId == null) return
          return rooms.cast(conn.playerId, m.hits)
        }

        // ---------- Economía: oro autoritativo del servidor (Fase A) ----------
        case 'sell': {       // vender un ítem del bag (por índice); el VALOR lo computa el server
          if (conn.playerId == null) return
          return send({ t: 'sellack', ...rooms.sellItem(conn.playerId, m.index) })
        }
        case 'use': {        // usar un consumible del bag (por índice); el server saca 1 y valida posesión
          if (conn.playerId == null) return
          return send({ t: 'useack', ...rooms.useItem(conn.playerId, m.index) })
        }
        case 'buy': {        // comprar un ítem al mercader; el COSTO lo computa el server
          if (conn.playerId == null) return
          return send({ t: 'buyack', ...rooms.buyItem(conn.playerId, m.id) })
        }
        case 'craft': {      // craftear alquimia; el server valida la receta + materiales y otorga la poción
          if (conn.playerId == null) return
          return send({ t: 'craftack', ...rooms.craftRecipe(conn.playerId, m.out) })
        }
        // ---------- Trade P2P (ítems + oro, swap atómico) ----------
        case 'trade_req': {   // pedir intercambio a un jugador cercano
          if (conn.playerId == null) return
          return send({ t: 'tradeack', op: 'req', ...rooms.tradeRequest(conn.playerId, m.to) })
        }
        case 'trade_accept': {   // aceptar el pedido de intercambio (abre la ventana para ambos)
          if (conn.playerId == null) return
          return send({ t: 'tradeack', op: 'accept', ...rooms.tradeAccept(conn.playerId, m.from) })
        }
        case 'trade_offer': {    // setear mi oferta (ítems por índice del bag + oro); resetea confirmaciones
          if (conn.playerId == null) return
          return void rooms.tradeOffer(conn.playerId, m.items, m.gold)
        }
        case 'trade_confirm': {  // confirmar; si ambos confirman, el server hace el swap atómico
          if (conn.playerId == null) return
          return void rooms.tradeConfirm(conn.playerId)
        }
        case 'trade_cancel': {   // cancelar el intercambio en curso
          if (conn.playerId == null) return
          return void rooms.tradeCancel(conn.playerId)
        }
        // ---------- Mercado (casa de subastas, precio fijo, global) ----------
        case 'market_browse': {  // ver los listados activos
          return send({ t: 'market', op: 'browse', ...(await market.browse()) })
        }
        case 'market_mine': {    // mis publicaciones
          if (!conn.accountId) return send({ t: 'market', op: 'mine', ok: false, error: 'no autenticado' })
          return send({ t: 'market', op: 'mine', ...(await market.mine(conn.accountId)) })
        }
        case 'market_list': {    // publicar un ítem del bag (por índice) a precio fijo
          if (conn.playerId == null || !conn.accountId) return
          return send({ t: 'market', op: 'list', ...(await market.list(conn.playerId, conn.accountId, rooms.nameOf(conn.playerId), m.index, m.price)) })
        }
        case 'market_buy': {     // comprar un listado (el server cobra, entrega y acredita al vendedor)
          if (conn.playerId == null || !conn.accountId) return
          return send({ t: 'market', op: 'buy', ...(await market.buy(conn.playerId, conn.accountId, m.id)) })
        }
        case 'market_cancel': {  // retirar mi publicación (recupero el ítem)
          if (conn.playerId == null || !conn.accountId) return
          return send({ t: 'market', op: 'cancel', ...(await market.cancel(conn.playerId, conn.accountId, m.id)) })
        }
        // ---------- Marketplace oro↔$VEL (order book P2P, pago on-chain, no-custodial) ----------
        case 'goldmkt_config': {  // config pública del mercado de $VEL (apagado -> { on:false })
          return send({ t: 'goldmkt', op: 'config', ...(await goldmarket.config()) })
        }
        case 'goldmkt_browse': {  // órdenes de oro disponibles para comprar (con $VEL)
          return send({ t: 'goldmkt', op: 'browse', ...(await goldmarket.browse()) })
        }
        case 'goldmkt_mine': {    // mis órdenes de venta de oro
          if (!conn.accountId) return send({ t: 'goldmkt', op: 'mine', ok: false, error: 'no autenticado' })
          return send({ t: 'goldmkt', op: 'mine', ...(await goldmarket.mine(conn.accountId)) })
        }
        case 'goldmkt_list': {    // publicar oro (escrow) pidiendo $VEL. La wallet de cobro la pone el server.
          if (conn.playerId == null || !conn.accountId) return
          return send({ t: 'goldmkt', op: 'list', ...(await goldmarket.list(conn.playerId, conn.accountId, rooms.nameOf(conn.playerId), conn.username, m.gold, m.price)) })
        }
        case 'goldmkt_cancel': {  // cancelar mi orden y recuperar el oro escrowed
          if (conn.playerId == null || !conn.accountId) return
          return send({ t: 'goldmkt', op: 'cancel', ...(await goldmarket.cancel(conn.playerId, conn.accountId, m.id)) })
        }
        case 'goldmkt_lock': {    // reservar una orden para comprarla -> instrucciones de pago on-chain
          if (conn.playerId == null || !conn.accountId) return
          return send({ t: 'goldmkt', op: 'lock', id: m.id, ...(await goldmarket.lock(conn.playerId, conn.accountId, conn.username, m.id)) })
        }
        case 'goldmkt_unlock': {  // soltar la reserva sin comprar
          if (!conn.accountId) return
          return send({ t: 'goldmkt', op: 'unlock', id: m.id, ...(await goldmarket.unlock(conn.accountId, m.id)) })
        }
        case 'goldmkt_settle': {  // cerré el pago on-chain (firma) -> verificar y recibir el oro
          if (conn.playerId == null || !conn.accountId) return
          return send({ t: 'goldmkt', op: 'settle', id: m.id, ...(await goldmarket.settle(conn.playerId, conn.accountId, m.id, m.sig)) })
        }
        // ---------- Bag autoritativo: transferencias entre el bag y equipo/cinturón/tumba/forja ----------
        case 'bag_take': {   // sacar un ítem del bag por índice (equipar / mandar al cinturón)
          if (conn.playerId == null) return
          const r = rooms.takeItemAt(conn.playerId, m.index, m.qty || 1)
          if (r.ok && r.item) rooms.noteCheckout(conn.playerId, r.item.id, r.item.count || 1)   // queda "afuera": se podrá devolver
          return send({ t: 'bagack', op: 'take', ...r })
        }
        case 'bag_give': {   // devolver un ítem al bag (desequipar / retirar de tumba / rollback)
          if (conn.playerId == null) return
          // Anti-mint: sólo se puede devolver un ítem contabilizado como "afuera" (equipo/cinturón/tumba
          // del blob, o sacado del bag esta sesión). Inyectar un ítem cualquiera para venderlo => rechazo.
          if (!m.item || !rooms.canReturn(conn.playerId, m.item.id, m.item.count || 1)) {
            return send({ t: 'bagack', op: 'give', ok: false, error: 'ítem no autorizado' })
          }
          return send({ t: 'bagack', op: 'give', ...rooms.giveItem(conn.playerId, m.item) })
        }
        case 'bag_consume': {   // consumir N materiales del bag (forja / alquimia) — valida posesión
          if (conn.playerId == null) return
          return send({ t: 'bagack', op: 'consume', ...rooms.consumeItems(conn.playerId, m.id, m.qty || 1) })
        }
        case 'bag_dump': {   // al morir: vaciar el bag (los ítems van a la tumba client-side)
          if (conn.playerId == null) return
          const dump = rooms.dumpBag(conn.playerId)
          await rooms.flushInv(conn.accountId)   // durabilidad: el bag vaciado tan durable como la tumba (anti-dupe por crash)
          return send({ t: 'bagack', op: 'dump', ...dump })
        }
        case 'spend': {      // sink genérico: reparar / forjar / respec / ofrenda (el efecto local lo aplica el cliente)
          if (conn.playerId == null) return
          // Respec / reparar / forjar: el ORO lo RECALCULA el server del nivel real (no confía en el
          // monto del cliente), cerrando el under-pay. Reparar y forjar pasaron a costo por nivel para
          // no depender de la durabilidad/upgrade (client-side); los cristales de forja se validan
          // aparte por bagConsume. Ofrenda es inofensiva (pagar de menos sólo avanza menos la misión).
          const amount = m.reason === 'respec' ? rooms.respecCostOf(conn.playerId)
            : m.reason === 'repair' ? rooms.repairCostOf(conn.playerId)
            : m.reason === 'forge' ? rooms.forgeCostOf(conn.playerId)
            : m.amount
          return send({ t: 'spendack', reason: m.reason, amount, ...rooms.spendGold(conn.playerId, amount, m.reason) })
        }
        case 'claimmission': {  // recompensa de misión diaria (oro computado del set del día)
          if (conn.playerId == null) return
          return send({ t: 'claimack', ...rooms.claimMission(conn.playerId, m.id) })
        }
        case 'sealchest': {  // cofre de sellos: el server tira el loot y acredita el oro
          if (conn.playerId == null) return
          return send({ t: 'sealack', ...rooms.sealChest(conn.playerId, m.level) })
        }
        case 'claimquest': {  // recompensa de quest narrativa (oro fijo)
          if (conn.playerId == null) return
          return send({ t: 'claimack', kind: 'quest', ...rooms.claimQuest(conn.playerId, m.id) })
        }
        case 'dropgrave': {  // al morir: soltar la fracción de oro (server-authoritative)
          if (conn.playerId == null) return
          return send({ t: 'graveack', kind: 'drop', ...rooms.dropGrave(conn.playerId) })
        }
        case 'recovergrave': {  // recuperar el oro de la tumba
          if (conn.playerId == null) return
          return send({ t: 'graveack', kind: 'recover', ...rooms.recoverGrave(conn.playerId) })
        }

        case 'gather': {     // pedido de juntar un nodo de recurso (lo valida la simulación)
          if (conn.playerId == null) return
          return rooms.gather(conn.playerId, m.nid)
        }

        case 'openchest': {  // pedido de abrir un cofre (lo valida la simulación)
          if (conn.playerId == null) return
          return rooms.openChest(conn.playerId, m.cid)
        }

        case 'pdead': {      // el jugador murió (se difunde al canal para el co-op)
          if (conn.playerId == null) return
          return rooms.playerDead(conn.playerId)
        }

        case 'palive': {     // el jugador reapareció
          if (conn.playerId == null) return
          return rooms.playerAlive(conn.playerId, m.x, m.y, m.dir)
        }

        default: return
      }
    } catch (e) {
      console.error('[ws] error en', m.t, e)
      send({ t: 'error', error: 'error del servidor' })
    }
  })

  ws.on('close', () => {
    if (conn.playerId != null) rooms.leave(conn.playerId)
    if (conn.accountId && liveConns.get(conn.accountId) === ws) liveConns.delete(conn.accountId)
  })
  ws.on('error', () => {})
})

http_server.listen(PORT, () => {
  console.log(`[velgrim] servidor escuchando en :${PORT} (ws + http)`)
})

// Apagado ordenado (deploy de Render = SIGTERM; Ctrl-C = SIGINT). El handler de 'close' del socket
// NO corre cuando matan el proceso, así que las sesiones en memoria perderían el oro/bag/ledger sin
// guardar. Persistimos todo lo online antes de salir. Idempotente y con timeout de red.
let _shuttingDown = false
async function gracefulShutdown(sig) {
  if (_shuttingDown) return
  _shuttingDown = true
  console.log(`[velgrim] ${sig}: persistiendo jugadores online…`)
  try { await Promise.race([rooms.flushAll(), new Promise((r) => setTimeout(r, 8000))]) } catch {}
  try { http_server.close() } catch {}
  process.exit(0)
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
