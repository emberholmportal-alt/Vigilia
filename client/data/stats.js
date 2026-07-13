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

export function computeStats(raceId, level = 1, equipment = null, attrAlloc = null, skillRanks = null) {
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
  const lv = Math.max(1, level | 0)

  // Vida/maná: base por atributo + crecimiento por nivel + bonus plano del equipo + afinidad + árbol.
  const hpMax = Math.round(40 + vit * 4 + (r.hpFlat || 0) + (lv - 1) * 8 + e.hp + aff.hp + tb.hp)
  const mpMax = Math.round((15 + int * 3 + (r.mpFlat || 0)) * (r.mpMul || 1) + (lv - 1) * 3 + e.mp + aff.mp + tb.mp)
  const staminaMax = Math.round(90 + vit * 6)
  const wd = weaponDamage(equipment)

  return {
    level: lv,
    str, dex, int, vit,
    hp: hpMax, hpMax,
    mp: mpMax, mpMax,
    staminaMax,
    defense: e.absorb + aff.absorb + tb.absorb, // reduce el daño recibido (+ afinidad + árbol)
    hpRegen: e.hpRegen, mpRegen: e.mpRegen + tb.mpRegen,
    crit: e.crit + tb.crit, accuracy: e.accuracy + tb.accuracy, avoidance: e.avoidance,
    itemFind: e.itemFind + tb.itemFind, // +% de hallazgo (magic find) para el loot
    fireResist: e.fireResist, iceResist: e.iceResist,
    dmgMin: wd.min, dmgMax: wd.max, // daño del arma
    weaponKind: weaponKind(equipment), // melee / ranged / mental (define ataque a distancia)
    dmgMul: (r.dmgMul || 1) * aff.dmgMul * (1 + tb.dmgMul),
    speedMul: (r.speedMul || 1) * (1 + tb.speedMul),
    xpMul: (r.xpMul || 1) * (1 + e.xpGain / 100) * (1 + tb.xpMul),
  }
}
