// Fauna ambiental: bandadas de pájaros cruzando el cielo de día, murciélagos erráticos de
// noche. Siluetas procedurales (sin assets), en pixel de pantalla, esporádicas y con tope.
// Suma vida al mundo aunque no haya jugadores — se ve también en modo espectador.
import { Container, Graphics, Sprite } from 'pixi.js'

function birdTex(renderer, up) {
  const g = new Graphics()
  const midY = up ? 1 : 6
  g.moveTo(0, 7).lineTo(9, midY).lineTo(18, 7).stroke({ width: 2, color: 0xffffff, cap: 'round', join: 'round' })
  const tex = renderer.generateTexture(g); g.destroy(); return tex
}

const rnd = (a, b) => a + Math.random() * (b - a)

export class Fauna {
  constructor(renderer) {
    this.renderer = renderer
    this.layer = new Container()
    this.layer.eventMode = 'none'
    this.up = birdTex(renderer, true)
    this.down = birdTex(renderer, false)
    this.critters = []          // { s, x, y, vx, vy, ph, flap, bat }
    this.pool = []
    this.w = 0; this.h = 0
    this.t = 0
    this.next = rnd(3, 8)       // segundos hasta la próxima bandada
  }

  resize(w, h) { this.w = w; this.h = h }

  _acquire() {
    const s = this.pool.pop() || new Sprite()
    s.texture = this.up; s.anchor.set(0.5); s.visible = true
    if (!s.parent) this.layer.addChild(s)
    return s
  }

  _release(c) { c.s.visible = false; this.pool.push(c.s) }

  // Suelta una bandada de pájaros (día) o unos murciélagos (noche).
  _spawn(isNight) {
    if (!this.w) return
    const dir = Math.random() < 0.5 ? 1 : -1
    if (isNight) {
      const n = Math.round(rnd(2, 4))
      for (let i = 0; i < n; i++) {
        const s = this._acquire()
        s.tint = 0x0c0c14; s.alpha = 0.8; s.scale.set(rnd(0.5, 0.8))
        this.critters.push({ s, x: rnd(0, this.w), y: rnd(this.h * 0.05, this.h * 0.4),
          vx: dir * rnd(40, 80), vy: 0, ph: rnd(0, 6.28), flap: rnd(0.05, 0.1), fa: 0, bat: true })
      }
    } else {
      const n = Math.round(rnd(3, 6))
      const baseY = rnd(this.h * 0.06, this.h * 0.34)
      const vx = dir * rnd(55, 95)
      for (let i = 0; i < n; i++) {
        const s = this._acquire()
        s.tint = 0x1a1a24; s.alpha = 0.7; s.scale.set(rnd(0.6, 1))
        this.critters.push({ s, x: (dir > 0 ? -30 : this.w + 30) - dir * i * rnd(20, 34),
          y: baseY + rnd(-14, 14), vx, vy: 0, ph: rnd(0, 6.28), flap: rnd(0.14, 0.2), fa: 0, bat: false })
      }
    }
  }

  update(dt, isNight) {
    this.t += dt
    this.next -= dt
    if (this.next <= 0 && this.critters.length < 40) {
      this._spawn(isNight)
      this.next = isNight ? rnd(9, 18) : rnd(12, 26)
    }
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const c = this.critters[i]
      c.fa += dt
      if (c.fa >= c.flap) { c.fa = 0; c.s.texture = c.s.texture === this.up ? this.down : this.up }
      if (c.bat) { // vuelo errático
        c.x += (c.vx + Math.sin(this.t * 3 + c.ph) * 30) * dt
        c.y += Math.sin(this.t * 4 + c.ph * 2) * 40 * dt
      } else {     // planeo suave
        c.x += c.vx * dt
        c.y += Math.sin(this.t * 0.8 + c.ph) * 8 * dt
      }
      c.s.x = c.x; c.s.y = c.y
      c.s.scale.x = c.vx < 0 ? -Math.abs(c.s.scale.x) : Math.abs(c.s.scale.x) // mira hacia donde va
      if (c.x < -60 || c.x > this.w + 60) { this._release(c); this.critters.splice(i, 1) }
    }
  }

  destroy() {
    for (const c of this.critters) c.s.destroy()
    this.critters.length = 0; this.pool.length = 0
    this.layer.destroy({ children: true })
    this.up.destroy(true); this.down.destroy(true)
  }
}
