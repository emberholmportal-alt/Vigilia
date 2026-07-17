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

const PORT = process.env.PORT || 8787

await db.init()

// HTTP mínimo: health, /stats (contadores para el landing) y una raíz informativa. CORS abierto
// para que el static site (otro origen) pueda leer /stats.
const http_server = http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')
  const path = (req.url || '').split('?')[0]
  if (path === '/health' || path === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, players: rooms.playerCount(), db: db.usingPostgres() ? 'postgres' : 'file' }))
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
          const r = await register(m.user, m.pass)
          if (r.ok) { conn.accountId = session(r.token).accountId; conn.username = r.username }
          return send({ t: 'auth', ok: r.ok, token: r.token, username: r.username, error: r.error })
        }

        case 'login': {
          const r = await login(m.user, m.pass)
          if (!r.ok) return send({ t: 'auth', ok: false, error: r.error })
          conn.accountId = session(r.token).accountId
          conn.username = r.username
          const char = await db.loadCharacter(conn.accountId)
          return send({ t: 'auth', ok: true, token: r.token, username: r.username, char: char ? char.data : null })
        }

        case 'wallet_challenge': {   // paso 1 del login por wallet: pedir el texto a firmar
          if (!m.pubkey || typeof m.pubkey !== 'string') return send({ t: 'error', error: 'falta la dirección de la wallet' })
          return send({ t: 'challenge', message: wallet.challenge(m.pubkey) })
        }

        case 'wallet_verify': {      // paso 2: verificar la firma -> sesión (cuenta = la wallet)
          const r = await wallet.walletVerify(m.pubkey, m.signature)
          if (!r.ok) return send({ t: 'auth', ok: false, error: r.error })
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
          // Bajo el lock de la cuenta: serializa el autosave del blob contra los descuentos de oro
          // del servidor (gremios), que si no se pisan en la ventana entre lectura y escritura.
          await db.withAccountLock(conn.accountId, () =>
            db.saveCharacter(conn.accountId, { name: m.name, race: m.race, data: m.char }))
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
        case 'guild_create': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.create(conn.accountId, { name: m.name, tag: m.tag, color: m.color })) })
        }
        case 'guild_join': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.join(conn.accountId, { guildId: m.id, tag: m.tag })) })
        }
        case 'guild_leave': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.leave(conn.accountId)), left: true })
        }
        case 'guild_donate': {
          if (!conn.accountId) return send({ t: 'guild', error: 'no autenticado' })
          return send({ t: 'guild', ...(await guilds.donate(conn.accountId, m.amount)) })
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
        case 'guild_dep_item_in': {
          if (!conn.accountId) return send({ t: 'guild_dep', error: 'no autenticado' })
          return send({ t: 'guild_dep', ...(await guilds.depositItem(conn.accountId, m.item)) })
        }
        case 'guild_dep_item_out': {
          if (!conn.accountId) return send({ t: 'guild_dep', error: 'no autenticado' })
          return send({ t: 'guild_dep', ...(await guilds.withdrawItem(conn.accountId, m.index)) })
        }

        case 'join': {
          if (!conn.accountId) return send({ t: 'error', error: 'no autenticado' })
          db.touchAccount(conn.accountId).catch(() => {})   // actividad (jugadores mensuales)
          if (conn.playerId != null) rooms.leave(conn.playerId)
          const { id, channel, present } = rooms.join(send, { name: m.name, race: m.race, map: m.map, x: m.x, y: m.y, dir: m.dir, channel: m.channel, spectator: m.spectator, gfx: m.gfx, accountId: conn.accountId })
          conn.playerId = id
          return send({ t: 'present', you: id, players: present, map: m.map, channel })
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

        case 'php': {        // vida del jugador (para su barra que ven los demás)
          if (conn.playerId == null) return
          return rooms.playerHp(conn.playerId, m.hp, m.hpMax)
        }

        case 'atk': {        // pedido de ataque a un enemigo (lo valida la simulación)
          if (conn.playerId == null) return
          return rooms.attack(conn.playerId, m.eid)
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
  })
  ws.on('error', () => {})
})

http_server.listen(PORT, () => {
  console.log(`[velgrim] servidor escuchando en :${PORT} (ws + http)`)
})
