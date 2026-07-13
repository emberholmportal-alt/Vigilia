// Tumba del jugador: donde caíste, tu carga (inventario + parte del oro) queda esperando.
// Una lápida con cruz, un aura tenue y una etiqueta flotante. Se recupera al caminarle encima
// o tocándola. Riesgo estilo Kintara: si morís de nuevo antes de volver, sumás otra tumba.
import { Container, Graphics, Text } from 'pixi.js'

export class Grave {
  constructor(iso, grave) {
    this.iso = iso
    this.grave = grave
    this.tx = grave.tx
    this.ty = grave.ty
    this.taken = false
    this._t = Math.random() * Math.PI * 2
    this._cd = 0                       // anti-spam del intento de recuperación

    this.view = new Container()
    this.view.x = iso.toWorldX(this.tx, this.ty)
    this.view.y = iso.toWorldY(this.tx, this.ty)
    this.view.zIndex = this.tx + this.ty

    const g = new Graphics()
    // aura fría en el piso
    g.ellipse(0, 0, iso.wHalf * 0.42, iso.hHalf * 0.4).fill({ color: 0x6a5acd, alpha: 0.2 })
    // sombra
    g.ellipse(0, 2, iso.wHalf * 0.3, iso.hHalf * 0.28).fill({ color: 0x000000, alpha: 0.35 })
    // lápida (losa redondeada) + cruz
    g.roundRect(-13, -42, 26, 42, 7).fill({ color: 0x565059 }).stroke({ color: 0x2a2730, width: 2 })
    g.rect(-3, -55, 6, 18).fill(0x6d6772)
    g.rect(-9, -49, 18, 5).fill(0x6d6772)
    this.view.addChild(g)
    this.slab = g

    this.label = new Text({
      text: '☠ Tu tumba', style: {
        fontFamily: 'Georgia, serif', fontSize: 11, fill: '#c9b3e6',
        stroke: { color: '#0a090c', width: 3 }, align: 'center',
      },
    })
    this.label.anchor.set(0.5, 1)
    this.label.y = -60
    this.view.addChild(this.label)

    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  update(dt) {
    this._t += dt
    if (this._cd > 0) this._cd -= dt
    this.slab.alpha = 0.9 + 0.1 * Math.sin(this._t * 2)
    this.label.y = -60 + Math.sin(this._t * 1.6) * 1.5
  }

  destroy() { this.view.destroy({ children: true }) }
}
