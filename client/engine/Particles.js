// Partículas ambientales baratas (Pixi). Emisores en pixel de mundo: luciérnagas
// sobre la plaza, brillo mágico que sube del obelisco y las estatuas. Pool de sprites,
// tope de partículas, sin física cara. Barato para el presupuesto móvil.
import { Container, Graphics, Sprite } from 'pixi.js'

function makeDotTexture(renderer) {
  const g = new Graphics()
  // dot suave: círculos concéntricos con alpha creciente hacia el centro
  const steps = [[10, 0.06], [7, 0.12], [4, 0.3], [2, 0.7]]
  for (const [r, a] of steps) g.circle(12, 12, r).fill({ color: 0xffffff, alpha: a })
  const tex = renderer.generateTexture(g)
  g.destroy()
  return tex
}

export class ParticleField {
  constructor(renderer) {
    this.container = new Container()
    this.tex = makeDotTexture(renderer)
    this.emitters = []
    this.free = []
  }

  // cfg: { x, y, rx, ry, rate, tint, size, vy, spread, life }
  addEmitter(cfg) {
    this.emitters.push({
      x: cfg.x, y: cfg.y, rx: cfg.rx ?? 4, ry: cfg.ry ?? 4,
      rate: cfg.rate ?? 6, tint: cfg.tint ?? 0xffcf5a, size: cfg.size ?? 1,
      vy: cfg.vy ?? -8, spread: cfg.spread ?? 6, life: cfg.life ?? 2.2,
      acc: 0, parts: [],
    })
  }

  _acquire() {
    const s = this.free.pop() || new Sprite(this.tex)
    s.anchor.set(0.5)
    s.visible = true
    if (!s.parent) this.container.addChild(s)
    return s
  }

  update(dt, sinTime) {
    for (const e of this.emitters) {
      e.acc += e.rate * dt
      while (e.acc >= 1 && this.container.children.length < 220) {
        e.acc -= 1
        const s = this._acquire()
        const p = {
          s,
          x: e.x + (Math.random() * 2 - 1) * e.rx,
          y: e.y + (Math.random() * 2 - 1) * e.ry,
          vx: (Math.random() * 2 - 1) * e.spread,
          vy: e.vy + (Math.random() * 2 - 1) * e.spread * 0.4,
          t: 0, life: e.life * (0.7 + Math.random() * 0.6),
          size: e.size * (0.6 + Math.random() * 0.8),
          ph: Math.random() * 6.28,
        }
        s.tint = e.tint
        e.parts.push(p)
      }
      for (let i = e.parts.length - 1; i >= 0; i--) {
        const p = e.parts[i]
        p.t += dt
        if (p.t >= p.life) {
          p.s.visible = false
          this.free.push(p.s)
          e.parts.splice(i, 1)
          continue
        }
        const k = p.t / p.life
        p.x += (p.vx + Math.sin(sinTime * 1.5 + p.ph) * 6) * dt
        p.y += p.vy * dt
        p.s.x = p.x
        p.s.y = p.y
        // fade in/out (triángulo) + leve pulso
        p.s.alpha = Math.sin(k * Math.PI) * 0.9
        p.s.scale.set(p.size * (0.8 + 0.2 * Math.sin(sinTime * 3 + p.ph)))
      }
    }
  }
}
