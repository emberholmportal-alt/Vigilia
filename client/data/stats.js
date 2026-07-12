// Stats del personaje. Atributos base + modificadores de raza (docs/WORLD.md).
// Sin combate todavía: vida y maná son pozos llenos, para mostrar los orbes tipo Diablo.
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

export function computeStats(raceId) {
  const r = RACE_RULES[raceId] || {}
  const str = BASE.str + (r.str || 0)
  const dex = BASE.dex + (r.dex || 0)
  const int = BASE.int + (r.int || 0)
  const vit = BASE.vit + (r.vit || 0)

  const hpMax = Math.round(40 + vit * 4 + (r.hpFlat || 0))
  const mpMax = Math.round((15 + int * 3 + (r.mpFlat || 0)) * (r.mpMul || 1))
  const staminaMax = Math.round(90 + vit * 6)

  return {
    level: 1,
    str, dex, int, vit,
    hp: hpMax, hpMax,
    mp: mpMax, mpMax,
    staminaMax,
    dmgMul: r.dmgMul || 1,
    speedMul: r.speedMul || 1,
    xpMul: r.xpMul || 1,
  }
}
