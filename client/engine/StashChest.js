// Alijo del pueblo: un cofre personal, plantado en el pueblo, que SÓLO ve su dueño (se dibuja
// client-side por jugador, no es un objeto compartido del mundo). Al tocarlo, el jugador camina
// hasta él y se abre el modal del alijo. Se dibuja con un aura cálida + una etiqueta flotante.
import { Container, Graphics, Text } from 'pixi.js'
import { tt } from '../i18n.js'

export class StashChest {
  constructor(iso, tx, ty) {
    this.iso = iso
    this.tx = tx
    this.ty = ty
    this._t = Math.random() * Math.PI * 2

    this.view = new Container()
    this.view.x = iso.toWorldX(tx, ty)
    this.view.y = iso.toWorldY(tx, ty)
    this.view.zIndex = tx + ty

    const g = new Graphics()
    // aura cálida en el piso (marca que es tuyo)
    g.ellipse(0, 0, iso.wHalf * 0.44, iso.hHalf * 0.42).fill({ color: 0xc9a227, alpha: 0.14 })
    g.ellipse(0, 2, iso.wHalf * 0.32, iso.hHalf * 0.3).fill({ color: 0x000000, alpha: 0.32 })   // sombra
    // cofre de madera con herrajes de bronce
    g.roundRect(-20, -30, 40, 26, 4).fill({ color: 0x4a3623 }).stroke({ color: 0x241a10, width: 2 })   // cuerpo
    g.moveTo(-20, -30).lineTo(0, -40).lineTo(20, -30).fill({ color: 0x5b4429 })                          // tapa
    g.rect(-20, -20, 40, 3).fill(0x7a5c33)                                                                // faja
    g.rect(-3, -22, 6, 8).fill({ color: 0xc9a227 }).stroke({ color: 0x6b5320, width: 1 })                // cerradura de bronce
    this.view.addChild(g)
    this.body = g

    this.label = new Text({
      text: tt('stash_label'), style: {
        fontFamily: 'Georgia, serif', fontSize: 11, fill: '#e6cf8f',
        stroke: { color: '#0a090c', width: 3 }, align: 'center',
      },
    })
    this.label.anchor.set(0.5, 1)
    this.label.y = -46
    this.view.addChild(this.label)

    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  update(dt) {
    this._t += dt
    this.body.alpha = 0.92 + 0.08 * Math.sin(this._t * 2)
    this.label.y = -46 + Math.sin(this._t * 1.6) * 1.3
  }

  destroy() { this.view.destroy({ children: true }) }
}
