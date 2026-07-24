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

// Billetera OBLIGATORIA para jugar en producción (no-localhost). En dev/local queda opcional para
// poder testear con una cuenta de dispositivo (sin extensión de wallet). El servidor lo refuerza
// aparte (WALLET_REQUIRED): rechaza el login por contraseña, así no hay bypass.
export const WALLET_REQUIRED = !isLocal

class Net {
  constructor() {
    this.ws = null
    this.connected = false
    this._handlers = {}          // evento -> Set(cb)  (present/join/move/leave/chat)
    this._onceWaiters = []       // { type, res }
  }

  on(evt, cb) { (this._handlers[evt] ||= new Set()).add(cb); return () => this._handlers[evt]?.delete(cb) }
  _emit(evt, msg) { const h = this._handlers[evt]; if (h) for (const cb of h) cb(msg) }
  _once(type, ms = 6000, op = null) {
    return new Promise((res, rej) => {
      const w = { type, op, res }
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
        // resolver RPC pendientes por tipo (y por `op` si el waiter lo pide — p.ej. el mercado
        // responde varios op bajo el mismo t:'market').
        for (let i = 0; i < this._onceWaiters.length; i++) {
          const w = this._onceWaiters[i]
          if (w.type === m.t && (w.op == null || w.op === m.op)) { this._onceWaiters.splice(i, 1); w.res(m); break }
        }
        // expulsado por single-session (la cuenta entró desde otro lado): NO reconectar (evita el
        // ping-pong con la nueva sesión), y avisar a la app para volver al inicio.
        if (m.t === 'kicked') { this._wantOpen = false; this._emit('kicked', m); return }
        // eventos de presencia
        if (m.t === 'present' || m.t === 'join' || m.t === 'move' || m.t === 'leave' || m.t === 'chat') this._emit(m.t, m)
        // eventos de combate autoritativo (enemigos del servidor)
        else if (m.t === 'espawn' || m.t === 'estate' || m.t === 'edmg' || m.t === 'edie' || m.t === 'ekill' || m.t === 'ehit') this._emit(m.t, m)
        // nodos de recursos autoritativos (compartidos por canal)
        else if (m.t === 'nspawn' || m.t === 'ndeplete' || m.t === 'ngather') this._emit(m.t, m)
        // cofres autoritativos (compartidos por canal)
        else if (m.t === 'cspawn' || m.t === 'copen' || m.t === 'cloot') this._emit(m.t, m)
        // oro AUTORITATIVO del servidor (faucet: kill/cofre/misión) — push con el nuevo saldo
        else if (m.t === 'gold') this._emit('gold', m)
        // sellos AUTORITATIVOS del servidor (faucet: misiones/quest; sink: cofre de sellos)
        else if (m.t === 'seals') this._emit('seals', m)
        // inventario AUTORITATIVO del servidor (bag) — push con el bag nuevo (loot/compra/venta/uso)
        else if (m.t === 'inv') this._emit('inv', m)
        // trade P2P: pedido entrante, apertura, estado (ofertas + confirmaciones), cierre, cancelación
        else if (m.t === 'trade_req' || m.t === 'trade_open' || m.t === 'trade_state' || m.t === 'trade_done' || m.t === 'trade_cancel') this._emit(m.t, m)
        // muerte / reaparición de otros jugadores (co-op)
        else if (m.t === 'pdied' || m.t === 'palive') this._emit(m.t, m)
        // equipo visible de otro jugador (cambió su gear)
        else if (m.t === 'gfx') this._emit(m.t, m)
        // vida de otro jugador (para su barra)
        else if (m.t === 'php') this._emit(m.t, m)
        // nivel de otro jugador (cambió al subir) — para el menú de jugador
        else if (m.t === 'plvl') this._emit(m.t, m)
        // tarjeta pública de otro jugador (respuesta a inspect)
        else if (m.t === 'inspect') this._emit(m.t, m)
        // mis propias hazañas (server-owned): al entrar y al ganar un jefe / alcanzar una zona
        else if (m.t === 'feats') this._emit(m.t, m)
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
  async join({ name, race, body, map, x, y, dir, channel, spectator, gfx }) { this._send({ t: 'join', name, race, body, map, x, y, dir, channel, spectator, gfx }); return this._once('present') }
  setGfx(gfx) { this._send({ t: 'setgfx', gfx }) }           // equipo visible (capas del paperdoll)
  hp(hp, hpMax) { this._send({ t: 'php', hp, hpMax }) }      // mi vida (para la barra que ven los demás)

  move(map, x, y, dir) { this._send({ t: 'move', map, x, y, dir }) }
  chat(text) { this._send({ t: 'chat', text }) }
  setStats(stats) { this._send({ t: 'setstats', stats }) }   // stats de combate (server tira el daño)
  setCard(card) { this._send({ t: 'setcard', card }) }       // tarjeta pública (lo que ven al inspeccionarme)
  inspect(id) { this._send({ t: 'inspect', id }) }           // pedir la tarjeta pública de otro jugador
  attack(eid) { this._send({ t: 'atk', eid }) }              // pedir ataque a un enemigo del server
  cast(hits) { this._send({ t: 'cast', hits }) }             // habilidad M2: enemigos alcanzados + daño (server valida/aplica)
  gather(nid) { this._send({ t: 'gather', nid }) }           // pedir juntar un nodo de recurso
  openChest(cid) { this._send({ t: 'openchest', cid }) }     // pedir abrir un cofre del server

  // --- Economía: oro autoritativo del servidor (Fase A). Los faucets del mundo (kill/cofre) llegan
  // por el push 'gold'; estos son los pedidos del cliente (sinks + faucets secundarios) con su ack.
  async sellReq(index) { this._send({ t: 'sell', index }); return this._once('sellack') }   // vender por índice del bag
  async useReq(index) { this._send({ t: 'use', index }); return this._once('useack') }      // usar consumible por índice del bag
  async buyReq(id) { this._send({ t: 'buy', id }); return this._once('buyack') }
  // Transferencias del bag autoritativo (equipar/desequipar/cinturón/tumba/forja). Awaitéalas en
  // orden (comparten el tipo de respuesta 'bagack'). Cada una devuelve el bag nuevo para espejarlo.
  async bagTake(index, qty = 1) { this._send({ t: 'bag_take', index, qty }); return this._once('bagack') }
  async bagGive(item) { this._send({ t: 'bag_give', item }); return this._once('bagack') }
  async bagConsume(id, qty) { this._send({ t: 'bag_consume', id, qty }); return this._once('bagack') }
  async bagDump() { this._send({ t: 'bag_dump' }); return this._once('bagack') }
  async craftReq(out) { this._send({ t: 'craft', out }); return this._once('craftack') }   // alquimia autoritativa (server valida receta+materiales)
  // Trade P2P (los eventos llegan por on('trade_*'); el server hace el swap atómico).
  tradeReq(to) { this._send({ t: 'trade_req', to }) }
  tradeAccept(from) { this._send({ t: 'trade_accept', from }) }
  tradeOffer(items, gold) { this._send({ t: 'trade_offer', items, gold }) }   // items = índices del bag
  tradeConfirm() { this._send({ t: 'trade_confirm' }) }
  tradeCancel() { this._send({ t: 'trade_cancel' }) }
  // Mercado (casa de subastas, precio fijo). Todas responden t:'market' con su `op`.
  async marketBrowse() { this._send({ t: 'market_browse' }); return this._once('market', 6000, 'browse') }
  async marketMine() { this._send({ t: 'market_mine' }); return this._once('market', 6000, 'mine') }
  async marketList(index, price) { this._send({ t: 'market_list', index, price }); return this._once('market', 6000, 'list') }
  async marketBuy(id) { this._send({ t: 'market_buy', id }); return this._once('market', 6000, 'buy') }
  async marketCancel(id) { this._send({ t: 'market_cancel', id }); return this._once('market', 6000, 'cancel') }
  // Marketplace oro↔$VEL (order book P2P, pago on-chain). Responden t:'goldmkt' con su `op`.
  async goldConfig() { this._send({ t: 'goldmkt_config' }); return this._once('goldmkt', 6000, 'config') }
  async goldBrowse() { this._send({ t: 'goldmkt_browse' }); return this._once('goldmkt', 6000, 'browse') }
  async goldMine() { this._send({ t: 'goldmkt_mine' }); return this._once('goldmkt', 6000, 'mine') }
  async goldList(gold, price) { this._send({ t: 'goldmkt_list', gold, price }); return this._once('goldmkt', 6000, 'list') }
  async goldCancel(id) { this._send({ t: 'goldmkt_cancel', id }); return this._once('goldmkt', 6000, 'cancel') }
  async goldLock(id) { this._send({ t: 'goldmkt_lock', id }); return this._once('goldmkt', 8000, 'lock') }
  async goldUnlock(id) { this._send({ t: 'goldmkt_unlock', id }); return this._once('goldmkt', 6000, 'unlock') }
  async goldSettle(id, sig) { this._send({ t: 'goldmkt_settle', id, sig }); return this._once('goldmkt', 20000, 'settle') }
  async spendReq(amount, reason) { this._send({ t: 'spend', amount, reason }); return this._once('spendack') }
  async claimMissionReq(id) { this._send({ t: 'claimmission', id }); return this._once('claimack') }
  async claimQuestReq(id) { this._send({ t: 'claimquest', id }); return this._once('claimack') }
  async sealChestReq(level) { this._send({ t: 'sealchest', level }); return this._once('sealack') }
  async dropGraveReq() { this._send({ t: 'dropgrave' }); return this._once('graveack') }
  async recoverGraveReq() { this._send({ t: 'recovergrave' }); return this._once('graveack') }
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
  async guildKick(target) { this._send({ t: 'guild_kick', target }); return this._once('guild') }
  async guildRole(target, role) { this._send({ t: 'guild_role', target, role }); return this._once('guild') }
  async guildTransfer(target) { this._send({ t: 'guild_transfer', target }); return this._once('guild') }
  // Depósito del Gremio (banco compartido). Responden `t:'guild_dep'`.
  async guildDepView() { this._send({ t: 'guild_dep_view' }); return this._once('guild_dep') }
  async guildDepGold(dir, amount) { this._send({ t: 'guild_dep_gold', dir, amount }); return this._once('guild_dep') }
  async guildDepItemIn(index) { this._send({ t: 'guild_dep_item_in', index }); return this._once('guild_dep') }
  async guildDepItemOut(index) { this._send({ t: 'guild_dep_item_out', index }); return this._once('guild_dep') }
  // Alijo privado (personal). Responden `t:'stash'`. Secuenciales, sin op.
  async stashView() { this._send({ t: 'stash_view' }); return this._once('stash') }
  async stashIn(index) { this._send({ t: 'stash_in', index }); return this._once('stash') }
  async stashOut(index) { this._send({ t: 'stash_out', index }); return this._once('stash') }
  async stashGold(dir, amount) { this._send({ t: 'stash_gold', dir, amount }); return this._once('stash') }
  close() { this._wantOpen = false; if (this._reconnectT) { clearTimeout(this._reconnectT); this._reconnectT = null } try { this.ws?.close() } catch {} }
}

export const net = new Net()

// URL HTTP del server (para /stats): wss->https, ws->http.
export const serverHttp = () => WS_URL.replace(/^ws/, 'http')
export async function fetchStats() {
  try { const r = await fetch(serverHttp() + '/stats'); return await r.json() } catch { return null }
}
