// Enemigo de Flare: sprite con máquina de estados (idle/chase/attack/hurt/dead) y sus
// animaciones reales (stance/run/swing/hit/die, 8 direcciones). IA simple: patrulla
// quieto hasta ver al jugador, lo persigue y lo golpea al alcance. El servidor mandará
// cuando llegue el multiplayer; por ahora la lógica corre en el cliente (regla 2).

import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { screenVecToDir } from './Paperdoll.js'
import { playSfx } from './audio.js'

const BASE = import.meta.env.BASE_URL || '/'

// Familia de sonido según el sprite del enemigo (tenemos hit/die por familia).
function enemySfxType(sprite) {
  if (/skeleton/.test(sprite)) return 'skeleton'
  if (/zombie/.test(sprite)) return 'zombie'
  if (/ant|antlion/.test(sprite)) return 'antlion'
  if (/minotaur/.test(sprite)) return 'minotaur'
  if (/wyvern/.test(sprite)) return 'wyvern'
  if (/grave/.test(sprite)) return 'grave'
  return 'goblin'
}

const AGGRO = 6.5           // tiles: rango en que despierta y persigue
const ATTACK_RANGE = 1.5    // tiles: alcance del golpe
const ATTACK_CD = 1.3       // s entre golpes
const SPEED_PX = 78         // px de mundo por segundo persiguiendo

export class Enemy {
  constructor(manifest, def, iso, grid) {
    this.manifest = manifest
    this.def = def
    this.iso = iso
    this.grid = grid
    this.tx = def.x
    this.ty = def.y
    this.homeX = def.x
    this.homeY = def.y
    this.dir = 7
    this.level = def.level || 1
    this.hpMax = def.hpMax
    this.hp = def.hpMax
    this.damage = def.damage

    this._sfx = enemySfxType(def.sprite)
    this.state = 'idle'
    this.dead = false
    this.remove = false
    this._anim = 'stance'
    this._frame = 0
    this._elapsed = 0
    this._animT = 0          // temporizador de anims no-loop (swing/hit/die)
    this._attackCd = 0
    this._dealt = false      // ya aplicó el daño de este golpe
    this.pendingHit = 0      // daño a aplicar al jugador este frame (lo lee Game)

    this.view = new Container()
    this.sprite = new Sprite()
    this.view.addChild(this.sprite)

    // barra de vida (aparece al recibir daño)
    this.hpBar = new Graphics()
    this.hpBar.visible = false
    this.view.addChild(this.hpBar)
  }

  async load() {
    const d = this.manifest.enemies[this.def.sprite]
    if (!d) return false
    this.d = d
    const tex = await Assets.load(BASE + 'assets/enemies/' + this.def.sprite + '.png')
      .catch(() => Assets.load(BASE + 'assets/' + d.src))
    this.sprite.texture = new Texture({ source: tex.source, frame: new Rectangle(0, 0, d.cell[0], d.cell[1]) })
    this.sprite.anchor.set(d.anchor[0] / d.cell[0], d.anchor[1] / d.cell[1])
    this._hpY = -(d.anchor[1] + 8)
    this._syncWorld()
    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_attack.png') 8 8, crosshair"
    this._applyFrame()
    return true
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  _syncWorld() {
    this.view.x = this.iso.toWorldX(this.tx, this.ty)
    this.view.y = this.iso.toWorldY(this.tx, this.ty)
    this.view.zIndex = this.tx + this.ty
  }

  dist(px, py) { return Math.abs(px - this.tx) + Math.abs(py - this.ty) }

  // Recibe daño del jugador. Devuelve true si muere con este golpe.
  takeDamage(n) {
    if (this.dead) return false
    this.hp = Math.max(0, this.hp - n)
    this._drawHpBar()
    if (this.hp <= 0) {
      this._startAnim('die'); this.state = 'dead'; this.dead = true; this._deathT = this._animS('die')
      this.view.eventMode = 'none'; this.view.cursor = 'default'  // el cadáver no intercepta clicks al suelo
      this.hpBar.visible = false
      playSfx(this._sfx + '_die.ogg')
      return true
    }
    playSfx(this._sfx + '_hit.ogg')
    // reacción de dolor (no interrumpe si ya está muriendo)
    if (this.state !== 'attack') this._startAnim('hit')
    return false
  }

  // duración de una anim en SEGUNDOS (los .ms de Flare vienen en milisegundos).
  _animS(name) { const a = this.d.anims[name]; return a ? a.ms / 1000 : 0.3 }

  _startAnim(name, loop = false) {
    if (!this.d.anims[name]) name = 'stance'
    this._anim = name
    this._frame = 0
    this._elapsed = 0
    // _animT en SEGUNDOS (se resta con dt, que también está en segundos).
    this._animT = this.d.anims[name].loop ? 0 : this._animS(name)
    this._dealt = false
  }

  update(dt, player) {
    this.pendingHit = 0
    if (this._attackCd > 0) this._attackCd -= dt

    if (this.state === 'dead') {
      this._deathT -= dt
      this._advanceAnim(dt)
      if (this._deathT <= 0) { this.view.alpha -= dt * 2; if (this.view.alpha <= 0) this.remove = true }
      return
    }

    const d = this.dist(player.tx, player.ty)

    if (this._anim === 'hit') {
      this._animT -= dt
      this._advanceAnim(dt)
      if (this._animT <= 0) this._startAnim('stance', true)
      return
    }

    if (this.state === 'attack' || this._anim === 'swing') {
      // en pleno golpe: aplicar daño a mitad de la anim, luego cooldown
      this._animT -= dt
      const a = this.d.anims.swing
      if (!this._dealt && a && this._frame >= Math.floor(a.frames / 2)) {
        this._dealt = true
        if (d <= ATTACK_RANGE + 0.6) this.pendingHit = this.damage
      }
      this._advanceAnim(dt)
      if (this._animT <= 0) { this.state = d <= AGGRO ? 'chase' : 'idle'; this._startAnim('stance', true) }
      this._facePlayer(player)
      return
    }

    if (d <= ATTACK_RANGE) {
      this._facePlayer(player)
      if (this._attackCd <= 0) { this.state = 'attack'; this._startAnim('swing'); this._attackCd = ATTACK_CD }
      else { this.state = 'chase'; if (this._anim !== 'stance') this._startAnim('stance', true); this._advanceAnim(dt) }
      return
    }

    if (d <= AGGRO) {
      this.state = 'chase'
      this._moveToward(player.tx, player.ty, dt)
      if (this._anim !== 'run') this._startAnim('run', true)
      this._advanceAnim(dt)
      return
    }

    // fuera de rango: quieto (o volviendo a casa)
    this.state = 'idle'
    if (this._anim !== 'stance') this._startAnim('stance', true)
    this._advanceAnim(dt)
  }

  _facePlayer(player) {
    const w = this.iso.toWorld(this.tx, this.ty)
    const t = this.iso.toWorld(player.tx, player.ty)
    this.dir = screenVecToDir(t.x - w.x, t.y - w.y)
  }

  _moveToward(px, py, dt) {
    const w = this.iso.toWorld(this.tx, this.ty)
    const t = this.iso.toWorld(px, py)
    const dx = t.x - w.x, dy = t.y - w.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) return
    this.dir = screenVecToDir(dx, dy)
    const step = SPEED_PX * dt
    const nx = w.x + (dx / dist) * step
    const ny = w.y + (dy / dist) * step
    const nt = this.iso.toTile(nx, ny)
    if (this.grid.isWalkable(Math.round(nt.x), Math.round(nt.y))) {
      this.tx = nt.x; this.ty = nt.y
    }
    this._syncWorld()
  }

  _advanceAnim(dt) {
    const a = this.d.anims[this._anim]
    if (!a) return
    this._elapsed += dt * 1000
    const per = a.ms / a.frames
    while (this._elapsed >= per) {
      this._elapsed -= per
      this._frame++
      if (a.pingpong) { if (this._frame >= a.frames * 2 - 2) this._frame = 0 }
      else if (this._frame >= a.frames) this._frame = a.loop ? 0 : a.frames - 1
    }
    this._applyFrame()
  }

  _applyFrame() {
    const a = this.d.anims[this._anim] || this.d.anims.stance
    let f = this._frame
    if (a.pingpong && a.frames > 1) {
      const period = a.frames * 2 - 2
      const m = this._frame % period
      f = m < a.frames ? m : period - m
    } else f = Math.min(this._frame, a.frames - 1)
    const fr = this.sprite.texture.frame
    fr.x = (a.start + f) * this.d.cell[0]
    fr.y = this.dir * this.d.cell[1]
    fr.width = this.d.cell[0]
    fr.height = this.d.cell[1]
    this.sprite.texture.updateUvs()
  }

  _drawHpBar() {
    const w = 40, h = 5
    const pct = Math.max(0, this.hp / this.hpMax)
    this.hpBar.clear()
    this.hpBar.roundRect(-w / 2, this._hpY, w, h, 2).fill({ color: 0x14111a, alpha: 0.9 }).stroke({ color: 0x000000, width: 1 })
    this.hpBar.roundRect(-w / 2 + 1, this._hpY + 1, (w - 2) * pct, h - 2, 1).fill({ color: pct > 0.4 ? 0xb23b3b : 0xd06b2a })
    this.hpBar.visible = true
  }
}
