// Árbol de habilidades + puntos de atributo. Estructura inspirada en el árbol real de Flare
// (mods/empyrean_campaign/powers/trees/default.txt): 3 ramas gateadas por un atributo primario
// —Guerrero (FUE) · Cazador (DES) · Mago (INT)—. Cada nodo cuesta un punto de habilidad y pide
// cierto valor del atributo de su rama (como `requires_primary` de Flare). Los nodos son pasivos
// (suben stats derivados); se rankean hasta un máximo.
//
// Economía: al subir de nivel ganás puntos de atributo (para repartir en FUE/DES/INT/VIT) y
// puntos de habilidad (para rankear nodos). Así subir de nivel ES una decisión, no sólo números.

export const ATTR_PER_LEVEL = 3
export const SKILL_PER_LEVEL = 1

// `icon` = índice del ícono REAL de Flare (public/assets/icons.png), igual que las habilidades.
// Nada de emojis: se dibujan con <ItemIcon>. Espada/escudo/maza para Guerrero, filo/botas/oro
// para Cazador, vara/poción de maná/tomo para Mago.
export const BRANCHES = [
  { id: 'guerrero', attr: 'str', icon: 97 },   // espada
  { id: 'cazador',  attr: 'dex', icon: 96 },   // filo arrojadizo
  { id: 'mago',     attr: 'int', icon: 104 },  // vara
]

// bonus: sumas por rango a stats derivados. Claves: hp, mp, absorb (defensa), dmgMul (+% daño),
// crit (%), accuracy, itemFind (%), speedMul, mpRegen, xpMul.
export const NODES = [
  // Guerrero — FUE (aguante + daño físico)
  { id: 'g_power', branch: 'guerrero', attr: 'str', req: 12, cost: 1, max: 5, icon: 98,  bonus: { dmgMul: 0.05 } },   // espada
  { id: 'g_tough', branch: 'guerrero', attr: 'str', req: 15, cost: 1, max: 5, icon: 122, bonus: { hp: 14, absorb: 2 } }, // escudo
  { id: 'g_rage',  branch: 'guerrero', attr: 'str', req: 19, cost: 1, max: 4, icon: 101, bonus: { crit: 3, dmgMul: 0.03 } }, // martillo
  // Cazador — DES (precisión, velocidad, botín)
  { id: 'c_aim',   branch: 'cazador', attr: 'dex', req: 12, cost: 1, max: 5, icon: 100, bonus: { crit: 2, accuracy: 3 } }, // proyectil
  { id: 'c_swift', branch: 'cazador', attr: 'dex', req: 15, cost: 1, max: 4, icon: 148, bonus: { speedMul: 0.03 } },   // botas
  { id: 'c_greed', branch: 'cazador', attr: 'dex', req: 18, cost: 1, max: 5, icon: 199, bonus: { itemFind: 6 } },     // oro
  // Mago — INT (maná, magia, utilidad)
  { id: 'm_arcane', branch: 'mago', attr: 'int', req: 12, cost: 1, max: 5, icon: 107, bonus: { mp: 14, dmgMul: 0.04 } }, // bastón
  { id: 'm_medit',  branch: 'mago', attr: 'int', req: 15, cost: 1, max: 4, icon: 65,  bonus: { mpRegen: 1 } },        // poción de maná
  { id: 'm_sage',   branch: 'mago', attr: 'int', req: 18, cost: 1, max: 5, icon: 225, bonus: { xpMul: 0.04, mp: 8 } }, // tomo
]

export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]))

// Bonus total del árbol según los rangos gastados.
export function treeBonus(ranks) {
  const b = { hp: 0, mp: 0, absorb: 0, dmgMul: 0, crit: 0, accuracy: 0, itemFind: 0, speedMul: 0, mpRegen: 0, xpMul: 0 }
  if (!ranks) return b
  for (const n of NODES) {
    const r = ranks[n.id] || 0
    if (!r || !n.bonus) continue
    for (const k in n.bonus) b[k] += n.bonus[k] * r
  }
  return b
}

// Puntos ganados/gastados/disponibles.
export const attrEarned = (level) => (Math.max(1, level | 0) - 1) * ATTR_PER_LEVEL
export const skillEarned = (level) => (Math.max(1, level | 0) - 1) * SKILL_PER_LEVEL
export const attrSpent = (alloc) => (alloc?.str || 0) + (alloc?.dex || 0) + (alloc?.int || 0) + (alloc?.vit || 0)
export const skillSpent = (ranks) => NODES.reduce((n, nd) => n + (ranks?.[nd.id] || 0) * nd.cost, 0)
