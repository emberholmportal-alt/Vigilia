// NPC de ciudad: un sprite de Flare (anim `stance`), nombre sobre la cabeza y diálogo
// al tocarlo. Los NPCs de Flare no tienen animación de caminar, así que —como en
// Diablo— se quedan en su puesto y le dan vida a la plaza con presencia y charla.

import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { npcName, getLang } from '../i18n.js'

const BASE = import.meta.env.BASE_URL || '/'

export class Npc {
  constructor(manifest, def, iso) {
    this.manifest = manifest
    this.def = def
    this.iso = iso
    this.tx = def.x
    this.ty = def.y
    this.dir = def.dir ?? 7
    this.lines = def.lines || []
    this._lineIdx = 0
    this._frame = 0
    this._elapsed = 0
    this._speechT = 0

    this.view = new Container()
    this.sprite = new Sprite()
    this.view.addChild(this.sprite)

    // nombre (los landmarks no muestran nombre salvo que se indique)
    this.nameText = null
    if (def.name) {
      this.nameText = new Text({
        text: npcName(def, getLang()),
        style: {
          fontFamily: 'Georgia, serif', fontSize: 12,
          fill: def.landmark ? '#c9a227' : '#c9b48a',
          stroke: { color: '#0a090c', width: 3 }, align: 'center',
        },
      })
      this.nameText.anchor.set(0.5, 1)
      this.view.addChild(this.nameText)
    }

    // globo de diálogo
    this.bubble = new Container()
    this.bubbleBg = new Graphics()
    this.bubbleText = new Text({
      text: '', style: {
        fontFamily: 'Georgia, serif', fontSize: 13, fill: '#f2ead6',
        stroke: { color: '#0a090c', width: 3 }, align: 'center', wordWrap: false,
      },
    })
    this.bubbleText.anchor.set(0.5, 1)
    this.bubble.addChild(this.bubbleBg, this.bubbleText)
    this.bubble.visible = false
    this.view.addChild(this.bubble)
  }

  async load() {
    const d = this.manifest.npcs[this.def.sprite]
    if (!d) return false
    this.d = d
    const tex = await Assets.load(BASE + 'assets/' + d.src)
    // Filas (direcciones) reales del sheet: los sprites de 1 sola dirección (p. ej. la bruja)
    // tienen 1 fila; si `dir` supera las filas, la celda cae fuera del sheet y el NPC desaparece.
    // Clampeamos con módulo para que hablarle (que le cambia la dirección) no lo borre.
    this._rows = Math.max(1, Math.round(tex.source.height / d.cell[1]))
    this.sprite.texture = new Texture({
      source: tex.source, frame: new Rectangle(0, 0, d.cell[0], d.cell[1]),
    })
    this.sprite.anchor.set(d.anchor[0] / d.cell[0], d.anchor[1] / d.cell[1])

    const headY = -(d.anchor[1] + 6)
    if (this.nameText) this.nameText.y = headY
    this.bubble.y = headY - 16

    // posición en el mundo
    this.view.x = this.iso.toWorldX(this.tx, this.ty)
    this.view.y = this.iso.toWorldY(this.tx, this.ty)
    this.view.zIndex = this.tx + this.ty

    // tocable
    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
    this._applyFrame()
    return true
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  talk() {
    if (!this.lines.length) return
    const line = this.lines[this._lineIdx % this.lines.length]
    this._lineIdx++
    this.bubbleText.text = line
    // Estimamos el ancho por caracteres (las métricas de Pixi sub-miden con esta
    // fuente); así el fondo nunca recorta el texto.
    const b = this.bubbleText.getLocalBounds()
    const w = Math.ceil(b.width) + 24
    const h = Math.ceil(b.height) + 12
    this.bubbleBg.clear()
    this.bubbleBg.roundRect(-w / 2, -h, w, h, 6)
      .fill({ color: 0x14111a, alpha: 0.92 })
      .stroke({ color: 0x3b3145, width: 1 })
    this.bubbleText.y = -6
    this.bubble.visible = true
    this._speechT = 4.5
  }

  update(dt) {
    // Los NPCs de ciudad se quedan en su puesto (los sprites de Flare son de 1 frame:
    // no tienen animación de caminar, así que moverlos los hace deslizar). Le dan vida a
    // la plaza con presencia y charla, como en Diablo.

    // anim stance (loop/pingpong)
    const st = this.d && this.d.anims.stance
    if (st) {
      this._elapsed += dt * 1000
      const per = st.ms / st.frames
      while (this._elapsed >= per) {
        this._elapsed -= per
        this._frame++
        if (st.pingpong) { if (this._frame >= st.frames * 2 - 2) this._frame = 0 }
        else if (this._frame >= st.frames) this._frame = st.loop ? 0 : st.frames - 1
      }
      this._applyFrame()
    }
    if (this._speechT > 0) {
      this._speechT -= dt
      if (this._speechT <= 0) this.bubble.visible = false
    }
  }

  _applyFrame() {
    const st = this.d && this.d.anims.stance
    if (!st) return
    let f = this._frame
    if (st.pingpong && st.frames > 1) {
      const period = st.frames * 2 - 2
      const m = this._frame % period
      f = m < st.frames ? m : period - m
    } else {
      f = Math.min(this._frame, st.frames - 1)
    }
    const fr = this.sprite.texture.frame
    fr.x = (st.start + f) * this.d.cell[0]
    fr.y = (this.dir % (this._rows || 1)) * this.d.cell[1]
    fr.width = this.d.cell[0]
    fr.height = this.d.cell[1]
    this.sprite.texture.updateUvs()
  }
}
