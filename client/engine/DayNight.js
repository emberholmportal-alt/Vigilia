// Ciclo día/noche: una cortina de color a pantalla completa cuyo tinte y opacidad cambian con
// la hora del mundo. Barato (un solo sprite tinteado) y de mucho impacto: el pueblo de día no
// se siente igual que de noche. Expone `isNight` y `light` para que otros sistemas (fauna,
// antorchas) reaccionen. Ciclo comprimido para que en una sesión veas amanecer y anochecer.
import { Graphics } from 'pixi.js'

// Keyframes del ciclo (t en [0,1)): color de la cortina + alpha. Se interpola entre ellos.
const KEYS = [
  { t: 0.00, c: 0x0a1234, a: 0.56 },  // noche cerrada (azul profundo)
  { t: 0.18, c: 0x3a2a52, a: 0.34 },  // amanecer (violeta)
  { t: 0.26, c: 0x201810, a: 0.00 },  // mañana, despejado
  { t: 0.66, c: 0x201810, a: 0.00 },  // día, despejado
  { t: 0.78, c: 0x5a2410, a: 0.30 },  // atardecer (ámbar)
  { t: 0.88, c: 0x0a1234, a: 0.56 },  // anochecer
  { t: 1.00, c: 0x0a1234, a: 0.56 },
]

const CYCLE_S = 900   // un día entero cada 15 min reales

function lerp(a, b, k) { return a + (b - a) * k }
function lerpColor(c1, c2, k) {
  const r = lerp((c1 >> 16) & 255, (c2 >> 16) & 255, k)
  const g = lerp((c1 >> 8) & 255, (c2 >> 8) & 255, k)
  const b = lerp(c1 & 255, c2 & 255, k)
  return (r << 16) | (g << 8) | b
}

export class DayNight {
  // startPhase: 0..1 (0.35 ≈ media mañana) para no arrancar de noche.
  constructor(startPhase = 0.34) {
    this.t = startPhase
    this.rect = new Graphics()
    this.rect.rect(0, 0, 8000, 8000).fill({ color: 0xffffff })
    this.rect.eventMode = 'none'
    this.rect.alpha = 0
    this.isNight = false
    this.light = 1        // 1 = pleno día, 0 = noche cerrada
    this._apply()
  }

  _apply() {
    let i = 0
    while (i < KEYS.length - 1 && this.t >= KEYS[i + 1].t) i++
    const a = KEYS[i], b = KEYS[i + 1] || KEYS[i]
    const span = (b.t - a.t) || 1
    const k = Math.max(0, Math.min(1, (this.t - a.t) / span))
    this.rect.tint = lerpColor(a.c, b.c, k)
    this.rect.alpha = lerp(a.a, b.a, k)
    this.isNight = this.t < 0.22 || this.t > 0.84
    this.light = 1 - this.rect.alpha / 0.56
  }

  update(dt) {
    this.t = (this.t + dt / CYCLE_S) % 1
    this._apply()
  }

  destroy() { this.rect.destroy() }
}
