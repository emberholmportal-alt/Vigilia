// Servidor autoritativo de Velgrim: HTTP (health) + WebSocket (ws). Maneja cuentas (registro/
// login), persistencia del personaje (PostgreSQL o archivo) y presencia multijugador por mapa.
//
// Protocolo: mensajes JSON `{ t: <tipo>, ... }`. El cliente vive en client/net/net.js.
// Correr: `npm run server` (PORT y DATABASE_URL por entorno; deploy en Render).
import http from 'node:http'
import { WebSocketServer } from 'ws'
import * as db from './db/db.js'
import { register, login, session, logout } from './systems/auth.js'
import * as rooms from './world/rooms.js'

const PORT = process.env.PORT || 8787

await db.init()

// HTTP mínimo: health check para Render y una raíz informativa.
const http_server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, players: rooms.playerCount(), db: db.usingPostgres() ? 'postgres' : 'file' }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('Velgrim server — WebSocket en la misma URL. GET /health para estado.')
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

        case 'resume': {   // reanudar con un token existente (reconexión)
          const s = session(m.token)
          if (!s) return send({ t: 'auth', ok: false, error: 'sesión vencida' })
          conn.accountId = s.accountId; conn.username = s.username
          const char = await db.loadCharacter(conn.accountId)
          return send({ t: 'auth', ok: true, token: m.token, username: s.username, char: char ? char.data : null })
        }

        case 'save': {
          if (!conn.accountId) return send({ t: 'saved', ok: false, error: 'no autenticado' })
          await db.saveCharacter(conn.accountId, { name: m.name, race: m.race, data: m.char })
          return send({ t: 'saved', ok: true })
        }

        case 'join': {
          if (!conn.accountId) return send({ t: 'error', error: 'no autenticado' })
          if (conn.playerId != null) rooms.leave(conn.playerId)
          const { id, present } = rooms.join(send, { name: m.name, race: m.race, map: m.map, x: m.x, y: m.y, dir: m.dir })
          conn.playerId = id
          return send({ t: 'present', you: id, players: present, map: m.map })
        }

        case 'move': {
          if (conn.playerId == null) return
          const r = rooms.move(conn.playerId, m.map, m.x, m.y, m.dir)
          if (r) send({ t: 'present', you: conn.playerId, players: r.present, map: m.map }) // cambió de mapa
          return
        }

        case 'chat': {
          if (conn.playerId == null) return
          return rooms.chat(conn.playerId, m.text)
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
