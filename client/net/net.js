// Cliente WebSocket de Velgrim: habla con el servidor autoritativo (server/index.js).
// Auth por RPC (promesas) y presencia por eventos. El juego single-player sigue andando sin
// esto; el online es opt-in (config.js). El protocolo es JSON `{ t, ... }`.

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
export const WS_URL =
  (import.meta.env && import.meta.env.VITE_WS_URL) ||
  params.get('ws') ||
  (typeof location !== 'undefined' ? `ws://${location.hostname}:8790` : 'ws://localhost:8790')
// Online activado por ?online=1 o si hay una URL de server configurada en build.
export const ONLINE =
  params.get('online') === '1' || !!(import.meta.env && import.meta.env.VITE_WS_URL)

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
  async save(name, race, char) { this._send({ t: 'save', name, race, char }); return this._once('saved') }
  async join({ name, race, map, x, y, dir }) { this._send({ t: 'join', name, race, map, x, y, dir }); return this._once('present') }

  move(map, x, y, dir) { this._send({ t: 'move', map, x, y, dir }) }
  chat(text) { this._send({ t: 'chat', text }) }
  close() { try { this.ws?.close() } catch {} }
}

export const net = new Net()
