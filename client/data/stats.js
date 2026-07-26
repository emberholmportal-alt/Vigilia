// Stats del personaje. Atributos base + modificadores de raza (docs/WORLD.md) + nivel +
// EQUIPO. Los ítems de Flare dan stats DERIVADOS (defensa=absorb, hp, mp, daño, resistencias,
// crit, etc.), no atributos, así que sumamos esos bonus al derivar los stats finales.
//
// FUE (fuerza) · DES (destreza) · INT (inteligencia) · VIT (vitalidad)
import { treeBonus } from './skilltree.js'

const BASE = { str: 10, dex: 10, int: 10, vit: 10 }

// Reglas por raza, explícitas (WORLD.md).
const RACE_RULES = {
  humano: { xpMul: 1.1 },
  elfo: { int: 3, mpFlat: 30, hpFlat: -10 },
  enano: { vit: 3, hpFlat: 40, speedMul: 0.9 },
  orco: { str: 4, dmgMul: 1.25, mpMul: 0.85 },
}

// Un ítem roto (durabilidad 0) no da stats hasta que lo reparen.
const broken = (it) => it && it.dur != null && it.dur <= 0

// Defensa base de una pieza de armadura por slot + tier. La mayoría de los ítems de Flare
// vienen sin `absorb` explícito (viene de sus bases, que no extrajimos), así que la derivamos
// para que TODA la armadura sume defensa que crece con el tier. El torso protege más; guantes
// y botas, menos. El escudo (off) también aporta.
const ARMOR_SLOT = { chest: [2, 1.7], legs: [1, 1.4], head: [1, 1.2], off: [1, 1.5], feet: [0, 1.0], hands: [0, 0.9] }
// Nivel de forja (mejora en el herrero): sube defensa/daño de la pieza.
export const upgradeLevel = (it) => (it && it.upgrade) || 0
export function armorDefense(item) {
  if (!item || broken(item)) return 0
  const w = ARMOR_SLOT[item.slot]
  if (!w) return 0
  return Math.round(w[0] + (item.tier || 1) * w[1]) + upgradeLevel(item) * 2
}

// Afinidad racial de un ítem (por su familia de gfx de Flare): la raza afín lo aprovecha
// mejor. Da un bonus cuando la porta la raza correcta (se aplica en computeStats).
export function itemAffinity(item) {
  const g = (item && item.gfx) || ''
  if (/mage_|wand|staff/.test(g)) return 'elfo'
  if (/chain_|plate_/.test(g)) return 'enano'
  if (/leather_|_axe|axe$|hammer/.test(g)) return 'orco'
  if (/buckler|kite_shield|longsword|shortsword|broadsword|dagger|bow|sling/.test(g)) return 'humano'
  return null
}
// Bonus total por afinidad de las piezas equipadas que coinciden con la raza.
function affinityBonus(raceId, equipment) {
  const b = { absorb: 0, dmgMul: 1, hp: 0, mp: 0 }
  if (!equipment) return b
  for (const sl of Object.keys(equipment)) {
    const it = equipment[sl]
    if (!it || broken(it) || itemAffinity(it) !== raceId) continue
    if (ARMOR_SLOT[it.slot]) b.absorb += Math.round(armorDefense(it) * 0.25)
    if (it.slot === 'main') b.dmgMul += 0.15
    if (raceId === 'enano') b.hp += 6
    else if (raceId === 'elfo') b.mp += 5
  }
  b.absorb = Math.round(b.absorb)
  return b
}

// Suma los bonus de todos los ítems equipados.
export function equipBonus(equipment) {
  const b = { hp: 0, mp: 0, absorb: 0, hpRegen: 0, mpRegen: 0, crit: 0, accuracy: 0, avoidance: 0, xpGain: 0, itemFind: 0, fireResist: 0, iceResist: 0 }
  if (!equipment) return b
  for (const slot of Object.keys(equipment)) {
    const it = equipment[slot]
    const s = it && it.stats
    if (!s || broken(it)) continue
    b.hp += s.hp || 0
    b.mp += s.mp || 0
    // absorb: si el ítem trae valor explícito lo usamos; si no, la defensa derivada del
    // slot+tier (así toda la armadura protege). Promedio de min/max si vienen los dos.
    const amin = s.absorb_min || 0, amax = s.absorb_max || 0
    const explicit = (amin && amax) ? (amin + amax) / 2 : (amax || amin)
    b.absorb += explicit || armorDefense(it)
    b.hpRegen += s.hp_regen || 0
    b.mpRegen += s.mp_regen || 0
    b.crit += s.crit || 0
    b.accuracy += s.accuracy || 0
    b.avoidance += s.avoidance || 0
    b.xpGain += s.xp_gain || 0
    b.itemFind += s.item_find || 0
    b.fireResist += s.fire_resist || 0
    b.iceResist += s.ice_resist || 0
  }
  b.absorb = Math.round(b.absorb)
  return b
}

// Tipo de arma equipada (define cómo ataca el jugador): 'melee', 'ranged' (arcos/hondas)
// o 'mental' (varitas/bastones). Sin arma o rota = puños (melee). Sale de equip_flags de Flare.
export function weaponKind(equipment) {
  const main = equipment && equipment.main
  if (!main || broken(main)) return 'melee'
  const f = main.equip_flags || ''
  if (/mental/.test(f)) return 'mental'
  if (/ranged/.test(f)) return 'ranged'
  return 'melee'
}

// Daño del arma equipada (min/max) según su tipo, o puños (2-5) si no hay arma o está rota.
export function weaponDamage(equipment) {
  const main = equipment && equipment.main
  const w = main && !broken(main) && main.stats
  const up = upgradeLevel(main)
  const base = (() => {
    if (!w) return { min: 2, max: 5 }
    if (w.dmg_ranged_max) return { min: w.dmg_ranged_min || w.dmg_ranged_max, max: w.dmg_ranged_max }
    if (w.dmg_ment_max) return { min: w.dmg_ment_min || w.dmg_ment_max, max: w.dmg_ment_max }
    if (w.dmg_melee_max) return { min: w.dmg_melee_min || w.dmg_melee_max, max: w.dmg_melee_max }
    return { min: 2, max: 5 }
  })()
  return { min: base.min + up, max: base.max + up }
}

// Ventajas de gremio por nivel: la curva vive en shared/ (la usa también el server para la
// recompensa de contrato). Incluye el prestigio n6..n10. Ver shared/guildperks.js.
export { guildPerks } from '../../shared/guildperks.js'
import { guildPerks } from '../../shared/guildperks.js'

// Bonus PASIVO por nivel de las 6 habilidades de oficio (arrancan en 1, cap 20). Cada oficio empuja
// un stat de combate/supervivencia, así TODAS rinden y —al salir por computeStats— viajan por
// setStats al server (que las clampea y las usa: daño, magic-find, defensa). Nivel 1 = sin bonus.
//   Combate → +daño · Forja → +defensa · Saqueo → +magic-find ·
//   Herboristería → +regen de vida · Alquimia → +maná máx · Excavación → +vida máx.
function skillBonus(skills) {
  const lv = (k) => Math.max(0, (((skills && skills[k] && skills[k].level) || 1) - 1))
  return {
    dmgMul: lv('combate') * 0.01,       // +1% daño por nivel (hasta +19% a 20)
    defense: lv('forja') * 1,           // +1 defensa por nivel
    itemFind: lv('saqueo') * 2,         // +2% magic-find por nivel
    hpRegen: lv('herboristeria') * 0.2, // +0.2 regen de vida por nivel
    mp: lv('alquimia') * 2,             // +2 maná máx por nivel
    hp: lv('excavacion') * 3,           // +3 vida máx por nivel
  }
}

// --- Sets (Warlord / Sniper / Archwizard) ------------------------------------------------------
// Los 552 ítems traen el set en el NOMBRE (ej. "Warlord Cloth Shirt") pero sin campo `set` ni lógica
// de bonus. Acá lo derivamos del nombre y damos un bonus por CANTIDAD de piezas del mismo set
// equipadas (temático, por umbrales 3/5/7). Los stats de combate (daño/crit/magic-find/defensa)
// salen por computeStats -> setStats -> server (autoritativo). Versión lean: un set dominante a la vez.
function setOf(item) {
  const n = (item && (item.name_en || item.name)) || ''
  if (n.includes('Warlord')) return 'warlord'
  if (n.includes('Sniper')) return 'sniper'
  if (n.includes('Archwizard')) return 'archwizard'
  return null
}
// Bonus TOTAL por umbral (no acumulativo: se toma el mayor umbral alcanzado). Temático por set.
// Umbrales 2/4/6: el "set completo" (6) es alcanzable por los tres (el Sniper no tiene arma propia
// del set, así que topa en 6 piezas de armadura+artefacto — igual llega al bonus máximo).
const SET_BONUS = {
  warlord:    [{ n: 2, dmgMul: 0.04, hp: 30 }, { n: 4, dmgMul: 0.08, hp: 70, defense: 15 }, { n: 6, dmgMul: 0.15, hp: 150, defense: 40 }],
  sniper:     [{ n: 2, crit: 5, itemFind: 10 }, { n: 4, crit: 10, itemFind: 25, dmgMul: 0.06 }, { n: 6, crit: 20, itemFind: 50, dmgMul: 0.12 }],
  archwizard: [{ n: 2, mp: 40, dmgMul: 0.04 }, { n: 4, mp: 90, dmgMul: 0.08, mpRegen: 2 }, { n: 6, mp: 180, dmgMul: 0.16, mpRegen: 5 }],
}
const SET_LABEL = { warlord: 'Caudillo', sniper: 'Francotirador', archwizard: 'Archimago' }
function setBonus(equipment) {
  if (!equipment) return {}
  const count = {}
  for (const slot of ['head', 'chest', 'legs', 'hands', 'feet', 'main', 'artifact']) {
    const s = setOf(equipment[slot]); if (s) count[s] = (count[s] || 0) + 1
  }
  let best = null, bn = 0
  for (const s in count) if (count[s] > bn) { bn = count[s]; best = s }
  if (!best) return {}
  let bonus = null
  for (const t of (SET_BONUS[best] || [])) if (bn >= t.n) bonus = t
  return bonus ? { ...bonus, _set: best, _setLabel: SET_LABEL[best], _pieces: bn } : { _set: best, _setLabel: SET_LABEL[best], _pieces: bn }
}

export function computeStats(raceId, level = 1, equipment = null, attrAlloc = null, skillRanks = null, guildLevel = 0, skills = null) {
  const r = RACE_RULES[raceId] || {}
  const a = attrAlloc || {}
  // Atributos: base + raza + puntos repartidos al subir de nivel.
  const str = BASE.str + (r.str || 0) + (a.str || 0)
  const dex = BASE.dex + (r.dex || 0) + (a.dex || 0)
  const int = BASE.int + (r.int || 0) + (a.int || 0)
  const vit = BASE.vit + (r.vit || 0) + (a.vit || 0)
  const e = equipBonus(equipment)
  const aff = affinityBonus(raceId, equipment)   // bonus si la raza porta equipo afín
  const tb = treeBonus(skillRanks)               // bonus pasivo de los nodos del árbol
  const gp = guildPerks(guildLevel)              // ventajas del gremio (por nivel)
  const sb = skillBonus(skills)                  // bonus pasivo de las 6 habilidades de oficio
  const set = setBonus(equipment)                // bonus por piezas de set equipadas (Warlord/Sniper/Archwizard)
  const lv = Math.max(1, level | 0)

  // Vida/maná: base por atributo + crecimiento por nivel + equipo + afinidad + árbol + oficios + set.
  const hpMax = Math.round(40 + vit * 4 + (r.hpFlat || 0) + (lv - 1) * 8 + e.hp + aff.hp + tb.hp + sb.hp + (set.hp || 0))
  const mpMax = Math.round((15 + int * 3 + (r.mpFlat || 0)) * (r.mpMul || 1) + (lv - 1) * 3 + e.mp + aff.mp + tb.mp + sb.mp + (set.mp || 0))
  const staminaMax = Math.round(90 + vit * 6)
  const wd = weaponDamage(equipment)

  return {
    level: lv,
    str, dex, int, vit,
    hp: hpMax, hpMax,
    mp: mpMax, mpMax,
    staminaMax,
    defense: e.absorb + aff.absorb + tb.absorb + gp.defense + sb.defense + (set.defense || 0), // (+ Forja + set)
    hpRegen: e.hpRegen + sb.hpRegen, mpRegen: e.mpRegen + tb.mpRegen + (set.mpRegen || 0),
    crit: e.crit + tb.crit + (set.crit || 0), accuracy: e.accuracy + tb.accuracy, avoidance: e.avoidance,
    itemFind: e.itemFind + tb.itemFind + sb.itemFind + (set.itemFind || 0), // magic find (+ Saqueo + set)
    fireResist: e.fireResist, iceResist: e.iceResist,
    dmgMin: wd.min, dmgMax: wd.max, // daño del arma
    weaponKind: weaponKind(equipment), // melee / ranged / mental (define ataque a distancia)
    dmgMul: (r.dmgMul || 1) * aff.dmgMul * (1 + tb.dmgMul + sb.dmgMul + (set.dmgMul || 0)),
    set: set._set ? { id: set._set, label: set._setLabel, pieces: set._pieces } : null, // set activo (para la UI)
    speedMul: (r.speedMul || 1) * (1 + tb.speedMul),
    xpMul: (r.xpMul || 1) * (1 + e.xpGain / 100) * (1 + tb.xpMul) * gp.xpMul,
    guildGoldMul: gp.goldMul, // +oro de botín del gremio (se aplica en addGold)
  }
}
