// Stats del personaje. Atributos base + modificadores de raza (docs/WORLD.md) + nivel +
// EQUIPO. Los ítems de Flare dan stats DERIVADOS (defensa=absorb, hp, mp, daño, resistencias,
// crit, etc.), no atributos, así que sumamos esos bonus al derivar los stats finales.
//
// FUE (fuerza) · DES (destreza) · INT (inteligencia) · VIT (vitalidad)

const BASE = { str: 10, dex: 10, int: 10, vit: 10 }

// Reglas por raza, explícitas (WORLD.md).
const RACE_RULES = {
  humano: { xpMul: 1.1 },
  elfo: { int: 3, mpFlat: 30, hpFlat: -10 },
  enano: { vit: 3, hpFlat: 40, speedMul: 0.9 },
  orco: { str: 4, dmgMul: 1.25, mpMul: 0.85 },
}

// Suma los bonus de todos los ítems equipados.
export function equipBonus(equipment) {
  const b = { hp: 0, mp: 0, absorb: 0, hpRegen: 0, mpRegen: 0, crit: 0, accuracy: 0, avoidance: 0, xpGain: 0, itemFind: 0, fireResist: 0, iceResist: 0 }
  if (!equipment) return b
  for (const slot of Object.keys(equipment)) {
    const it = equipment[slot]
    const s = it && it.stats
    if (!s) continue
    b.hp += s.hp || 0
    b.mp += s.mp || 0
    // absorb: la mayoría trae sólo absorb_max; si hay min y max usamos el promedio.
    const amin = s.absorb_min || 0, amax = s.absorb_max || 0
    b.absorb += (amin && amax) ? (amin + amax) / 2 : (amax || amin)
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

// Daño cuerpo a cuerpo del arma equipada (min/max), o puños si no hay arma.
export function weaponDamage(equipment) {
  const w = equipment && equipment.main && equipment.main.stats
  return { min: (w && w.dmg_melee_min) || 2, max: (w && w.dmg_melee_max) || 5 }
}

export function computeStats(raceId, level = 1, equipment = null) {
  const r = RACE_RULES[raceId] || {}
  const str = BASE.str + (r.str || 0)
  const dex = BASE.dex + (r.dex || 0)
  const int = BASE.int + (r.int || 0)
  const vit = BASE.vit + (r.vit || 0)
  const e = equipBonus(equipment)
  const lv = Math.max(1, level | 0)

  // Vida/maná: base por atributo + crecimiento por nivel + bonus plano del equipo.
  const hpMax = Math.round(40 + vit * 4 + (r.hpFlat || 0) + (lv - 1) * 8 + e.hp)
  const mpMax = Math.round((15 + int * 3 + (r.mpFlat || 0)) * (r.mpMul || 1) + (lv - 1) * 3 + e.mp)
  const staminaMax = Math.round(90 + vit * 6)
  const wd = weaponDamage(equipment)

  return {
    level: lv,
    str, dex, int, vit,
    hp: hpMax, hpMax,
    mp: mpMax, mpMax,
    staminaMax,
    defense: e.absorb,              // reduce el daño recibido
    hpRegen: e.hpRegen, mpRegen: e.mpRegen,
    crit: e.crit, accuracy: e.accuracy, avoidance: e.avoidance,
    fireResist: e.fireResist, iceResist: e.iceResist,
    dmgMin: wd.min, dmgMax: wd.max, // daño del arma
    dmgMul: r.dmgMul || 1,
    speedMul: r.speedMul || 1,
    xpMul: (r.xpMul || 1) * (1 + e.xpGain / 100),
  }
}
