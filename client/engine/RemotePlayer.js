// Otro jugador (remoto): mismo paperdoll de Flare que el héroe, movido por lo que difunde el
// servidor. Interpola su posición entre updates para que se vea fluido. Sin equipo por ahora
// (cuerpo base + nombre); sincronizar el equipo remoto es un paso siguiente del protocolo.
import { Container, Graphics, Text } from 'pixi.js'
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

    // Barra de vida (aparece cuando está herido), como la de los enemigos.
    this.hpBar = new Graphics()
    this.hpBar.visible = false
    this._hpY = -(this.paperdoll.anchorY - 2)
    this.view.addChild(this.hpBar)
    if (p.hp != null && p.hpMax) this.setHp(p.hp, p.hpMax)

    this.paperdoll.setDirection(this.dir)
    this._ready = this.paperdoll.setEquipment(p.gfx || {})   // equipo real del jugador remoto
    if (p.dead) this.setDead(true)                           // se unió mientras estaba caído
    this._sync()
  }

  // Cambió el equipo del jugador remoto: reaplica sus capas de paperdoll.
  setGfx(gfx) { this.paperdoll.setEquipment(gfx || {}) }

  // Vida del jugador remoto (difundida por el server): dibuja la barra si está herido.
  setHp(hp, hpMax) {
    this.hp = hp | 0; this.hpMax = hpMax | 0
    const pct = this.hpMax > 0 ? Math.max(0, Math.min(1, this.hp / this.hpMax)) : 1
    if (pct >= 0.999) { this.hpBar.visible = false; return }
    const w = 40, h = 5
    this.hpBar.clear()
    this.hpBar.roundRect(-w / 2, this._hpY, w, h, 2).fill({ color: 0x14111a, alpha: 0.9 }).stroke({ color: 0x000000, width: 1 })
    this.hpBar.roundRect(-w / 2 + 1, this._hpY + 1, (w - 2) * pct, h - 2, 1).fill({ color: 0x4aa3d6 })
    this.hpBar.visible = true
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
