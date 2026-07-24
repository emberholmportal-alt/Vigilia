// Curva de XP -> nivel de jugador. Vive en shared/ porque la usan el cliente (barra de XP,
// hoja de personaje) y el server (nivel autoritativo de cada miembro para el Poder del gremio).
// Es la única fuente de verdad de la curva: no la dupliques.

// XP acumulada necesaria para ALCANZAR un nivel de jugador (curva suave).
export function playerXpForLevel(level) {
  if (level <= 1) return 0
  return Math.round(60 * Math.pow(level - 1, 1.55))
}

// Nivel de jugador a partir de la XP total.
export function playerLevelFromXp(xp) {
  let lvl = 1
  while (playerXpForLevel(lvl + 1) <= (Number(xp) || 0)) lvl++
  return lvl
}
