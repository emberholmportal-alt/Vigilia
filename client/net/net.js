// Cliente WebSocket de Velgrim: habla con el servidor autoritativo (server/index.js).
// Auth por RPC (promesas) y presencia por eventos. El juego single-player sigue andando sin
// esto; el online es opt-in (config.js). El protocolo es JSON `{ t, ... }`.

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
const host = typeof location !== 'undefined' ? location.hostname : 'localhost'
const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(host)

// Servidor autoritativo en Render. Se puede sobreescribir con VITE_WS_URL (build) o ?ws= (URL).
const PROD_WS = 'wss://velgrim-static.onrender.com'
export const WS_URL =
  (import.meta.env && import.meta.env.VITE_WS_URL) ||
  params.get('ws') ||
  (isLocal ? `ws://${host}:8790` : PROD_WS)

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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve()
    return new Promise((res, rej) => {
      try { this.ws = new WebSocket(url) } catch (e) { return rej(e) }
      this.ws.onopen = () => { this.connected = true; res() }
      this.ws.onerror = (e) => { if (!this.connected) rej(new Error('no se pudo conectar')) }
      this.ws.onclose = () => { this.connected = false; this._emit('close', {}) }
      this.ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data) } catch { return }
        // resolver RPC pendientes por tipo
        for (let i = 0; i < this._onceWaiters.length; i++) {
          if (this._onceWaiters[i].type === m.t) { const w = this._onceWaiters.splice(i, 1)[0]; w.res(m); break }
        }
        // eventos de presencia
        if (m.t === 'present' || m.t === 'join' || m.t === 'move' || m.t === 'leave' || m.t === 'chat') this._emit(m.t, m)
      }
    })
  }

  _send(o) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(o)) }

  async register(user, pass) { this._send({ t: 'register', user, pass }); return this._once('auth') }
  async login(user, pass) { this._send({ t: 'login', user, pass }); return this._once('auth') }
  async resume(token) { this._send({ t: 'resume', token }); return this._once('auth') }
  async walletChallenge(pubkey) { this._send({ t: 'wallet_challenge', pubkey }); return this._once('challenge') }
  async walletVerify(pubkey, signature) { this._send({ t: 'wallet_verify', pubkey, signature }); return this._once('auth') }
  async save(name, race, char) { this._send({ t: 'save', name, race, char }); return this._once('saved') }
  async join({ name, race, map, x, y, dir, channel, spectator }) { this._send({ t: 'join', name, race, map, x, y, dir, channel, spectator }); return this._once('present') }

  move(map, x, y, dir) { this._send({ t: 'move', map, x, y, dir }) }
  chat(text) { this._send({ t: 'chat', text }) }
  close() { try { this.ws?.close() } catch {} }
}

export const net = new Net()

// URL HTTP del server (para /stats): wss->https, ws->http.
export const serverHttp = () => WS_URL.replace(/^ws/, 'http')
export async function fetchStats() {
  try { const r = await fetch(serverHttp() + '/stats'); return await r.json() } catch { return null }
}
