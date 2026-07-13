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

export const ABILITIES = [
  // --- vía 1 (req 12): abridor de cada rama ---
  // Guerrero — Embate: molinete que golpea a todos los enemigos cerca por 1.6× el arma.
  { id: 'embate', branch: 'guerrero', attr: 'str', req: 12, mp: 12, cd: 4.5, icon: '🌀',
    kind: 'melee_aoe', radius: 2.6, dmgMul: 1.6 },
  // Cazador — Saeta certera: disparo que siempre es crítico y pega 2.2× el arma.
  { id: 'saeta', branch: 'cazador', attr: 'dex', req: 12, mp: 10, cd: 3, icon: '🎯',
    kind: 'bolt', dmgMul: 2.2 },
  // Mago — Bola de fuego: proyectil que estalla; daño base + INT, en área.
  { id: 'fuego', branch: 'mago', attr: 'int', req: 12, mp: 16, cd: 5.5, icon: '🔥',
    kind: 'fireball', radius: 2.2, base: 14, intMul: 1.1 },

  // --- vía 2 (req 16): firma de cada rama, con un estilo propio ---
  // Guerrero — Vigor: potencia temporal (+daño y +defensa) por unos segundos.
  { id: 'vigor', branch: 'guerrero', attr: 'str', req: 16, mp: 14, cd: 14, icon: '🛡️',
    kind: 'buff', dur: 8, buff: { dmgMul: 0.3, defense: 8 } },
  // Cazador — Lluvia de flechas: volea que cae en área sobre el objetivo (daño físico).
  { id: 'lluvia', branch: 'cazador', attr: 'dex', req: 16, mp: 16, cd: 7, icon: '☄️',
    kind: 'area_phys', radius: 2.4, dmgMul: 1.3 },
  // Mago — Restaurar: recupera vida escalada por INT (utilidad de la vía arcana).
  { id: 'restaurar', branch: 'mago', attr: 'int', req: 16, mp: 20, cd: 10, icon: '💚',
    kind: 'heal', base: 30, intMul: 1.4 },
]

export const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((a) => [a.id, a]))

// Habilidades desbloqueadas para los stats dados (atributo de la rama ≥ requisito).
export function unlockedAbilities(stats) {
  if (!stats) return []
  return ABILITIES.filter((a) => (stats[a.attr] || 0) >= a.req)
}
