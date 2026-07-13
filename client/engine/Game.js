// Orquestador del juego (Fase 1): Pixi Application + loop.
// React NO entra acá: solo lee el store que este loop actualiza.

import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { Iso } from './iso.js'
import { loadWorld } from './assets.js'
import { Grid } from './Pathfinding.js'
import { MapRenderer } from './MapRenderer.js'
import { Camera } from './Camera.js'
import { Player, WALK_PX, RUN_PX } from './Player.js'
import { Npc } from './Npc.js'
import { Enemy } from './Enemy.js'
import { Projectile } from './Projectile.js'
import { ResourceNode } from './ResourceNode.js'
import { GATHER } from '../data/alchemy.js'
import { tt, zoneName, getLang, itemName, npcName, npcLines } from '../i18n.js'
import { screenVecToDir } from './Paperdoll.js'
import { NPCS_BY_MAP } from '../data/npcs.js'
import { pickSprite, enemyStats, enemyName, isRanged, projectileKind, rangedCousin } from '../data/bestiary.js'
import { stampStructures } from '../data/structures.js'
import { ParticleField } from './Particles.js'
import { GroundItem, loadIcons, iconsTexture } from './GroundItem.js'
import { rollLoot } from '../../shared/loot.js'
import { itemById, RARITY_COLOR } from '../data/items.js'
import { playSfx } from './audio.js'

// Tinte del brillo mágico por landmark.
const GLOW_TINT = {
  statue_guardian_fire: 0xff7a2a, statue_guardian_ice: 0x6fd0ff,
  statue_guardian_wind: 0xbfe6b0, return_obelisk1: 0xd8c070, return_obelisk2: 0xd8c070,
}

const STAM_DRAIN = 22 // por segundo corriendo
const STAM_REGEN = 16 // por segundo si no

export class Game {
  constructor(store) {
    this.store = store          // setters de zustand
    this.app = null
    this.destroyed = false
  }

  async mount(canvasParent, mapName = 'black_oak_city') {
    const app = new Application()
    await app.init({
      background: '#0a090c',
      antialias: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      resizeTo: canvasParent,
      powerPreference: 'high-performance',
    })
    if (this.destroyed) { app.destroy(true); return }
    this.app = app
    this.canvasParent = canvasParent
    canvasParent.appendChild(app.canvas)
    // Permitir dt grandes en caídas de fps sin recortar tanto el movimiento (el
    // camino ya está validado, así que pasos grandes no atraviesan paredes).
    app.ticker.minFPS = 4

    // Cortina negra para el fundido al viajar entre mapas (queda por encima de todo).
    this.fade = new Graphics()
    this.fade.rect(0, 0, 8000, 8000).fill({ color: 0x0d0713 }) // obsidiana violácea, no negro puro
    this.fade.zIndex = 1e7
    this.fade.eventMode = 'none'
    this.fade.alpha = 0
    this.fade.visible = false
    app.stage.sortableChildren = true
    app.stage.addChild(this.fade)
    this._fadeAlpha = 0

    await this._buildWorld(mapName)
    if (this.destroyed) { app.destroy(true); return }

    // Input + resize + suscripción de equipo: una sola vez (usan this.*, sobreviven al
    // cambio de mapa).
    this._setupInput(app)
    window.addEventListener('resize', this._onResize)
    this._unsub = this.store.onEquipmentChange((equip) => {
      if (this.player) this.player.setEquipment(equipToGfx(equip))
    })

    if (import.meta.env.DEV) window.__vigilia = this
    this._lastInteractSeq = this.store.getInteractSeq() // no interactuar en el primer tick
    this._lastPortalSeq = this.store.getPortalSeq()
    this._lastRecallSeq = this.store.getRecallSeq()
    this._fpsAccum = 0
    this._fpsFrames = 0
    app.ticker.add(this._tick)
  }

  // Construye (o reconstruye) todo lo específico del mapa. `spawnOverride` = tile de
  // llegada de un portal; `preWorld` = mundo ya cargado (para no cargar dos veces).
  async _buildWorld(mapName, spawnOverride = null, preWorld = null) {
    this._loading = true
    const app = this.app
    const world = preWorld || await loadWorld(mapName)
    if (this.destroyed) return
    this.world = world
    this.mapName = mapName

    stampStructures(world.map, mapName)

    const iso = new Iso(world.map.tileW, world.map.tileH, world.tileset.scale)
    this.iso = iso
    const grid = new Grid(world.map.layers.collision, world.map.w, world.map.h)
    this.grid = grid
    const renderer = new MapRenderer(iso, world.map, world.tileset)
    this.renderer = renderer

    // Atlas del tileset en un canvas para leer alpha por-pixel (oclusión precisa).
    this._masks = new Map()
    this._occAlpha = new Map()
    this._atlasCtx = null
    this._loadOcclusionAtlas(world.tileset.atlasSrc)

    // Zoom consistente entre mapas: apuntamos a un ancho de tile en pantalla parejo
    // (~83px, el de Triston) sin importar si el tileset trae tiles de 64 o 96px.
    const zoom = MAP_ZOOM[mapName] || Math.max(0.7, Math.min(1.6, 83 / iso.tileW))
    const camera = new Camera(iso, world.map.w, world.map.h, zoom)
    camera.resize(app.screen.width, app.screen.height)
    this.camera = camera

    const worldContainer = new Container()
    worldContainer.scale.set(zoom)
    worldContainer.addChild(renderer.root)
    app.stage.addChildAt(worldContainer, 0) // debajo de la cortina de fundido
    this.worldContainer = worldContainer

    this.ping = new Graphics()
    this.ping.visible = false
    this.ping.zIndex = 1e6
    renderer.groundLayer.addChild(this.ping)

    const eScale = ENTITY_SCALE[mapName] || 1
    this._eScale = eScale

    const spawn = (spawnOverride && grid.isWalkable(spawnOverride.x, spawnOverride.y))
      ? spawnOverride
      : hubOrCentralSpawn(mapName, grid, world.map)
    this._spawn = spawn
    const player = new Player(iso, grid, world.manifest, spawn.x, spawn.y)
    player.view.scale.set(eScale * (PLAYER_SCALE[mapName] || 1))
    this._playerScale = eScale * (PLAYER_SCALE[mapName] || 1)
    renderer.objectLayer.addChild(player.view)
    this.player = player
    player.setName(this.store.getPlayerName(), this.store.getPlayerLevel(), this.store.getRaceName())
    this._nameLevel = this.store.getPlayerLevel()
    await player.setEquipment(equipToGfx(this.store.getEquipment()))

    // NPCs de la plaza.
    this.npcs = []
    for (const def of NPCS_BY_MAP[mapName] || []) {
      let x = def.x, y = def.y
      if (!def.landmark && !grid.isWalkable(x, y)) {
        const near = grid.nearestWalkable(x, y, 4)
        if (near) { x = near.x; y = near.y }
      }
      const npc = new Npc(world.manifest, { ...def, x, y }, iso)
      const ok = await npc.load()
      if (this.destroyed) return
      if (!ok) continue
      npc.view.scale.set(eScale)
      renderer.objectLayer.addChild(npc.view)
      grid.blocked[y * grid.w + x] = 1
      npc.onTap((n) => this._talkTo(n))
      this.npcs.push(npc)
    }

    await this._buildDecorations(renderer, iso, world.map, grid)

    await loadIcons()
    this.groundItems = []
    this._pendingChest = null
    this._buildChests(renderer, iso, world.map, grid)

    // Enemigos + estado de combate.
    this.enemies = []
    this._floaters = []
    this._projectiles = []
    this._target = null
    this._playerAtkCd = 0
    this._pendingHit = null
    this._dead = false
    this._deadT = 0
    this._hurtCd = 0
    await this._spawnEnemies(renderer, world.map, grid, world.manifest, spawn)

    // Nodos de recursos (hierbas + vetas de cristal) para juntar/minar.
    this.nodes = []
    this._pendingNode = null
    this._spawnNodes(renderer, iso, world.map, grid, spawn, mapName)

    // Partículas ambientales.
    this.particles = new ParticleField(app.renderer)
    renderer.root.addChild(this.particles.container)
    const sc = iso.toWorld(spawn.x, spawn.y)
    this.particles.addEmitter({
      x: sc.x, y: sc.y - 24, rx: iso.wHalf * 11, ry: iso.hHalf * 11,
      rate: 11, tint: 0xffe08a, vy: -4, spread: 5, life: 3.6, size: 1,
    })
    for (const npc of this.npcs) {
      if (!npc.def.landmark) continue
      const w = iso.toWorld(npc.tx, npc.ty)
      const tint = npc.def.glow || GLOW_TINT[npc.def.sprite] || 0xffcf5a
      this.particles.addEmitter(npc.def.portal
        ? { x: w.x, y: w.y - 34, rx: 7, ry: 5, rate: 16, tint, vy: -30, spread: 6, life: 2.2, size: 1.1 }
        : { x: w.x, y: w.y - 30, rx: 9, ry: 6, rate: 9, tint, vy: -20, spread: 5, life: 1.8, size: 0.9 })
    }

    // Portales del mapa (viaje entre zonas). Precargamos el pad de teletransporte.
    const BASE = import.meta.env.BASE_URL || '/'
    this._padTex = await Assets.load(BASE + 'assets/ui/teleport_pad.png').catch(() => null)
    if (this.destroyed) return
    this._buildPortals(renderer, iso, world.map, mapName)

    camera.follow(spawn.x, spawn.y)
    camera.snap()

    const title = zoneTitle(mapName, world.map.title)
    this.store.setMapTitle(title)
    this.store.setMinimap(this._buildMinimap(world.map))
    this.store.logMessage({ channel: 'mundo', text: tt('arrived_at', { zone: title }) })
    this._loading = false
  }

  // Destruye todo lo específico del mapa (para reconstruir en otro). La app, el input y
  // la cortina de fundido sobreviven.
  _teardownWorld() {
    if (this.worldContainer) { this.worldContainer.destroy({ children: true, texture: false }); this.worldContainer = null }
    this.npcs = []
    this.enemies = []
    this.groundItems = []
    this.chests = []
    this._floaters = []
    this._projectiles = []
    this.nodes = []
    this._pendingNode = null
    this.portals = []
    this._target = null
    this._pendingChest = null
    this._pendingHit = null
    this.particles = null
    this._masks?.clear()
    this._occAlpha?.clear()
    this._atlasCtx = null
  }

  // Viaja a otro mapa (portal). Pantalla de carga temática (con lore) mientras reconstruye
  // el mundo; nunca queda en negro. Un mínimo en pantalla evita que la barra parpadee.
  async changeMap(to, tx, ty) {
    if (this._loading || this._changing) return
    this._changing = true
    this.store.setZoneLoad({ label: zoneTitle(to) })
    // dejar que React pinte la cortina antes del trabajo pesado (evita un frame del mundo viejo)
    await new Promise((r) => setTimeout(r, 60))
    const t0 = performance.now()
    this._fadeAlpha = 1
    this.fade.alpha = 1
    this.fade.visible = true
    let world
    try { world = await loadWorld(to) }
    catch {
      this._changing = false; this._fadeAlpha = 0; this.fade.visible = false
      this.store.setZoneLoad(null); this.store.showToast(tt('zone_unavailable')); return
    }
    if (this.destroyed) return
    this._teardownWorld()
    const spawn = (Number.isFinite(tx) && Number.isFinite(ty)) ? { x: tx, y: ty } : null
    await this._buildWorld(to, spawn, world)
    // Mínimo en pantalla para que la barra de carga y la frase de lore se lean.
    const elapsed = performance.now() - t0
    if (elapsed < 1300) await new Promise((r) => setTimeout(r, 1300 - elapsed))
    if (this.destroyed) return
    this._changing = false
    this.store.setZoneLoad(null)
    this._fadeOut = true // el tick baja el alpha del velo de Pixi por debajo de la cortina
  }

  // Arma los marcadores de portal + guarda sus zonas para detectar la entrada.
  _buildPortals(renderer, iso, map, mapName) {
    this.portals = []
    // Triston usa lista curada; el resto usa sus portales nativos (filtrados) + los extra.
    const list = PORTAL_REPLACE[mapName]
      || (map.portals || []).filter((p) => portalAllowed(p.to)).concat(PORTAL_EXTRA[mapName] || [])
    for (const p of list) {
      const plabel = zoneTitle(p.to, p.label)
      const w = p.w || 1, h = p.h || 1
      const cx = p.x + w / 2 - 0.5, cy = p.y + h / 2 - 0.5
      const wx = iso.toWorldX(cx, cy), wy = iso.toWorldY(cx, cy)
      // Pad de piedra de Flare (5 frames: apagado -> runas azules brillando). Va POR ENCIMA
      // del pasto (si no, el propio tile de suelo lo tapa y parece enterrado), pero debajo
      // de objetos y personajes (que están en objectLayer).
      let pad = null
      if (this._padTex) {
        pad = new Sprite(new Texture({ source: this._padTex.source, frame: new Rectangle(0, 0, 256, 128) }))
        pad.anchor.set(0.5, 0.5)
        pad.x = wx; pad.y = wy
        pad.scale.set((iso.wHalf * 2 * 1.7) / 256)
        pad.zIndex = 5e5
        renderer.groundLayer.addChild(pad)
      }
      // Halo suave sobre el pad (sin humo/partículas).
      const g = new Graphics()
      g.ellipse(0, 0, iso.wHalf * 0.6, iso.hHalf * 0.6).fill({ color: 0x8a5bff, alpha: 0.16 })
      g.x = wx; g.y = wy; g.zIndex = 5e5 + 1
      renderer.groundLayer.addChild(g)
      const label = new Text({ text: plabel, style: {
        fontFamily: 'Georgia, serif', fontSize: 12, fill: '#d9b3ff',
        stroke: { color: '#0a090c', width: 3 }, align: 'center',
      } })
      label.anchor.set(0.5, 1); label.x = wx; label.y = wy - 30; label.zIndex = 2e6
      renderer.objectLayer.addChild(label)
      this.portals.push({ x: p.x, y: p.y, w, h, to: p.to, tx: p.tx, ty: p.ty, label: plabel, gfx: g, pad, _padFrame: 0, _padT: 0, _padDir: 1 })
    }
    // Al HUD: tiles de portal para marcarlos en el minimapa.
    this.store.setPortals(this.portals.map((p) => ({ x: p.x + (p.w - 1) / 2, y: p.y + (p.h - 1) / 2, label: p.label })))
  }

  _enterPortal(p) {
    this.store.showToast(tt('travel_label', { zone: p.label || p.to }))
    this.changeMap(p.to, p.tx, p.ty)
  }

  // Usar una Piedra de Retorno (desde el cinturón): te ancla al punto actual y te recall al
  // pueblo. En Triston no hace nada (ya estás en casa) y no gasta la piedra.
  _doRecall() {
    if (this._loading || this._changing || this._dead || !this.player) return
    if (this.mapName === 'triston') { this.store.showToast(tt('already_in_town')); return }
    const i = this.store.getRecallBeltIndex()
    this.store.setRecallAnchor({
      map: this.mapName, tx: Math.round(this.player.tx), ty: Math.round(this.player.ty),
      label: zoneTitle(this.mapName),
    })
    this.store.consumeBelt(i)
    this.store.showToast(tt('stone_pulls'))
    this.changeMap('triston', OBELISK_RETURN[0], OBELISK_RETURN[1])
  }

  // Tocar el Obelisco de Retorno del pueblo: si hay un ancla guardada, te devuelve ahí.
  _useObelisk() {
    const a = this.store.getRecallAnchor()
    if (a) {
      this.store.clearRecallAnchor()
      this.store.showToast(tt('obelisk_opens', { zone: a.label }))
      this.changeMap(a.map, a.tx, a.ty)
    } else {
      this.store.openDialogue({ name: tt('obelisk_name'), portrait: null, lines: [tt('obelisk_l1'), tt('obelisk_l2')] })
    }
  }

  _inspectCorpse(e) {
    const name = enemyName(e.def.sprite, getLang())
    this.store.logMessage({ channel: 'sistema', text: tt('inspect_corpse', { name, lv: e.level }) })
    this.store.showToast(tt('corpse_empty'))
  }

  // Click derecho: busca la criatura bajo el cursor. Enemigo vivo -> atacar; cadáver ->
  // inspeccionar. En el piso vacío no hace nada (no camina, para no moverse sin querer).
  _rightClick(gx, gy) {
    if (this._dead || this._loading || this._changing || !this.enemies) return
    const w = this.camera.screenToWorld(gx, gy)
    const t = this.iso.toTile(w.x, w.y)
    const tx = Math.round(t.x), ty = Math.round(t.y)
    let best = null, bd = 1.6
    for (const e of this.enemies) {
      const d = Math.abs(e.tx - tx) + Math.abs(e.ty - ty)
      if (d < bd) { bd = d; best = e }
    }
    if (!best) return
    if (best.dead) this._inspectCorpse(best)
    else this._targetEnemy(best)
  }

  // Tocar un NPC: el jugador se acerca, el NPC te mira y se abre la caja de diálogo.
  _talkTo(npc) {
    this.player.walkTo(npc.tx, npc.ty) // A* enruta a un tile adyacente (el suyo está bloqueado)
    const pv = this.iso.toWorld(this.player.tx, this.player.ty)
    const nv = this.iso.toWorld(npc.tx, npc.ty)
    npc.dir = screenVecToDir(pv.x - nv.x, pv.y - nv.y)
    const nm = npcName(npc.def, getLang())
    if (npc.def.obelisk) this._useObelisk()
    else if (npc.def.shop) this.store.openShop(nm)
    else if (npc.def.smith) this.store.openSmith(nm)
    else if (npc.def.alchemy) this.store.openAlchemy(nm)
    else this.store.openDialogue({ name: nm, portrait: npc.def.portrait, lines: npcLines(npc.def, getLang()) })
  }

  // Decoraciones estáticas del mapa (secciones [npc] de Flare: fuente, cerdos, aldeanos
  // ambientales). Sprites reales de HERESY (public/assets/decor/), depth-sort por x+y.
  async _buildDecorations(renderer, iso, map, grid) {
    const list = map.decorations || []
    if (!list.length) return
    const BASE = import.meta.env.BASE_URL || '/'
    const skip = DECOR_SKIP[map.name] || null
    const limit = DECOR_LIMIT[map.name] || null
    const seen = limit ? {} : null
    let manifest
    try { manifest = await (await fetch(BASE + 'assets/decor.json')).json() } catch { return }
    for (const d of list) {
      if (skip && skip.has(d.name)) continue      // decoraciones que sacamos a mano por mapa
      if (limit && d.name in limit) {             // límite de copias por nombre
        seen[d.name] = (seen[d.name] || 0) + 1
        if (seen[d.name] > limit[d.name]) continue
      }
      const meta = manifest[d.name]
      if (!meta) continue
      // Saltar sprites chicos: son crops mal parseados (salen como "pies" o basura).
      if (meta.cell[1] < 100) continue
      let tex
      try { tex = await Assets.load(BASE + 'assets/' + meta.src) } catch { continue }
      if (this.destroyed) return
      const sp = new Sprite(tex)
      sp.anchor.set(meta.anchor[0] / meta.cell[0], meta.anchor[1] / meta.cell[1])
      sp.x = iso.toWorldX(d.x, d.y)
      sp.y = iso.toWorldY(d.x, d.y)
      sp.zIndex = d.x + d.y
      renderer.objectLayer.addChild(sp)
      // Bloquear el footprint (la fuente ocupa 3×3; cerdos/gente 1×1).
      for (let dy = 0; dy < (d.h || 1); dy++) {
        for (let dx = 0; dx < (d.w || 1); dx++) {
          const bx = d.x + dx, by = d.y + dy
          if (bx >= 0 && bx < grid.w && by >= 0 && by < grid.h) grid.blocked[by * grid.w + bx] = 1
        }
      }
    }
  }

  // --- Cofres y loot ---------------------------------------------------------

  // Crea los cofres del mapa: brillo dorado que pulsa + hotspot para abrir.
  _buildChests(renderer, iso, map, grid) {
    this.chests = []
    for (const c of map.chests || []) {
      const wx = iso.toWorldX(c.x, c.y), wy = iso.toWorldY(c.x, c.y)

      const glow = new Graphics()
      glow.ellipse(0, 0, iso.wHalf * 0.7, iso.hHalf * 0.7).fill({ color: 0xffcf5a, alpha: 0.3 })
      glow.x = wx; glow.y = wy
      glow.zIndex = c.x + c.y - 1
      renderer.groundLayer.addChild(glow)

      // hotspot invisible sobre el tile del cofre (el sprite ya está dibujado en object).
      const hot = new Graphics()
      hot.poly([0, -iso.hHalf, iso.wHalf, 0, 0, iso.hHalf, -iso.wHalf, 0]).fill({ color: 0xffffff, alpha: 0.001 })
      hot.x = wx; hot.y = wy - iso.hHalf
      hot.zIndex = 1e6
      hot.eventMode = 'static'
      hot.cursor = "url('/assets/ui/cursors/cursor_interact.png') 4 4, pointer"
      renderer.objectLayer.addChild(hot)

      const chest = { x: c.x, y: c.y, loot: c.loot, opened: false, glow, hot }
      hot.on('pointertap', (e) => { e.stopPropagation(); this._tapChest(chest) })
      this.chests.push(chest)
    }
  }

  // Tocar un cofre: caminar hasta él; se abre al llegar (en el tick).
  _tapChest(chest) {
    if (chest.opened) return
    this.player.walkTo(chest.x, chest.y) // A* enruta a un tile adyacente si está bloqueado
    this._pendingChest = chest
  }

  // Abre el cofre: tira la tabla real de Flare, suma oro y desparrama los ítems.
  _openChest(chest) {
    chest.opened = true
    if (chest.glow) { chest.glow.destroy(); chest.glow = null }
    if (chest.hot) { chest.hot.eventMode = 'none'; chest.hot.cursor = 'default' }
    playSfx('wood_open.ogg')

    // Abrir un cofre es la acción de Saqueo (+XP de skill y de jugador).
    this.store.addSkillXp('saqueo', 14)
    this.store.addXp(10)

    const roll = rollLoot(chest.loot)
    if (roll.gold > 0) this.store.addGold(roll.gold)

    const tiles = this._scatterTiles(chest.x, chest.y, roll.drops.length)
    roll.drops.forEach((d, i) => {
      const item = itemById(d.id)
      if (!item) return
      const [tx, ty] = tiles[i] || [chest.x, chest.y]
      const gi = new GroundItem(this.iso, tx, ty, item, d.qty, RARITY_COLOR[item.rarity])
      gi.onTap((g) => { this.player.walkTo(g.tx, g.ty) }) // caminar hacia él; se recoge al pasar
      this.renderer.objectLayer.addChild(gi.view)
      this.groundItems.push(gi)
    })
  }

  // Tiles caminables alrededor del cofre para repartir el loot (sin repetir).
  _scatterTiles(cx, cy, n) {
    const ring = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2]]
    const out = []
    for (const [dx, dy] of ring) {
      if (out.length >= n) break
      const x = cx + dx, y = cy + dy
      if (this.grid.isWalkable(x, y) && !out.some(([ox, oy]) => ox === x && oy === y)) out.push([x, y])
    }
    while (out.length < n) out.push([cx, cy]) // fallback: encima del cofre
    return out
  }

  // Recoge un ítem del suelo (oro ya se sumó al abrir). Devuelve true si entró.
  _pickup(gi) {
    if (!this.store.addItem(gi.item, gi.qty)) return false // inventario lleno: queda en el piso
    playSfx('flying_loot.ogg')
    this.store.logMessage({ channel: 'sistema', text: tt('picked_up', { name: itemName(gi.item, getLang()), qty: gi.qty > 1 ? ' ×' + gi.qty : '' }) })
    gi.picked = true
    gi.destroy()
    return true
  }

  // Carga el atlas del tileset en un canvas 2D para poder leer su alpha por-pixel.
  async _loadOcclusionAtlas(src) {
    try {
      const img = new Image()
      img.decoding = 'async'
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
      if (this.destroyed) return
      const cv = document.createElement('canvas')
      cv.width = img.naturalWidth; cv.height = img.naturalHeight
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      this._atlasCtx = ctx
    } catch { this._atlasCtx = null }
  }

  // Máscara de alpha (Uint8) de un tile de edificio, extraída del atlas una sola vez.
  _maskFor(s) {
    const key = s.texture.uid
    let m = this._masks.get(key)
    if (m !== undefined) return m
    m = null
    try {
      const f = s.texture.frame
      const raw = this._atlasCtx.getImageData(f.x, f.y, f.width, f.height).data
      const a = new Uint8Array(f.width * f.height)
      for (let i = 0; i < a.length; i++) a[i] = raw[i * 4 + 3]
      m = { w: f.width | 0, h: f.height | 0, a }
    } catch { m = null }
    this._masks.set(key, m)
    return m
  }

  // ¿El sprite `s` (edificio) tapa de verdad al personaje? Muestrea la silueta del
  // jugador (pies, torso, cabeza) contra el alpha del edificio: sólo si un pixel opaco
  // del edificio cae sobre el cuerpo, está tapado. Así nunca se atenúa de lejos/frente.
  _coversPlayer(s) {
    const m = this._maskFor(s)
    if (!m) return false
    const px = this.player.view.x, feetY = this.player.view.y
    const lx = Math.round(px - s.x)
    if (lx < 0 || lx >= m.w) return false
    // puntos a lo largo del alto del personaje (mundo px; hacia arriba es negativo)
    for (const dy of [-6, -32, -58, -80]) {
      const ly = Math.round(feetY + dy - s.y)
      if (ly < 0 || ly >= m.h) continue
      if (m.a[ly * m.w + lx] > 60) return true
    }
    return false
  }

  // Atenúa un EDIFICIO sólo cuando su pixel opaco realmente tapa al personaje (lo cubre
  // por detrás). Excluye cercas, árboles, barriles y props del suelo por tamaño.
  _updateOcclusion() {
    const p = this.player
    if (!p || !this._atlasCtx) return
    const iso = this.iso
    const pd = p.tx + p.ty                         // profundidad del jugador (x+y)
    const bldMinW = iso.tileW * 2.5                // sólo sprites grandes (edificios)
    const bldMinH = iso.tileH * 2.5
    const occ = this._occAlpha || (this._occAlpha = new Map()) // alpha por tile (persiste entre rebuilds)
    this.renderer.eachVisibleObject((s) => {
      let hide = false
      const tw = s.texture ? s.texture.width : s.width
      const th = s.texture ? s.texture.height : s.height
      // Debe estar dibujado por ENCIMA del jugador (más profundo) y ser un edificio.
      if (s.zIndex > pd && tw >= bldMinW && th >= bldMinH) hide = this._coversPlayer(s)
      const target = hide ? 0.3 : 1
      let a = occ.get(s._ti); if (a === undefined) a = 1
      a += (target - a) * 0.28                      // desvanecido suave, por tile
      if (a > 0.999) a = 1
      occ.set(s._ti, a)
      s.alpha = a
    })
  }

  // --- Combate ---------------------------------------------------------------

  async _spawnEnemies(renderer, map, grid, manifest, spawn) {
    const spawners = map.spawners || []
    if (!spawners.length || !manifest.enemies) return
    const MAX = 40
    for (const sp of spawners) {
      if (this.enemies.length >= MAX) break
      const n = randInt(sp.n || [1, 1])
      for (let k = 0; k < n && this.enemies.length < MAX; k++) {
        const tile = randTileIn(sp, grid)
        if (!tile) continue
        if (Math.abs(tile.x - spawn.x) + Math.abs(tile.y - spawn.y) < 8) continue // no encima del jugador
        const level = randInt(sp.level || [1, 1])
        let sprite = pickSprite(sp.category || 'goblin')
        // ~30% de los enemigos de campo son de rango (arqueros/magos), si tienen primo a distancia.
        const cousin = rangedCousin(sprite)
        if (cousin && manifest.enemies[cousin] && Math.random() < 0.3) sprite = cousin
        if (!manifest.enemies[sprite]) continue
        const st = enemyStats(sprite, level)
        const ranged = isRanged(sprite)
        const e = new Enemy(manifest, {
          sprite, x: tile.x, y: tile.y, level,
          hpMax: st.hpMax, damage: st.damage, xp: st.xp, gold: st.gold, name: enemyName(sprite),
          ranged, projKind: projectileKind(sprite),
        }, this.iso, grid)
        const ok = await e.load()
        if (this.destroyed) return
        if (!ok) continue
        e.view.scale.set(this._eScale)
        e.onTap((en) => this._targetEnemy(en))
        if (ranged) e.onShoot((en) => this._enemyShoot(en))
        renderer.objectLayer.addChild(e.view)
        this.enemies.push(e)
      }
    }
  }

  _targetEnemy(e) {
    if (this._dead || e.dead) return
    this._target = e
    this.player.walkTo(Math.round(e.tx), Math.round(e.ty))
    this._retargetT = 0.3
  }

  // --- Recursos: nodos de hierbas / vetas de cristal --------------------------
  // Siembra unos nodos en tiles caminables lejos del spawn. Las minas/cuevas traen más
  // vetas de cristal; el resto, más hierbas. Sólo en zonas de combate (las que tienen spawners).
  _spawnNodes(renderer, iso, map, grid, spawn, mapName) {
    if (mapName === 'triston') return                     // el pueblo no tiene recursos
    if (!(map.spawners || []).length) return              // sólo zonas salvajes
    const tex = iconsTexture()
    if (!tex) return
    const mine = /mine|cave|cavern|underground|labyrinth|pit/i.test(mapName)
    const total = 5 + ((randInt([0, 3])) | 0)
    const used = new Set()
    for (let k = 0; k < total; k++) {
      const skill = (mine ? Math.random() < 0.6 : Math.random() < 0.35) ? 'excavacion' : 'herboristeria'
      const opts = GATHER[skill]
      const mat = opts[(Math.random() * opts.length) | 0]
      const tile = this._randomWalkable(grid, spawn, used)
      if (!tile) continue
      used.add(tile.y * grid.w + tile.x)
      const item = itemById(mat.id)
      const node = new ResourceNode(iso, tile.x, tile.y, {
        id: mat.id, name: mat.name, glow: mat.glow, base: mat.base, icon: item.icon, skill,
      }, tex)
      node.onTap((n) => this._gatherNode(n))
      renderer.objectLayer.addChild(node.view)
      this.nodes.push(node)
    }
  }

  _randomWalkable(grid, spawn, used) {
    for (let tries = 0; tries < 40; tries++) {
      const x = 1 + ((Math.random() * (grid.w - 2)) | 0)
      const y = 1 + ((Math.random() * (grid.h - 2)) | 0)
      if (!grid.isWalkable(x, y)) continue
      if (used.has(y * grid.w + x)) continue
      if (Math.abs(x - spawn.x) + Math.abs(y - spawn.y) < 6) continue // no encima del jugador
      return { x, y }
    }
    return null
  }

  // Tocar un nodo: el jugador camina hasta él y junta al llegar.
  _gatherNode(node) {
    if (node.depleted || this._dead) return
    this._pendingNode = node
    this.player.walkTo(node.tx, node.ty)
  }

  _doGather(node) {
    if (node.depleted) return
    const item = itemById(node.def.id)
    if (!item) return
    const qty = 1 + (Math.random() < 0.25 ? 1 : 0)      // a veces sale doble
    if (!this.store.addItem(item, qty)) { this.store.showToast(tt('inv_full')); return }
    this.store.addSkillXp(node.def.skill, 6)
    node.deplete()
    const mat = itemName(item, getLang())
    this._floatText(node.view.x, node.view.y - 30, `+${qty} ${mat}`, '#bfe9a0')
    this.store.logMessage({ channel: 'sistema', text: tt('gathered', { name: mat, n: qty }) })
    playSfx('step2.ogg', 0.5)
  }

  _playerMeleeDamage() {
    const st = this.store.getStats() || {}
    const min = st.dmgMin || 2, max = st.dmgMax || 5
    const raw = (min + Math.random() * (max - min)) * (st.dmgMul || 1) + (st.str || 10) * 0.2
    // golpe crítico (crit% del equipo): x2
    const crit = (st.crit || 0) > 0 && Math.random() * 100 < st.crit
    return { dmg: Math.max(1, Math.round(raw * (crit ? 2 : 1))), crit }
  }

  _enemyKilled(e) {
    this.store.addSkillXp('combate', e.def.xp)
    this.store.addXp(e.def.xp)
    this.store.addGold(e.def.gold)
    this._floatText(e.view.x, e.view.y + e._hpY, `+${e.def.xp} XP`, '#9fe0ff')
    this.store.logMessage({ channel: 'sistema', text: tt('defeated', { name: enemyName(e.def.sprite, getLang()), xp: e.def.xp, gold: e.def.gold }) })
    if (this._target === e) this._target = null
  }

  _floatText(x, y, text, color) {
    const t = new Text({ text, style: {
      fontFamily: 'Georgia, serif', fontSize: 15, fill: color,
      stroke: { color: '#0a090c', width: 3 }, align: 'center',
    } })
    t.anchor.set(0.5, 1)
    t.x = x; t.y = y; t.zIndex = 2e6
    this.renderer.objectLayer.addChild(t)
    this._floaters.push({ t, life: 0.9 })
  }

  // Lanza un proyectil (flecha/orbe) de un punto a otro en coordenadas de mundo. onHit corre al impacto.
  _spawnProjectile(x0, y0, x1, y1, kind, onHit) {
    const pr = new Projectile({ x0, y0, x1, y1, kind, onHit })
    this.renderer.objectLayer.addChild(pr.view)
    this._projectiles.push(pr)
  }

  // Un arquero/mago suelta el disparo: viaja hacia donde estaba el jugador. Si al impacto el
  // jugador sigue cerca, recibe daño; si se movió a tiempo, lo esquivó.
  _enemyShoot(en) {
    if (this._dead || !this.player) return
    const p = this.player
    const aimTx = p.tx, aimTy = p.ty
    const dmg0 = en.damage
    this._spawnProjectile(en.view.x, en.view.y + (en._hpY || -40) * 0.5, p.view.x, p.view.y - 40, en.projKind, () => {
      if (this._dead || !this.player) return
      const dd = Math.abs(this.player.tx - aimTx) + Math.abs(this.player.ty - aimTy)
      if (dd > 1.3) return   // el jugador se movió: esquivó la flecha
      const defense = (this.store.getStats()?.defense) || 0
      const dmg = Math.max(1, dmg0 - defense)
      const hp = this.store.takeDamage(dmg)
      this._floatText(this.player.view.x, this.player.view.y - 70, `-${dmg}`, '#ff6a5a')
      this.store.degradeGear('armor', 1)
      if (this._hurtCd <= 0) { this.player.hurt(); playSfx('player_hit.ogg'); this._hurtCd = 0.5 }
      if (hp <= 0) this._playerDeath()
    })
    playSfx('swing.ogg', 0.45)
  }

  // El jugador dispara a un enemigo con arco/varita: el daño se aplica cuando el proyectil llega.
  _playerShoot(target, hit, kind) {
    const p = this.player
    const proj = kind === 'mental' ? 'magic' : 'arrow'
    this._spawnProjectile(p.view.x, p.view.y - 40, target.view.x, target.view.y + (target._hpY || -40) * 0.5, proj, () => {
      if (!target || target.dead) return
      this._floatText(target.view.x, target.view.y + target._hpY, hit.crit ? `¡${hit.dmg}!` : `${hit.dmg}`, hit.crit ? '#ff9a3a' : '#ffe08a')
      if (Math.random() < 0.34) this.store.degradeGear('weapon', 1)
      if (target.takeDamage(hit.dmg)) this._enemyKilled(target)
    })
  }

  _playerDeath() {
    this._dead = true
    this._deadT = 1.8
    this._target = null
    this.player.moving = false
    this.player.path.length = 0
    this.player.playDie()
    playSfx('player_die.ogg')
    this.store.showToast(tt('fell_combat'))
  }

  _respawn() {
    this._dead = false
    this.store.reviveFull()
    this.store.showToast(tt('revive_town'))
    if (this.mapName !== 'triston') {
      this.changeMap('triston', 56, 52)   // el pueblo es el punto de retorno
      return
    }
    const s = this._spawn
    this.player.tx = s.x; this.player.ty = s.y
    this.player.moving = false; this.player.path.length = 0
    this.player.paperdoll._oneShot = null
    this.camera.follow(s.x, s.y); this.camera.snap()
  }

  // Lógica de combate por frame (la llama el tick). dt en segundos.
  _combatTick(dt) {
    if (!this.enemies) return
    const p = this.player

    // Muerte del jugador: congelado hasta reaparecer.
    if (this._dead) {
      this._deadT -= dt
      for (const e of this.enemies) e.update(dt, p)
      if (this._deadT <= 0) this._respawn()
      return
    }

    if (this._playerAtkCd > 0) this._playerAtkCd -= dt
    if (this._hurtCd > 0) this._hurtCd -= dt
    if (this._retargetT > 0) this._retargetT -= dt

    // Enemigos: IA + daño al jugador (la defensa del equipo reduce cada golpe).
    const defense = (this.store.getStats()?.defense) || 0
    let dmgToPlayer = 0
    for (const e of this.enemies) {
      e.update(dt, p)
      if (e.pendingHit > 0) dmgToPlayer += Math.max(1, e.pendingHit - defense)
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.remove) { e.view.destroy({ children: true }); return false }
      return true
    })

    if (dmgToPlayer > 0) {
      const hp = this.store.takeDamage(dmgToPlayer)
      this._floatText(p.view.x, p.view.y - 70, `-${dmgToPlayer}`, '#ff6a5a')
      this.store.degradeGear('armor', 1)   // recibir golpes gasta la armadura
      if (this._hurtCd <= 0) { p.hurt(); playSfx('player_hit.ogg'); this._hurtCd = 0.5 }
      if (hp <= 0) { this._playerDeath(); return }
    }

    // Ataque del jugador al enemigo apuntado. Con arma a distancia (arco/varita) dispara desde
    // lejos; cuerpo a cuerpo se acerca a un tile. weaponKind sale del equipo.
    const t = this._target
    if (t && !t.dead) {
      const kind = (this.store.getStats()?.weaponKind) || 'melee'
      const ranged = kind !== 'melee'
      const reach = ranged ? 6 : 1.6
      const d = Math.abs(t.tx - p.tx) + Math.abs(t.ty - p.ty)
      if (d > reach) {
        if (this._retargetT <= 0) { p.walkTo(Math.round(t.tx), Math.round(t.ty)); this._retargetT = 0.3 }
      } else {
        if (p.moving) { p.moving = false; p.path.length = 0 }
        p.faceTile(t.tx, t.ty)
        if (this._playerAtkCd <= 0) {
          const anim = kind === 'mental' ? 'cast' : kind === 'ranged' ? 'shoot' : 'swing'
          const ms = p.attack(anim) || 400
          playSfx('swing.ogg')
          this._playerAtkCd = Math.max(0.65, ms / 1000)
          const hit = this._playerMeleeDamage()
          if (ranged) this._playerShoot(t, hit, kind)
          else this._pendingHit = { at: (ms / 1000) * 0.5, dmg: hit.dmg, crit: hit.crit, target: t }
        }
      }
    } else if (t && t.dead) {
      this._target = null
    }

    // Golpe del jugador que estaba en cola (a mitad de la anim de swing).
    if (this._pendingHit) {
      this._pendingHit.at -= dt
      if (this._pendingHit.at <= 0) {
        const { dmg, crit, target } = this._pendingHit
        this._pendingHit = null
        if (target && !target.dead) {
          const d = Math.abs(target.tx - p.tx) + Math.abs(target.ty - p.ty)
          if (d <= 2) {
            this._floatText(target.view.x, target.view.y + target._hpY, crit ? `¡${dmg}!` : `${dmg}`, crit ? '#ff9a3a' : '#ffe08a')
            if (Math.random() < 0.34) this.store.degradeGear('weapon', 1) // atacar gasta el arma
            if (target.takeDamage(dmg)) this._enemyKilled(target)
          }
        }
      }
    }

    // Proyectiles en vuelo (flechas/orbes): avanzan y aplican su impacto al llegar.
    if (this._projectiles.length) {
      for (const pr of this._projectiles) pr.update(dt)
      this._projectiles = this._projectiles.filter((pr) => {
        if (pr.dead) { pr.view.destroy({ children: true }); return false }
        return true
      })
    }

    // Números flotantes.
    if (this._floaters.length) {
      for (const f of this._floaters) {
        f.life -= dt
        f.t.y -= dt * 34
        f.t.alpha = Math.max(0, f.life / 0.9)
      }
      this._floaters = this._floaters.filter((f) => {
        if (f.life <= 0) { f.t.destroy(); return false }
        return true
      })
    }
  }

  _onResize = () => {
    if (!this.app) return
    this.camera.resize(this.app.screen.width, this.app.screen.height)
  }

  // Minimapa: proyección iso de la ciudad (misma orientación que la vista).
  _buildMinimap(map) {
    const w = map.w, h = map.h
    const co = map.layers.collision, bg = map.layers.background
    const scale = 0.72
    const pad = 3
    const minMx = -(h - 1)
    const cw = Math.ceil((w + h - 2) * scale) + pad * 2
    const ch = Math.ceil((w + h - 2) * 0.5 * scale) + pad * 2
    const cv = document.createElement('canvas')
    cv.width = cw; cv.height = ch
    const ctx = cv.getContext('2d')
    const dot = Math.max(1, scale * 1.5)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ground = bg[y][x] > 0
        if (!ground) continue // vacío -> transparente
        const walk = co[y][x] === 0
        ctx.fillStyle = walk ? 'rgba(150,138,110,0.72)' : 'rgba(40,34,46,0.85)'
        const mx = x - y, my = (x + y) * 0.5
        ctx.fillRect((mx - minMx) * scale + pad, my * scale + pad, dot, dot)
      }
    }
    return { url: cv.toDataURL('image/png'), scale, minMx, pad, w: cw, h: ch }
  }

  _setupInput(app) {
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    const onTap = (e) => {
      if (this._dead || this._loading || this._changing) return // congelado
      this._target = null                    // tocar el suelo cancela el ataque
      const w = this.camera.screenToWorld(e.global.x, e.global.y)
      const t = this.iso.toTile(w.x, w.y)
      const tx = Math.round(t.x)
      const ty = Math.round(t.y)
      const path = this.player.walkTo(tx, ty)
      if (path.length) {
        const dest = path[path.length - 1]
        this._showDestination(dest.x, dest.y)
      }
    }
    app.stage.on('pointertap', onTap)
    this._onTap = onTap

    // Click DERECHO (estilo Diablo): acción directa sobre lo que hay bajo el cursor
    // (enemigo -> atacar, cadáver -> inspeccionar). Bloqueamos el menú del navegador.
    this._onContext = (e) => e.preventDefault()
    app.canvas.addEventListener('contextmenu', this._onContext)
    app.stage.on('pointerdown', (e) => { if (e.button === 2) this._rightClick(e.global.x, e.global.y) })
  }

  // Marca el destino con una X (estilo Diablo): queda mientras el personaje camina.
  _showDestination(tx, ty) {
    const p = this.ping
    p.clear()
    p.x = this.iso.toWorldX(tx, ty)
    p.y = this.iso.toWorldY(tx, ty)
    const rx = this.iso.wHalf * 0.62, ry = this.iso.hHalf * 0.62
    // halo oscuro (contraste) + X dorada encima, apoyada en el plano del piso
    p.moveTo(-rx, -ry).lineTo(rx, ry).moveTo(rx, -ry).lineTo(-rx, ry)
      .stroke({ color: 0x000000, width: 6, alpha: 0.55, cap: 'round' })
    p.moveTo(-rx, -ry).lineTo(rx, ry).moveTo(rx, -ry).lineTo(-rx, ry)
      .stroke({ color: 0xffcf5a, width: 3, alpha: 1, cap: 'round' })
    p.visible = true
    p.alpha = 1
    this._markT = 0
    this._markFade = 0
  }

  _tick = (ticker) => {
    const dtFrames = ticker.deltaTime            // ~1 a 60fps
    const dt = ticker.deltaMS / 1000             // segundos

    // Fundido al viajar entre mapas.
    if (this._fadeOut) {
      this._fadeAlpha = Math.max(0, this._fadeAlpha - dt * 3)
      this.fade.alpha = this._fadeAlpha
      if (this._fadeAlpha <= 0) { this._fadeOut = false; this.fade.visible = false }
    }
    // Mientras reconstruye el mundo (cambio de mapa), no toques nada.
    if (this._loading || this._changing || !this.player) return

    // Correr/caminar con stamina.
    const st = this.store.getRunState()
    const runningNow = st.running && st.stamina > 0 && this.player.moving
    let stamina = st.stamina
    if (runningNow) stamina = Math.max(0, stamina - STAM_DRAIN * dt)
    else stamina = Math.min(st.staminaMax, stamina + STAM_REGEN * dt)
    const speedPx = runningNow ? RUN_PX : WALK_PX

    this.player.update(dt, speedPx)

    // Pasos: un sonido de pisada cada tanto mientras camina (más rápido si corre).
    if (this.player.moving && !this._dead) {
      this._stepT = (this._stepT || 0) + dt
      const interval = speedPx >= RUN_PX ? 0.26 : 0.36
      if (this._stepT >= interval) { this._stepT = 0; playSfx('step' + (1 + ((Math.random() * 4) | 0)) + '.ogg', 0.5) }
    } else this._stepT = 0

    // Diálogo sobre la cabeza.
    const sp = this.store.getSpeech()
    if (sp && Date.now() < sp.until) this.player.showBubble(sp.text)
    else this.player.hideBubble()

    // NPCs (anim idle + globos).
    for (const npc of this.npcs) npc.update(dt)

    // Combate: IA de enemigos, ataque del jugador, daño y muerte/reaparición.
    this._combatTick(dt)

    // NPC cercano interactuable (para el botón del HUD): el más próximo dentro de rango.
    let near = null, nd = 1e9
    for (const npc of this.npcs) {
      const d = Math.abs(npc.tx - this.player.tx) + Math.abs(npc.ty - this.player.ty)
      if (d < nd) { nd = d; near = npc }
    }
    this._nearbyNpc = (near && nd <= 2.5) ? near : null
    // Botón "interactuar" del HUD: si cambió el contador y hay NPC cerca, hablar/comerciar.
    const seq = this.store.getInteractSeq()
    if (seq !== this._lastInteractSeq) { this._lastInteractSeq = seq; if (this._nearbyNpc) this._talkTo(this._nearbyNpc) }

    // Piedra de Retorno usada desde el cinturón: recall al pueblo.
    const rseq = this.store.getRecallSeq()
    if (rseq !== this._lastRecallSeq) { this._lastRecallSeq = rseq; this._doRecall() }

    // Abrir el cofre pendiente al llegar cerca.
    if (this._pendingChest && !this.player.moving) {
      const c = this._pendingChest
      const near = Math.abs(this.player.tx - c.x) <= 1.6 && Math.abs(this.player.ty - c.y) <= 1.6
      if (near && !c.opened) this._openChest(c)
      this._pendingChest = null
    }

    // Nodos de recursos: bob + juntar al llegar al nodo apuntado.
    if (this.nodes && this.nodes.length) {
      for (const nd of this.nodes) nd.update(dt)
      if (this._pendingNode && !this.player.moving) {
        const n = this._pendingNode
        const near = Math.abs(this.player.tx - n.tx) <= 1.6 && Math.abs(this.player.ty - n.ty) <= 1.6
        if (near && !n.depleted) this._doGather(n)
        this._pendingNode = null
      }
    }

    // Loot en el suelo: bob + recoger al caminarle encima.
    if (this.groundItems.length) {
      const px = this.player.tx, py = this.player.ty
      for (const gi of this.groundItems) {
        if (gi.picked) continue
        gi.update(dt)
        if (Math.abs(px - gi.tx) <= 0.75 && Math.abs(py - gi.ty) <= 0.75) this._pickup(gi)
      }
      this.groundItems = this.groundItems.filter((g) => !g.picked)
    }

    // Partículas ambientales.
    this._pt = (this._pt || 0) + dt
    this.particles.update(dt, this._pt)

    // Portales: pulso del marcador + viaje al pisar la zona (tras haber salido de ella,
    // así no se dispara el portal en el que aparecés).
    if (this.portals && this.portals.length) {
      const pulse = 1 + 0.13 * Math.sin(this._pt * 4)
      for (const p of this.portals) {
        p.gfx.scale.set(pulse)
        // pad: pingpong de frames (apagado <-> runas brillando)
        if (p.pad) {
          p._padT += dt
          if (p._padT > 0.14) {
            p._padT = 0
            p._padFrame += p._padDir
            if (p._padFrame >= 4) { p._padFrame = 4; p._padDir = -1 }
            else if (p._padFrame <= 0) { p._padFrame = 0; p._padDir = 1 }
            p.pad.texture.frame.y = p._padFrame * 128
            p.pad.texture.updateUvs()
          }
        }
      }
      // Portal cercano: se viaja por BOTÓN (interacción), no al pasar por encima.
      let near = null, nd = 1e9
      for (const p of this.portals) {
        const d = Math.abs((p.x + (p.w - 1) / 2) - this.player.tx) + Math.abs((p.y + (p.h - 1) / 2) - this.player.ty)
        if (d < nd) { nd = d; near = p }
      }
      this._nearbyPortal = (near && nd <= 2.2 && !this._dead) ? near : null
      this.store.setNearbyPortal(this._nearbyPortal ? { label: this._nearbyPortal.label } : null)
      const pseq = this.store.getPortalSeq()
      if (pseq !== this._lastPortalSeq) {
        this._lastPortalSeq = pseq
        if (this._nearbyPortal) { this._enterPortal(this._nearbyPortal); return }
      }
    }

    // Empujar la stamina y la posición (minimapa) al HUD a ~12Hz (no cada frame).
    this._stamAccum = (this._stamAccum || 0) + dt
    if (this._stamAccum >= 0.08 || (stamina === 0) !== (st.stamina === 0)) {
      this.store.setStamina(Math.round(stamina))
      this.store.setPlayerTile({ x: this.player.tx, y: this.player.ty })
      const n = this._nearbyNpc
      this.store.setNearby(n ? { name: npcName(n.def, getLang()), shop: !!n.def.shop } : null)
      this._stamAccum = 0
    }
    this.camera.follow(this.player.tx, this.player.ty)
    this.camera.update(dtFrames)

    // Posicionar el mundo según la cámara.
    this.worldContainer.x = this.camera.offsetX
    this.worldContainer.y = this.camera.offsetY

    // Culling de tiles.
    this.renderer.update(this.camera)

    // Transparencia: si un edificio queda DELANTE del jugador (lo tapa), lo atenuamos
    // para no perderlo de vista al pasar por detrás.
    this._updateOcclusion()

    // Marcador de destino: pulsa mientras caminás; se desvanece al llegar.
    if (this.ping.visible) {
      this._markT += dt
      const pulse = 1 + 0.12 * Math.sin(this._markT * 9)
      this.ping.scale.set(pulse)
      if (!this.player.moving) {
        this._markFade += dt
        this.ping.alpha = Math.max(0, 1 - this._markFade / 0.35)
        if (this._markFade >= 0.35) this.ping.visible = false
      }
    }

    // Telemetría al HUD.
    this._fpsAccum += ticker.deltaMS
    this._fpsFrames++
    if (this._fpsAccum >= 500) {
      const fps = Math.round((this._fpsFrames * 1000) / this._fpsAccum)
      this.store.setFps(fps)
      const lvl = this.store.getPlayerLevel()
      if (lvl !== this._nameLevel) { this._nameLevel = lvl; this.player.setName(this.store.getPlayerName(), lvl, this.store.getRaceName()) }
      this.store.setDebug({
        tile: `${Math.round(this.player.tx)},${Math.round(this.player.ty)}`,
        visibleTiles: this.renderer.visibleTiles,
      })
      this._fpsAccum = 0
      this._fpsFrames = 0
    }
  }

  destroy() {
    this.destroyed = true
    window.removeEventListener('resize', this._onResize)
    if (this._onContext && this.app?.canvas) this.app.canvas.removeEventListener('contextmenu', this._onContext)
    if (this._unsub) { this._unsub(); this._unsub = null }
    if (this.app) {
      this.app.ticker.remove(this._tick)
      this.app.destroy(true, { children: true, texture: false })
      this.app = null
    }
  }
}

// Entero al azar en un rango [min,max] (los spawners de Flare vienen así).
function randInt(range) {
  const a = Array.isArray(range) ? range[0] : range
  const b = Array.isArray(range) ? range[1] : range
  return a + Math.floor(Math.random() * (b - a + 1))
}

// Tile caminable al azar dentro del rectángulo de un spawner.
function randTileIn(sp, grid) {
  for (let i = 0; i < 12; i++) {
    const x = sp.x + Math.floor(Math.random() * (sp.w || 1))
    const y = sp.y + Math.floor(Math.random() * (sp.h || 1))
    if (grid.isWalkable(x, y)) return { x, y }
  }
  return null
}

// Slots visibles del paperdoll (ring/artifact no se ven).
const VISIBLE_SLOTS = ['chest', 'legs', 'hands', 'feet', 'head', 'main', 'off']

// equipment (slot -> item) -> mapa de capas gfx para el paperdoll.
function equipToGfx(equip) {
  const out = {}
  for (const slot of VISIBLE_SLOTS) {
    const it = equip && equip[slot]
    out[slot] = it && it.gfx ? it.gfx : null
  }
  return out
}

// Spawn de hub elegido a mano (plaza/centro) por mapa; si no, centroide abierto.
const HUB_SPAWN = {
  black_oak_city: [41, 13], black_oak_farm: [58, 54], lochport: [37, 27],
  greenwood_point: [51, 51], triston: [59, 58],
}

// Escala de nuestras entidades (personaje + NPCs) por mapa. El arte de HERESY (Triston)
// dibuja personajes CHICOS respecto de sus edificios; nuestro héroe (fantasycore) es más
// grande, así que lo achicamos para que encaje con los aldeanos y la escala del pueblo.
const ENTITY_SCALE = { triston: 0.66 }

// El héroe con equipo pesado se dibuja un pelín más alto que los aldeanos; lo achicamos
// un poco MÁS que a los NPCs para que coincidan bien.
const PLAYER_SCALE = { triston: 0.9 }

// Zoom de cámara por mapa: al achicar las entidades, acercamos la cámara para que el
// pueblo no se vea diminuto en pantallas grandes (todo más grande, sin deformar escala).
const MAP_ZOOM = { triston: 1.3 }

// --- Red de zonas ---------------------------------------------------------------
// Los mapas de Flare ya traen su propia grilla de portales (la campaña Empyrean está
// conectada de fábrica). La usamos tal cual para que el mundo sea explorable de verdad,
// y sólo curamos los bordes: Triston (arte HERESY) apunta a mapas que no convertimos, así
// que lo REEMPLAZAMOS; y agregamos algunos portales EXTRA para cerrar el loop al pueblo y
// puentear los tres racimos de dificultad en un único descenso (nivel 1 -> 10).

// Mapas cuyos portales nativos no sirven: usamos SÓLO esta lista.
const PORTAL_REPLACE = {
  // El portal del pueblo va en las afueras (al norte de la plaza), no en el centro.
  triston: [{ x: 57, y: 41, w: 1, h: 1, to: 'goblin_camp', tx: 29, ty: 31, label: 'Campo de Duendes' }],
}

// Portales que AGREGAMOS encima de los nativos del mapa (llegada = spawn walkable del destino).
const PORTAL_EXTRA = {
  // Vuelta al pueblo desde la zona de entrada.
  goblin_camp: [{ x: 29, y: 31, w: 1, h: 1, to: 'triston', tx: 57, ty: 41, label: 'Volver a Triston' }],
  // Puente racimo I (nivel 1-3) -> racimo II (nivel 5-6): del puerto a las minas.
  lochport: [{ x: 43, y: 1, w: 1, h: 1, to: 'abandoned_mines', tx: 76, ty: 71, label: 'Minas Abandonadas' }],
  // Puente racimo II (nivel 5-6) -> racimo III (nivel 9-10): de la brecha a Black Oak City.
  the_breach: [{ x: 46, y: 98, w: 1, h: 1, to: 'black_oak_city', tx: 98, ty: 50, label: 'Black Oak City' }],
}

// Tile de llegada al recall a Triston: al lado del Obelisco de Retorno (55,45) de la plaza.
const OBELISK_RETURN = [55, 46]

// Destinos que NO conectamos (nexos de fast-travel / mapas de sistema de Flare).
const PORTAL_BLOCK = new Set(['hyperspace', 'World_map', 'spawn', 'arrival'])
const portalAllowed = (to) => !!to && !PORTAL_BLOCK.has(to) && !/^Act\d|^World/i.test(to)

// Nombre de zona según el idioma actual (definiciones ES/EN en i18n.js).
const zoneTitle = (mapName, fallback) => zoneName(mapName, getLang(), fallback)

// Decoraciones ambientales de HERESY que sacamos a mano (por mapa). En Triston quitamos
// al posadero rojo del carro: ese puesto es donde ponemos al mercader (parece un mercado).
const DECOR_SKIP = { triston: new Set(['Act1_innkeeper_owens']) }

// Límite de copias por nombre (por mapa): en Triston el cementerio del noroeste tenía
// muchos monjes; dejamos uno solo.
const DECOR_LIMIT = { triston: { Lux_priest: 1 } }

function hubOrCentralSpawn(mapName, grid, map) {
  const h = HUB_SPAWN[mapName]
  if (h && grid.isWalkable(h[0], h[1])) return { x: h[0], y: h[1] }
  if (h) {
    const near = grid.nearestWalkable(h[0], h[1], 8)
    if (near) return near
  }
  return centralSpawn(grid, map)
}

// Spawn en el centro de la ciudad: cerca del centroide caminable, pero preferimos un
// tile bien rodeado de suelo (no al borde de un vacío) para una buena primera imagen.
function centralSpawn(grid, map) {
  const bg = map.layers.background
  let sx = 0, sy = 0, n = 0
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (grid.isWalkable(x, y)) { sx += x; sy += y; n++ }
    }
  }
  const cx = n ? Math.round(sx / n) : (map.w >> 1)
  const cy = n ? Math.round(sy / n) : (map.h >> 1)

  // Cuántos tiles de suelo hay en el entorno 7×7 (mide qué tan "lleno" está el lugar).
  const groundScore = (x, y) => {
    let c = 0
    for (let dy = -3; dy <= 3; dy++) {
      const row = bg[y + dy]
      if (!row) continue
      for (let dx = -3; dx <= 3; dx++) if (row[x + dx] > 0) c++
    }
    return c
  }

  let best = null, bestScore = -1
  for (let r = 0; r <= 18; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const x = cx + dx, y = cy + dy
        if (!grid.isWalkable(x, y)) continue
        const s = groundScore(x, y)
        if (s > bestScore) { bestScore = s; best = { x, y } }
      }
    }
    if (best && bestScore >= 44) break // entorno casi lleno: suficiente
  }
  return best || grid.nearestWalkable(cx, cy, 60) || { x: cx, y: cy }
}
