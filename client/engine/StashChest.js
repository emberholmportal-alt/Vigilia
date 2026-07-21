// Alijo del pueblo: un cofre personal, plantado en el pueblo, que SÓLO ve su dueño (se dibuja
// client-side por jugador, no es un objeto compartido del mundo). Al tocarlo, el jugador camina
// hasta él y se abre el modal del alijo. Usa el sprite de cofre REAL de Flare (boss_chest), con un
// aura cálida en el piso para marcar que es tuyo y una etiqueta flotante.
import { Container, Graphics, Sprite, Text } from 'pixi.js'
import { tt } from '../i18n.js'

export class StashChest {
  constructor(iso, tx, ty, tex) {
    this.iso = iso
    this.tx = tx
    this.ty = ty
    this._t = Math.random() * Math.PI * 2

    this.view = new Container()
    this.view.x = iso.toWorldX(tx, ty)
    this.view.y = iso.toWorldY(tx, ty)
    this.view.zIndex = tx + ty

    // aura cálida + sombra en el piso (marca que es tuyo)
    const g = new Graphics()
    g.ellipse(0, 0, iso.wHalf * 0.5, iso.hHalf * 0.46).fill({ color: 0xc9a227, alpha: 0.13 })
    g.ellipse(0, 3, iso.wHalf * 0.36, iso.hHalf * 0.32).fill({ color: 0x000000, alpha: 0.32 })
    this.view.addChild(g)
    this.aura = g

    // cofre real de Flare
    if (tex) {
      const sp = new Sprite(tex)
      sp.anchor.set(0.5, 0.86)   // base del cofre apoyada en el tile
      sp.scale.set(0.34)
      this.view.addChild(sp)
      this.sprite = sp
    }

    this.label = new Text({
      text: tt('stash_label'), style: {
        fontFamily: 'Georgia, serif', fontSize: 11, fill: '#e6cf8f',
        stroke: { color: '#0a090c', width: 3 }, align: 'center',
      },
    })
    this.label.anchor.set(0.5, 1)
    this.label.y = -56
    this.view.addChild(this.label)

    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  update(dt) {
    this._t += dt
    this.aura.alpha = 0.9 + 0.1 * Math.sin(this._t * 2)
    this.label.y = -56 + Math.sin(this._t * 1.6) * 1.3
  }

  destroy() { this.view.destroy({ children: true }) }
}
