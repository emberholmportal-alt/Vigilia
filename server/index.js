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
          // El ORO y el INVENTARIO son autoritativos del servidor (Fase A/A.2): si hay sesión
          // activa, sus valores pisan el blob del cliente (un save hackeado no puede setear oro ni
          // ítems). El resto (xp, equipo, etc.) sigue viniendo del cliente. Bajo el lock de la cuenta.
          const g = rooms.goldOf(conn.accountId)
          const inv = rooms.invOf(conn.accountId)
          const data = { ...(m.char || {}) }
          if (g != null) data.gold = g
          if (inv != null) data.inventory = inv
          await db.withAccountLock(conn.accountId, () =>
            db.saveCharacter(conn.accountId, { name: m.name, race: m.race, data }))
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
        case 'guild_dep_item_in': {   // depositar: el server saca el ítem del bag autoritativo (por índice) y lo guarda
          if (!conn.accountId) return send({ t: 'guild_dep', error: 'no autenticado' })
          if (conn.playerId == null) return send({ t: 'guild_dep', error: 'sin sesión' })
          const taken = rooms.takeItemAt(conn.playerId, m.index)
          if (!taken.ok) return send({ t: 'guild_dep', error: taken.error || 'no tenés ese ítem' })
          const dep = await guilds.depositItem(conn.accountId, taken.item)
          if (!dep.ok) { rooms.giveItem(conn.playerId, taken.item) }   // rollback al bag si el depósito falló
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

        case 'join': {
          if (!conn.accountId) return send({ t: 'error', error: 'no autenticado' })
          db.touchAccount(conn.accountId).catch(() => {})   // actividad (jugadores mensuales)
          if (conn.playerId != null) rooms.leave(conn.playerId)
          // Oro + inventario autoritativos: se cargan del personaje al entrar (fuente de verdad).
          let gold = 0, inv = null, outSeed = null
          if (!m.spectator) {
            const ch = await db.loadCharacter(conn.accountId)
            gold = Math.floor(Number(ch?.data?.gold) || 0)
            inv = ch?.data?.inventory || null
            // Semilla del ledger "checkout": los ítems que el personaje tiene FUERA del bag (equipo,
            // cinturón, tumbas) según el blob. Son los que legítimamente puede devolver por bag_give.
            const d = ch?.data || {}
            outSeed = []
            for (const it of Object.values(d.equipment || {})) if (it && it.id) outSeed.push(it.id)
            for (const b of (d.belt || [])) if (b && b.id) for (let k = 0; k < (b.count || 1); k++) outSeed.push(b.id)
            if (d.equippedBelt && d.equippedBelt.id) outSeed.push(d.equippedBelt.id)
            for (const g of (d.graves || [])) for (const it of (g.items || [])) if (it && it.id) for (let k = 0; k < (it.count || 1); k++) outSeed.push(it.id)
          }
          const { id, channel, present } = rooms.join(send, { name: m.name, race: m.race, map: m.map, x: m.x, y: m.y, dir: m.dir, channel: m.channel, spectator: m.spectator, gfx: m.gfx, accountId: conn.accountId, gold, inv, outSeed })
          conn.playerId = id
          send({ t: 'present', you: id, players: present, map: m.map, channel })
          if (!m.spectator) { send({ t: 'gold', gold, reason: 'init' }); send({ t: 'inv', inv: rooms.invOf(conn.accountId) }) }   // sincroniza saldo + bag
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

        case 'php': {        // vida del jugador (para su barra que ven los demás)
          if (conn.playerId == null) return
          return rooms.playerHp(conn.playerId, m.hp, m.hpMax)
        }

        case 'atk': {        // pedido de ataque a un enemigo (lo valida la simulación)
          if (conn.playerId == null) return
          return rooms.attack(conn.playerId, m.eid)
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
          return send({ t: 'bagack', op: 'dump', ...rooms.dumpBag(conn.playerId) })
        }
        case 'spend': {      // sink genérico: reparar / forjar / respec / ofrenda (el efecto local lo aplica el cliente)
          if (conn.playerId == null) return
          return send({ t: 'spendack', reason: m.reason, ...rooms.spendGold(conn.playerId, m.amount, m.reason) })
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
  })
  ws.on('error', () => {})
})

http_server.listen(PORT, () => {
  console.log(`[velgrim] servidor escuchando en :${PORT} (ws + http)`)
})
