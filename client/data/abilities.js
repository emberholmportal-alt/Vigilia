// Habilidades activas: una por rama del árbol. Se desbloquean al alcanzar el atributo de su
// rama (igual que los nodos pasivos: invertir en FUE/DES/INT abre la habilidad de esa vía).
// Cuestan maná y tienen recarga. El daño escala con el arma/atributos del personaje, así que
// crecen con vos. El maná —que hasta ahora no tenía uso— pasa a importar.
//
// kind:
//   'melee_aoe'  — golpe en área alrededor del jugador (no necesita objetivo).
//   'bolt'       — proyectil directo al objetivo (crítico garantizado).
//   'fireball'   — proyectil al objetivo que estalla en área (daño de fuego por INT).
//   'area_phys'  — proyectil al objetivo que estalla en área (daño físico del arma).
//   'buff'       — potencia temporal a uno mismo (no necesita objetivo).
//   'heal'       — restaura vida (por INT, no necesita objetivo).

// `icon` es el índice del ícono real de Flare (public/assets/icons.png), no hay íconos de
// hechizo en el sheet así que usamos armas/pociones como proxy (arte real, no emojis).
export const ABILITIES = [
  // --- vía 1 (req 12): abridor de cada rama ---
  // Guerrero — Embate: molinete que golpea a todos los enemigos cerca por 1.6× el arma.
  { id: 'embate', branch: 'guerrero', attr: 'str', req: 12, mp: 12, cd: 4.5, icon: 99,
    kind: 'melee_aoe', radius: 2.6, dmgMul: 1.6 },
  // Cazador — Saeta certera: disparo que siempre es crítico y pega 2.2× el arma.
  { id: 'saeta', branch: 'cazador', attr: 'dex', req: 12, mp: 10, cd: 3, icon: 96,
    kind: 'bolt', dmgMul: 2.2 },
  // Mago — Bola de fuego: proyectil que estalla; daño base + INT, en área.
  { id: 'fuego', branch: 'mago', attr: 'int', req: 12, mp: 16, cd: 5.5, icon: 104,
    kind: 'fireball', radius: 2.2, base: 14, intMul: 1.1 },

  // --- vía 2 (req 16): firma de cada rama, con un estilo propio ---
  // Guerrero — Vigor: potencia temporal (+daño y +defensa) por unos segundos.
  { id: 'vigor', branch: 'guerrero', attr: 'str', req: 16, mp: 14, cd: 14, icon: 120,
    kind: 'buff', dur: 8, buff: { dmgMul: 0.3, defense: 8 } },
  // Cazador — Lluvia de flechas: volea que cae en área sobre el objetivo (daño físico).
  { id: 'lluvia', branch: 'cazador', attr: 'dex', req: 16, mp: 16, cd: 7, icon: 118,
    kind: 'area_phys', radius: 2.4, dmgMul: 1.3 },
  // Mago — Restaurar: recupera vida escalada por INT (utilidad de la vía arcana).
  { id: 'restaurar', branch: 'mago', attr: 'int', req: 16, mp: 20, cd: 10, icon: 64,
    kind: 'heal', base: 30, intMul: 1.4 },

  // --- vía 3 (req 20): el "ultimate" de cada rama ---
  // Guerrero — Cercenar: molinete devastador que te cura una fracción del daño (robo de vida).
  { id: 'cercenar', branch: 'guerrero', attr: 'str', req: 20, mp: 26, cd: 12, icon: 118,
    kind: 'melee_aoe', radius: 3.4, dmgMul: 2.4, lifesteal: 0.25 },
  // Cazador — Andanada: volea brutal en gran área sobre el objetivo (crítico).
  { id: 'andanada', branch: 'cazador', attr: 'dex', req: 20, mp: 24, cd: 11, icon: 100,
    kind: 'area_phys', radius: 3.2, dmgMul: 1.9 },
  // Mago — Meteoro: estallido enorme; daño base alto + INT, en gran área.
  { id: 'meteoro', branch: 'mago', attr: 'int', req: 20, mp: 32, cd: 14, icon: 107,
    kind: 'fireball', radius: 3.2, base: 42, intMul: 1.7 },
]

export const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((a) => [a.id, a]))

// Habilidades desbloqueadas para los stats dados (atributo de la rama ≥ requisito).
export function unlockedAbilities(stats) {
  if (!stats) return []
  return ABILITIES.filter((a) => (stats[a.attr] || 0) >= a.req)
}
