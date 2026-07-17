// Cliente WebSocket de Velgrim: habla con el servidor autoritativo (server/index.js).
// Auth por RPC (promesas) y presencia por eventos. El juego single-player sigue andando sin
// esto; el online es opt-in (config.js). El protocolo es JSON `{ t, ... }`.

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
const host = typeof location !== 'undefined' ? location.hostname : 'localhost'
const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(host)

// Servidor autoritativo en Render. Se sobreescribe con VITE_WS_URL (horneado en el build; ver
// render.yaml) o con ?ws= en la URL. El fallback DEBE apuntar al web service del server
// (velgrim-server), no al sitio estático. En local, al mismo puerto que usa `npm run server` (8787).
const PROD_WS = 'wss://velgrim-static.onrender.com'
export const WS_URL =
  (import.meta.env && import.meta.env.VITE_WS_URL) ||
  params.get('ws') ||
  (isLocal ? `ws://${host}:8787` : PROD_WS)

// Online: en producción (no localhost) va por defecto; en local, opt-in con ?online=1 o VITE_WS_URL.
export const ONLINE =
  params.get('online') === '1' ||
  !!(import.meta.env && import.meta.env.VITE_WS_URL) ||
  !isLocal

class Net {
  constructor() {
    this.ws = null
    this.connected = false
    this._handlers = {}          // evento -> Set(cb)  (present/join/move/leave/chat)
    this._onceWaiters = []       // { type, res }
  }

  on(evt, cb) { (this._handlers[evt] ||= new Set()).add(cb); return () => this._handlers[evt]?.delete(cb) }
  _emit(evt, msg) { const h = this._handlers[evt]; if (h) for (const cb of h) cb(msg) }
  _once(type, ms = 6000) {
    return new Promise((res, rej) => {
      const w = { type, res }
      this._onceWaiters.push(w)
      setTimeout(() => { const i = this._onceWaiters.indexOf(w); if (i >= 0) { this._onceWaiters.splice(i, 1); rej(new Error('timeout ' + type)) } }, ms)
    })
  }

  connect(url = WS_URL) {
    this._url = url
    this._wantOpen = true
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve()
    return new Promise((res, rej) => {
      try { this.ws = new WebSocket(url) } catch (e) { return rej(e) }
      this.ws.onopen = () => { this.connected = true; this._backoff = 0; res() }
      this.ws.onerror = (e) => { if (!this.connected) rej(new Error('no se pudo conectar')) }
      this.ws.onclose = () => {
        this.connected = false
        this._emit('close', {})
        if (this._wantOpen) this._scheduleReconnect()   // caída no intencional (móvil, red): reintenta
      }
      this.ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data) } catch { return }
        // resolver RPC pendientes por tipo
        for (let i = 0; i < this._onceWaiters.length; i++) {
          if (this._onceWaiters[i].type === m.t) { const w = this._onceWaiters.splice(i, 1)[0]; w.res(m); break }
        }
        // eventos de presencia
        if (m.t === 'present' || m.t === 'join' || m.t === 'move' || m.t === 'leave' || m.t === 'chat') this._emit(m.t, m)
        // eventos de combate autoritativo (enemigos del servidor)
        else if (m.t === 'espawn' || m.t === 'estate' || m.t === 'edmg' || m.t === 'edie' || m.t === 'ekill' || m.t === 'ehit') this._emit(m.t, m)
        // nodos de recursos autoritativos (compartidos por canal)
        else if (m.t === 'nspawn' || m.t === 'ndeplete' || m.t === 'ngather') this._emit(m.t, m)
        // cofres autoritativos (compartidos por canal)
        else if (m.t === 'cspawn' || m.t === 'copen' || m.t === 'cloot') this._emit(m.t, m)
        // muerte / reaparición de otros jugadores (co-op)
        else if (m.t === 'pdied' || m.t === 'palive') this._emit(m.t, m)
        // equipo visible de otro jugador (cambió su gear)
        else if (m.t === 'gfx') this._emit(m.t, m)
        // vida de otro jugador (para su barra)
        else if (m.t === 'php') this._emit(m.t, m)
      }
    })
  }

  // Reconexión con backoff exponencial (2s→4s→…→cap 30s). Al reabrir el socket, emite
  // 'reconnect' para que el juego re-autentique (resume) y re-anuncie su mapa. Clave en móvil.
  _scheduleReconnect() {
    if (this._reconnectT) return
    this._backoff = Math.min(30000, (this._backoff || 1000) * 2)
    this._reconnectT = setTimeout(async () => {
      this._reconnectT = null
      if (!this._wantOpen) return
      try {
        await this.connect(this._url)
        this._emit('reconnect', {})
      } catch { this._scheduleReconnect() }
    }, this._backoff)
  }

  _send(o) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(o)) }

  async register(user, pass) { this._send({ t: 'register', user, pass }); return this._once('auth') }
  async login(user, pass) { this._send({ t: 'login', user, pass }); return this._once('auth') }
  async resume(token) { this._send({ t: 'resume', token }); return this._once('auth') }
  async walletChallenge(pubkey) { this._send({ t: 'wallet_challenge', pubkey }); return this._once('challenge') }
  async walletVerify(pubkey, signature) { this._send({ t: 'wallet_verify', pubkey, signature }); return this._once('auth') }
  async save(name, race, char) { this._send({ t: 'save', name, race, char }); return this._once('saved') }
  async join({ name, race, map, x, y, dir, channel, spectator, gfx }) { this._send({ t: 'join', name, race, map, x, y, dir, channel, spectator, gfx }); return this._once('present') }
  setGfx(gfx) { this._send({ t: 'setgfx', gfx }) }           // equipo visible (capas del paperdoll)
  hp(hp, hpMax) { this._send({ t: 'php', hp, hpMax }) }      // mi vida (para la barra que ven los demás)

  move(map, x, y, dir) { this._send({ t: 'move', map, x, y, dir }) }
  chat(text) { this._send({ t: 'chat', text }) }
  setStats(stats) { this._send({ t: 'setstats', stats }) }   // stats de combate (server tira el daño)
  attack(eid) { this._send({ t: 'atk', eid }) }              // pedir ataque a un enemigo del server
  gather(nid) { this._send({ t: 'gather', nid }) }           // pedir juntar un nodo de recurso
  openChest(cid) { this._send({ t: 'openchest', cid }) }     // pedir abrir un cofre del server
  dead() { this._send({ t: 'pdead' }) }                      // avisar que morí (co-op)
  alive(x, y, dir) { this._send({ t: 'palive', x, y, dir }) }  // avisar que reaparecí

  // Gremios (WORLD.md): RPC contra el server autoritativo. Todas responden `t:'guild'`, salvo
  // el ranking (`t:'guild_list'`). Awaitéalas en orden (comparten el tipo de respuesta).
  async guildInfo(id) { this._send({ t: 'guild_info', id }); return this._once('guild') }
  async guildList(limit = 20) { this._send({ t: 'guild_list', limit }); return this._once('guild_list') }
  async guildCreate(name, tag, color) { this._send({ t: 'guild_create', name, tag, color }); return this._once('guild') }
  async guildJoin({ id, tag }) { this._send({ t: 'guild_join', id, tag }); return this._once('guild') }
  async guildLeave() { this._send({ t: 'guild_leave' }); return this._once('guild') }
  async guildDonate(amount) { this._send({ t: 'guild_donate', amount }); return this._once('guild') }
  // Depósito del Gremio (banco compartido). Responden `t:'guild_dep'`.
  async guildDepView() { this._send({ t: 'guild_dep_view' }); return this._once('guild_dep') }
  async guildDepGold(dir, amount) { this._send({ t: 'guild_dep_gold', dir, amount }); return this._once('guild_dep') }
  async guildDepItemIn(item) { this._send({ t: 'guild_dep_item_in', item }); return this._once('guild_dep') }
  async guildDepItemOut(index) { this._send({ t: 'guild_dep_item_out', index }); return this._once('guild_dep') }
  close() { this._wantOpen = false; if (this._reconnectT) { clearTimeout(this._reconnectT); this._reconnectT = null } try { this.ws?.close() } catch {} }
}

export const net = new Net()

// URL HTTP del server (para /stats): wss->https, ws->http.
export const serverHttp = () => WS_URL.replace(/^ws/, 'http')
export async function fetchStats() {
  try { const r = await fetch(serverHttp() + '/stats'); return await r.json() } catch { return null }
}
