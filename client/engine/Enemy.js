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
const ATTACK_RANGE = 1.5    // tiles: alcance del golpe cuerpo a cuerpo
const RANGED_RANGE = 6      // tiles: alcance de disparo (arqueros/magos)
const RANGED_MIN = 2.5      // tiles: si el jugador se acerca más, el arquero retrocede (kiting)
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

    // Persecución con "correa": una vez que te ve, te sigue MÁS ALLÁ del rango de aggro hasta
    // una distancia de correa, y sólo se rinde tras un rato lejos. Variado por enemigo (algunos
    // insisten, otros abandonan enseguida). Los jefes/élites son más tercos.
    this._aggroed = false
    this._giveupT = 0
    const stubborn = def.boss ? 1.6 : 1
    this.leash = (AGGRO + 2 + Math.random() * 8) * stubborn      // ~8.5–16.5 tiles
    this.patience = (1.5 + Math.random() * 4) * stubborn         // ~1.5–5.5 s lejos antes de rendirse

    // Combate a distancia: arqueros/magos disparan en vez de golpear (lo marca el spawner).
    this.ranged = !!def.ranged
    this.projKind = def.projKind || 'arrow'
    this._shootAnim = this.projKind === 'magic' ? 'cast' : 'shoot'
    this._atkAnim = 'swing'

    // Habilidad especial (smash / skittish / summon) — ver data/bestiary.js.
    this.ability = def.ability || null
    this._windT = 0            // temporizador de carga del golpe telegrafiado (smash)
    this._panic = false        // huyendo por vida baja (skittish)
    this._panicT = 0
    this._summonCd = this.ability?.type === 'summon' ? 2 + Math.random() * 3 : 0
    this._summons = 0          // esbirros invocados (tope en ability.cap)

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
    // Wrapper de Texture PROPIO (mutamos su frame por tick). Se guarda para liberarlo al morir.
    this._ownTex = new Texture({ source: tex.source, frame: new Rectangle(0, 0, d.cell[0], d.cell[1]) })
    this.sprite.texture = this._ownTex
    this.sprite.anchor.set(d.anchor[0] / d.cell[0], d.anchor[1] / d.cell[1])
    this._hpY = -(d.anchor[1] + 8)
    this._syncWorld()
    this.view.eventMode = 'static'
    this.view.cursor = "url('/assets/ui/cursors/cursor_attack.png') 8 8, crosshair"
    this._applyFrame()
    return true
  }

  onTap(cb) { this.view.on('pointertap', (e) => { e.stopPropagation(); cb(this) }) }

  // El Game engancha acá para lanzar el proyectil cuando el arquero suelta el disparo.
  onShoot(cb) { this._onShoot = cb }
  // El Game dibuja el telegrafiado del golpe fuerte y spawnea los esbirros invocados.
  onTelegraph(cb) { this._onTelegraph = cb }
  onSummon(cb) { this._onSummon = cb }

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

  // --- modo autoritativo (online): el servidor manda; acá sólo interpolamos y reflejamos --------
  // No corre IA. La posición/HP/muerte llegan del server; suavizamos el movimiento y animamos.
  netInit(eid) { this.netDriven = true; this.eid = eid; this._nx = this.tx; this._ny = this.ty }
  netSetTarget(x, y, dir, hp) {
    this._nx = x; this._ny = y
    if (dir != null) this.dir = dir
    if (hp != null && hp !== this.hp) { this.hp = hp; if (this.hp < this.hpMax) this._drawHpBar() }
  }
  netDamage(hp, dmg, crit) {
    if (this.dead) return
    this.hp = Math.max(0, hp); this._drawHpBar()
    if (this._anim !== 'hit') this._startAnim('hit')
    playSfx(this._sfx + '_hit.ogg')
  }
  netDie() {
    if (this.dead) return
    this.hp = 0; this._startAnim('die'); this.state = 'dead'; this.dead = true; this._deathT = this._animS('die')
    this.view.eventMode = 'none'; this.view.cursor = 'default'; this.hpBar.visible = false
    playSfx(this._sfx + '_die.ogg')
  }
  _netUpdate(dt) {
    this.pendingHit = 0
    if (this.state === 'dead') {
      this._deathT -= dt; this._advanceAnim(dt)
      if (this._deathT <= 0) { this.view.alpha -= dt * 2; if (this.view.alpha <= 0) this.remove = true }
      return
    }
    // Interpolación suave hacia la última posición del server (llega ~5 Hz).
    const k = Math.min(1, dt * 12)
    this.tx += (this._nx - this.tx) * k
    this.ty += (this._ny - this.ty) * k
    this._syncWorld()
    if (this._anim === 'hit') {
      this._animT -= dt
      if (this._animT <= 0) this._startAnim('stance', true)
    } else {
      const moving = Math.abs(this._nx - this.tx) + Math.abs(this._ny - this.ty) > 0.08
      const want = moving ? 'run' : 'stance'
      if (this._anim !== want) this._startAnim(want, true)
    }
    this._advanceAnim(dt)
  }

  update(dt, player) {
    if (this.netDriven) return this._netUpdate(dt)
    this.pendingHit = 0
    if (this._attackCd > 0) this._attackCd -= dt
    if (this._summonCd > 0) this._summonCd -= dt

    if (this.state === 'dead') {
      this._deathT -= dt
      this._advanceAnim(dt)
      if (this._deathT <= 0) { this.view.alpha -= dt * 2; if (this.view.alpha <= 0) this.remove = true }
      return
    }

    const d = this.dist(player.tx, player.ty)
    const engaged = this._updateAggro(d, dt)   // persigue con "correa", no abandona enseguida

    // Golpe telegrafiado (smash): mientras carga, queda quieto y mostrando el círculo; al
    // terminar, pega fuerte a todo lo que quede dentro del radio (esquivable saliendo).
    if (this.state === 'windup') {
      this._facePlayer(player)
      this._windT -= dt
      this._advanceAnim(dt)
      if (this._windT <= 0) {
        const ab = this.ability
        if (d <= (ab.radius || 2.2)) this.pendingHit = Math.round(this.damage * (ab.mult || 2.2))
        this._startAnim('swing'); this._dealt = true   // muestra el golpe sin re-aplicar daño
        this._atkAnim = 'swing'; this.state = 'attack'; this._animT = this._animS('swing')
        this._attackCd = ab.cd || 5
      }
      return
    }

    // Huida por vida baja (skittish): al bajar del umbral, huye un rato; después vuelve a atacar.
    if (this.ability?.type === 'skittish') {
      const low = this.hp / this.hpMax < (this.ability.threshold || 0.25)
      if (low && !this._panic && engaged) { this._panic = true; this._panicT = this.ability.flee || 3 }
      if (this._panic) {
        this._panicT -= dt
        if (this._panicT <= 0) this._panic = false
        else if (engaged) {
          this._facePlayer(player)
          this._moveAway(player.tx, player.ty, dt)
          if (this._anim !== 'run') this._startAnim('run', true)
          this._advanceAnim(dt)
          return
        }
      }
    }

    if (this._anim === 'hit') {
      this._animT -= dt
      this._advanceAnim(dt)
      if (this._animT <= 0) this._startAnim('stance', true)
      return
    }

    if (this.state === 'attack' || this._anim === this._atkAnim) {
      // en pleno ataque: al llegar a la mitad de la anim, pega (melee) o dispara (rango).
      this._animT -= dt
      const a = this.d.anims[this._atkAnim]
      if (!this._dealt && a && this._frame >= Math.floor(a.frames / 2)) {
        this._dealt = true
        if (this.ranged) { if (this._onShoot) this._onShoot(this) }
        else if (d <= ATTACK_RANGE + 0.6) this.pendingHit = this.damage
      }
      this._advanceAnim(dt)
      if (this._animT <= 0) { this.state = engaged ? 'chase' : 'idle'; this._startAnim('stance', true) }
      this._facePlayer(player)
      return
    }

    // Invocador (nigromante): cada tanto llama esbirros en vez de disparar, hasta un tope.
    if (this.ability?.type === 'summon' && engaged && this._summonCd <= 0 &&
        this._summons < (this.ability.cap || 4) && d <= RANGED_RANGE) {
      this._facePlayer(player)
      this._startAnim(this._atkAnim = this._shootAnim)   // anim de conjuro
      this._summonCd = this.ability.cd || 7
      this._summons++
      if (this._onSummon) this._onSummon(this)
      this.state = 'chase'
      this._advanceAnim(dt)
      return
    }

    // Arquero/mago: mantiene distancia. Si el jugador lo alcanza, retrocede disparando.
    if (this.ranged) {
      if (d < RANGED_MIN) {
        this._facePlayer(player)
        this._moveAway(player.tx, player.ty, dt)
        if (this._attackCd <= 0) { this.state = 'attack'; this._startAnim(this._atkAnim = this._shootAnim); this._attackCd = ATTACK_CD }
        else { if (this._anim !== 'run') this._startAnim('run', true); this._advanceAnim(dt) }
        return
      }
      if (d <= RANGED_RANGE) {
        this._facePlayer(player)
        if (this._attackCd <= 0) { this.state = 'attack'; this._startAnim(this._atkAnim = this._shootAnim); this._attackCd = ATTACK_CD }
        else { this.state = 'chase'; if (this._anim !== 'stance') this._startAnim('stance', true); this._advanceAnim(dt) }
        return
      }
      if (engaged) {
        this.state = 'chase'
        this._moveToward(player.tx, player.ty, dt)
        if (this._anim !== 'run') this._startAnim('run', true)
        this._advanceAnim(dt)
        return
      }
      this.state = 'idle'
      if (this._anim !== 'stance') this._startAnim('stance', true)
      this._advanceAnim(dt)
      return
    }

    if (d <= ATTACK_RANGE) {
      this._facePlayer(player)
      if (this._attackCd <= 0) {
        // Bruto/jefe con smash: a veces carga un golpe fuerte telegrafiado en vez del normal.
        if (this.ability?.type === 'smash' && Math.random() < (this.ability.chance || 0.4)) {
          this.state = 'windup'; this._windT = this.ability.windup || 0.75
          this._startAnim('stance', true)
          if (this._onTelegraph) this._onTelegraph(this, this.ability)
          return
        }
        this.state = 'attack'; this._startAnim(this._atkAnim = 'swing'); this._attackCd = ATTACK_CD
      } else { this.state = 'chase'; if (this._anim !== 'stance') this._startAnim('stance', true); this._advanceAnim(dt) }
      return
    }

    if (engaged) {
      this.state = 'chase'
      this._moveToward(player.tx, player.ty, dt)
      if (this._anim !== 'run') this._startAnim('run', true)
      this._advanceAnim(dt)
      return
    }

    // fuera de rango / se rindió: quieto.
    this.state = 'idle'
    if (this._anim !== 'stance') this._startAnim('stance', true)
    this._advanceAnim(dt)
  }

  // Correa de persecución: te ve dentro de AGGRO y te sigue hasta `leash`; sólo se rinde tras
  // `patience` segundos lejos. Variado por enemigo (algunos insisten, otros no).
  _updateAggro(d, dt) {
    if (d <= AGGRO) { this._aggroed = true; this._giveupT = 0; return true }
    if (this._aggroed) {
      if (d <= this.leash) { this._giveupT = 0; return true }
      this._giveupT += dt
      if (this._giveupT >= this.patience) { this._aggroed = false; return false }
      return true
    }
    return false
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

  // Retrocede alejándose del jugador (kiting del arquero). Sigue mirándolo (lo setea el caller).
  _moveAway(px, py, dt) {
    const w = this.iso.toWorld(this.tx, this.ty)
    const t = this.iso.toWorld(px, py)
    const dx = w.x - t.x, dy = w.y - t.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) return
    const step = SPEED_PX * 0.8 * dt   // retrocede algo más lento que persiguiendo
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

  // Libera el wrapper de Texture propio (NO la source compartida del atlas) y destruye la vista.
  // Sin esto, cada enemigo muerto dejaba su wrapper colgado en el heap (con spawn/kill constante,
  // acumula en una sesión larga).
  destroy() {
    if (this._ownTex) { this._ownTex.destroy(false); this._ownTex = null }
    this.view.destroy({ children: true })
  }
}
