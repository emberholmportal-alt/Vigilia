// Otro jugador (remoto): mismo paperdoll de Flare que el héroe, movido por lo que difunde el
// servidor. Interpola su posición entre updates para que se vea fluido. Sin equipo por ahora
// (cuerpo base + nombre); sincronizar el equipo remoto es un paso siguiente del protocolo.
import { Container, Text } from 'pixi.js'
import { Paperdoll } from './Paperdoll.js'

export class RemotePlayer {
  constructor(iso, manifest, p) {
    this.iso = iso
    this.id = p.id
    this.tx = p.x; this.ty = p.y
    this.dir = p.dir ?? 7
    this._tgx = this.tx; this._tgy = this.ty   // objetivo de interpolación

    this.view = new Container()
    this.paperdoll = new Paperdoll(manifest)
    this.view.addChild(this.paperdoll.view)

    this.nameText = new Text({
      text: p.name || 'Viajero', style: {
        fontFamily: 'Georgia, serif', fontSize: 12, fill: '#bfe0ff',
        stroke: { color: '#0a090c', width: 3 }, align: 'center',
      },
    })
    this.nameText.anchor.set(0.5, 1)
    this.nameText.y = -(this.paperdoll.anchorY + 6)
    this.view.addChild(this.nameText)

    this.paperdoll.setDirection(this.dir)
    this._ready = this.paperdoll.setEquipment({})   // cuerpo base (sin equipo remoto aún)
    this._sync()
  }

  // Nueva posición/dirección difundida por el servidor.
  setTarget(x, y, dir) { this._tgx = x; this._tgy = y; if (dir != null) this.dir = dir }

  // Muerte / reaparición (difundida por el server para el co-op): cae y se atenúa; al revivir vuelve.
  setDead(dead) {
    this.dead = !!dead
    if (dead) { this.paperdoll.playOnce('die', true); this.view.alpha = 0.5 }
    else { this.paperdoll._oneShot = null; this.view.alpha = 1 }
  }

  update(dt) {
    if (this.dead) { this.paperdoll.update(dt); this._sync(); return }   // caído: no se mueve
    const dx = this._tgx - this.tx, dy = this._tgy - this.ty
    const d = Math.hypot(dx, dy)
    const moving = d > 0.06
    if (moving) { const k = Math.min(1, 9 * dt); this.tx += dx * k; this.ty += dy * k }
    this.paperdoll.setMoving(moving)
    this.paperdoll.setDirection(this.dir)
    this.paperdoll.update(dt)
    this._sync()
  }

  _sync() {
    this.view.x = this.iso.toWorldX(this.tx, this.ty)
    this.view.y = this.iso.toWorldY(this.tx, this.ty)
    this.view.zIndex = this.tx + this.ty
  }

  destroy() { this.view.destroy({ children: true }) }
}
