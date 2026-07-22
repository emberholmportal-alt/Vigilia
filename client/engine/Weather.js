// Clima y ambiente en pixel de PANTALLA (no de mundo): lluvia, niebla, nieve, brasas, hojas y
// polvo. Barato para el presupuesto móvil: texturas generadas una vez, pool de sprites, tope
// duro de partículas y densidad escalada al viewport. La capa no intercepta el input.
//
// Le da vida al mundo aunque no haya nadie — clave para que el modo espectador no se sienta
// vacío. El tipo de clima se elige por bioma (tileset) o por mapa.
import { Container, Graphics, Sprite } from 'pixi.js'

// Punto suave (gaussiano barato) reutilizado por casi todo.
function softDot(renderer) {
  const g = new Graphics()
  for (const [r, a] of [[12, 0.05], [8, 0.12], [5, 0.3], [2, 0.75]]) g.circle(14, 14, r).fill({ color: 0xffffff, alpha: a })
  const tex = renderer.generateTexture(g); g.destroy(); return tex
}
// Raya vertical con degradé (gota de lluvia).
function streak(renderer) {
  const g = new Graphics()
  g.rect(1, 0, 2, 18).fill({ color: 0xffffff, alpha: 0.5 })
  g.rect(1, 4, 2, 10).fill({ color: 0xffffff, alpha: 0.5 })
  const tex = renderer.generateTexture(g); g.destroy(); return tex
}

// Config por tipo. count = f(area) con tope. Devuelve partículas sembradas en toda la pantalla
// (sin "ola" al arrancar) que se envuelven al salir de cuadro.
const rnd = (a, b) => a + Math.random() * (b - a)

export class Weather {
  constructor(renderer) {
    this.renderer = renderer
    this.layer = new Container()
    this.layer.eventMode = 'none'          // nunca bloquea taps/drag
    this.dot = softDot(renderer)
    this.streak = streak(renderer)
    this.kind = 'none'
    this.w = 0; this.h = 0
    this.parts = []                        // { s, x, y, vx, vy, sway, ph, rot, vr, a }
    this.fog = []                          // blobs persistentes de niebla
    this.pool = []
    this.t = 0
  }

  resize(w, h) { this.w = w; this.h = h; if (this.kind !== 'none') this._rebuild() }

  set(kind) {
    if (kind === this.kind) return
    this.kind = kind || 'none'
    this._rebuild()
  }

  _acquire(tex) {
    const s = this.pool.pop() || new Sprite()
    s.texture = tex; s.anchor.set(0.5); s.visible = true; s.rotation = 0
    if (!s.parent) this.layer.addChild(s)
    return s
  }

  _clear() {
    for (const p of this.parts) { p.s.visible = false; this.pool.push(p.s) }
    for (const f of this.fog) { f.s.visible = false; this.pool.push(f.s) }
    this.parts.length = 0; this.fog.length = 0
  }

  _count(base) {
    const area = (this.w * this.h) / (1280 * 720)
    return Math.max(8, Math.min(base, Math.round(base * area)))
  }

  _rebuild() {
    this._clear()
    if (!this.w || !this.h) return
    const K = this.kind
    if (K === 'fog' || K === 'town') this._buildFog(K === 'town' ? 3 : 5, K === 'town' ? 0x2a1c14 : 0x8894a0, K === 'town' ? 0.05 : 0.1)
    if (K === 'rain') this._buildFall(this._count(190), { tex: this.streak, tint: 0xbcd0e6, a: 0.5, vy: [720, 900], vx: -170, streak: true })
    if (K === 'snow') this._buildFall(this._count(120), { tex: this.dot, tint: 0xffffff, a: 0.85, vy: [55, 120], vx: 0, sway: 22, size: [0.28, 0.6] })
    if (K === 'leaves') this._buildFall(this._count(46), { tex: this.dot, tints: [0x7a8a3a, 0x9a7b2e, 0x5f6b28], a: 0.75, vy: [45, 80], vx: -40, sway: 30, size: [0.35, 0.7], spin: true })
    if (K === 'town') this._buildRise(this._count(48), { tints: [0xff9a3c, 0xffce6a, 0xd9552a], a: 0.8, vy: [40, 75], size: [0.22, 0.5], flicker: true })
    if (K === 'ash') this._buildFall(this._count(70), { tex: this.dot, tints: [0x8a8f97, 0x5a5560], a: 0.5, vy: [30, 70], vx: -18, sway: 16, size: [0.2, 0.45] })
    if (K === 'dust') this._buildFloat(this._count(40), { tint: 0xb8a98a, a: 0.28, size: [0.18, 0.4] })
  }

  // Cae de arriba (lluvia/nieve/hojas/ceniza). Sembrado por toda la pantalla.
  _buildFall(n, o) {
    for (let i = 0; i < n; i++) {
      const s = this._acquire(o.tex)
      s.tint = o.tints ? o.tints[(Math.random() * o.tints.length) | 0] : o.tint
      const size = o.size ? rnd(o.size[0], o.size[1]) : 1
      s.scale.set(o.streak ? 1 : size)
      const vy = rnd(o.vy[0], o.vy[1])
      const p = { s, x: rnd(-40, this.w + 40), y: rnd(-40, this.h + 40),
                  vx: (o.vx || 0), vy, sway: o.sway || 0, ph: rnd(0, 6.28),
                  rot: o.spin ? rnd(0, 6.28) : 0, vr: o.spin ? rnd(-2, 2) : 0, a: o.a, size }
      if (o.streak) s.rotation = Math.atan2(vy, o.vx) - Math.PI / 2
      this.parts.push(p)
    }
  }

  // Sube desde abajo (brasas de la fragua en el pueblo).
  _buildRise(n, o) {
    for (let i = 0; i < n; i++) {
      const s = this._acquire(this.dot)
      s.tint = o.tints[(Math.random() * o.tints.length) | 0]
      const size = rnd(o.size[0], o.size[1]); s.scale.set(size)
      this.parts.push({ s, x: rnd(0, this.w), y: rnd(0, this.h),
        vx: rnd(-10, 10), vy: -rnd(o.vy[0], o.vy[1]), sway: 18, ph: rnd(0, 6.28),
        rot: 0, vr: 0, a: o.a, size, flicker: o.flicker, rise: true })
    }
  }

  // Motas que flotan lento en cualquier dirección (polvo de cueva).
  _buildFloat(n, o) {
    for (let i = 0; i < n; i++) {
      const s = this._acquire(this.dot)
      s.tint = o.tint; const size = rnd(o.size[0], o.size[1]); s.scale.set(size)
      this.parts.push({ s, x: rnd(0, this.w), y: rnd(0, this.h),
        vx: rnd(-12, 12), vy: rnd(-10, 10), sway: 0, ph: rnd(0, 6.28),
        rot: 0, vr: 0, a: o.a, size, float: true })
    }
  }

  // Bancos de niebla: pocos sprites gigantes, muy tenues, que derivan y se envuelven.
  _buildFog(n, tint, alpha) {
    const scale = Math.max(this.w, this.h) / 24
    for (let i = 0; i < n; i++) {
      const s = this._acquire(this.dot)
      s.tint = tint; s.alpha = alpha; s.scale.set(scale * rnd(0.7, 1.3))
      this.fog.push({ s, x: rnd(0, this.w), y: rnd(this.h * 0.15, this.h * 0.9),
        vx: rnd(6, 18) * (Math.random() < 0.5 ? -1 : 1), a: alpha })
    }
  }

  update(dt) {
    if (this.kind === 'none') return
    this.t += dt
    const W = this.w, H = this.h
    for (const p of this.parts) {
      p.x += (p.vx + (p.sway ? Math.sin(this.t * 1.5 + p.ph) * p.sway : 0)) * dt
      p.y += p.vy * dt
      if (p.vr) p.s.rotation += p.vr * dt
      // envolver
      if (p.rise) { if (p.y < -30) { p.y = H + 30; p.x = rnd(0, W) } }
      else if (p.float) {
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20
        if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20
      } else { // cae
        if (p.y > H + 30) { p.y = -30; p.x = rnd(-40, W + 40) }
        if (p.x < -50) p.x = W + 50; else if (p.x > W + 50) p.x = -50
      }
      p.s.x = p.x; p.s.y = p.y
      p.s.alpha = p.flicker ? p.a * (0.55 + 0.45 * Math.sin(this.t * 6 + p.ph)) : p.a
    }
    for (const f of this.fog) {
      f.x += f.vx * dt
      const span = Math.max(W, H) / 24 * 1.3
      if (f.x < -span) f.x = W + span; else if (f.x > W + span) f.x = -span
      f.s.x = f.x; f.s.y = f.y + Math.sin(this.t * 0.3 + f.x * 0.01) * 6
    }
  }

  destroy() {
    this._clear()
    this.layer.destroy({ children: true })
    this.dot.destroy(true); this.streak.destroy(true)
  }
}

// Elige el clima por mapa (casos con carácter) o por bioma (tileset). Pensado para que el
// pueblo se sienta vivo y cada bioma tenga su atmósfera, sin tapar la jugabilidad.
const BY_MAP = {
  triston: 'town', lochport: 'town',
  merrimead_swamp: 'fog', grot_lagoon: 'fog', dilapidated_sewers: 'fog',
  perdition_harbor: 'fog', perdition_mines: 'ash', perdition_harbor_cave: 'ash',
}
const BY_TILESET = {
  tileset_snowplains: 'snow',
  tileset_grassland: 'leaves',
  tileset_cave: 'dust',
  tileset_triston: 'town',
}
export function weatherFor(mapName, tileset) {
  if (BY_MAP[mapName]) return BY_MAP[mapName]
  return BY_TILESET[tileset] || 'none'
}
