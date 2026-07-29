// Ciclo día/noche con LUZ DEL PERSONAJE integrada. En vez de una cortina uniforme + un halo aditivo
// encima (que se veía "nublado"), la oscuridad es UNA sola viñeta radial centrada en el jugador:
// el centro es TRANSPARENTE (el área del personaje se ve clara, la escena normal, sin nada encima) y
// se oscurece hacia los bordes con el color/opacidad de la hora. Barato (un sprite de pantalla, más
// que el rect de 8000×8000 de antes) y da el efecto "farol en la oscuridad" sin mask ni render-group.
import { Sprite, Texture } from 'pixi.js'

// Keyframes del ciclo (t en [0,1)): color de la oscuridad + alpha. Se interpola entre ellos.
const KEYS = [
  { t: 0.00, c: 0x0a1234, a: 0.72 },  // noche cerrada (azul profundo) — más alpha que antes: la
  { t: 0.18, c: 0x3a2a52, a: 0.42 },  // viñeta sólo tapa los BORDES, así que puede ser más densa.
  { t: 0.26, c: 0x201810, a: 0.00 },  // mañana, despejado
  { t: 0.66, c: 0x201810, a: 0.00 },  // día, despejado
  { t: 0.78, c: 0x5a2410, a: 0.38 },  // atardecer (ámbar)
  { t: 0.88, c: 0x0a1234, a: 0.72 },  // anochecer
  { t: 1.00, c: 0x0a1234, a: 0.72 },
]

const CYCLE_S = 900   // un día entero cada 15 min reales

function lerp(a, b, k) { return a + (b - a) * k }
function lerpColor(c1, c2, k) {
  const r = lerp((c1 >> 16) & 255, (c2 >> 16) & 255, k)
  const g = lerp((c1 >> 8) & 255, (c2 >> 8) & 255, k)
  const b = lerp(c1 & 255, c2 & 255, k)
  return (r << 16) | (g << 8) | b
}

// Textura de viñeta: centro TRANSPARENTE (área clara del personaje), opaco (blanco, tinteable) hacia
// afuera. Al tintear con el color de la noche y variar el alpha, la escena queda clara alrededor del
// jugador y oscura en los bordes. El pool claro es el 12% central; a partir de ~30% está lleno.
let _vigTex = null
function makeVignetteTexture(size = 512) {
  if (_vigTex) return _vigTex
  const cnv = document.createElement('canvas'); cnv.width = cnv.height = size
  const ctx = cnv.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0)')       // centro: totalmente claro
  g.addColorStop(0.12, 'rgba(255,255,255,0)')     // pool claro alrededor del personaje
  g.addColorStop(0.22, 'rgba(255,255,255,0.55)')  // caída rápida al borde del pool
  g.addColorStop(0.34, 'rgba(255,255,255,0.92)')
  g.addColorStop(0.55, 'rgba(255,255,255,1)')     // lleno hacia afuera (y las esquinas del cuadro)
  g.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
  _vigTex = Texture.from(cnv)
  return _vigTex
}

export class DayNight {
  // startPhase: 0..1 (0.34 ≈ media mañana) para no arrancar de noche.
  constructor(startPhase = 0.34) {
    this.t = startPhase
    // `rect` (nombre histórico) ahora es el sprite de viñeta. El Game lo agrega al stage, lo culea por
    // `_outdoor` y llama a place() cada frame para centrarlo en el jugador.
    this.rect = new Sprite(makeVignetteTexture())
    this.rect.anchor.set(0.5)
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
    this.light = 1 - this.rect.alpha / 0.72
  }

  // Centra la viñeta en (x,y) [pantalla] y la escala para cubrir un radio `coverR` (media diagonal de
  // la pantalla + margen), así los bordes/esquinas quedan oscuros aunque el jugador esté descentrado.
  place(x, y, coverR) {
    this.rect.position.set(x, y)
    const s = Math.max(0.1, coverR / 256)   // la textura mide 512 (radio 256)
    this.rect.scale.set(s)
  }

  update(dt) {
    this.t = (this.t + dt / CYCLE_S) % 1
    this._apply()
  }

  destroy() { this.rect.destroy() }
}
