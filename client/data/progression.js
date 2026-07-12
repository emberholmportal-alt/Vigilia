// Progresión: nivel de jugador (por XP total) y las 6 acciones (skills, cap 20).
// Sin combate todavía, la XP entra por las acciones que ya existen (Saqueo al abrir
// cofres). Cuando lleguen combate/gathering, cada acción suma a su propia skill.

// Las 6 acciones definidas en docs/ESCENARIOS.md.
export const SKILLS = ['combate', 'excavacion', 'herboristeria', 'alquimia', 'forja', 'saqueo']
export const SKILL_LABEL = {
  combate: 'Combate', excavacion: 'Excavación', herboristeria: 'Herboristería',
  alquimia: 'Alquimia', forja: 'Forja', saqueo: 'Saqueo',
}
export const SKILL_DESC = {
  combate: 'Matar enemigos afuera de la ciudad.',
  excavacion: 'Picar vetas de mastite en cuevas y minas.',
  herboristeria: 'Juntar hierbas y reactivos en el campo.',
  alquimia: 'Preparar pociones con reactivos.',
  forja: 'Forjar y mejorar equipo con mastite.',
  saqueo: 'Abrir cofres y desenterrar reliquias.',
}
export const SKILL_CAP = 20

// XP acumulada necesaria para ALCANZAR un nivel de jugador (curva suave).
export function playerXpForLevel(level) {
  if (level <= 1) return 0
  return Math.round(60 * Math.pow(level - 1, 1.55))
}

// Nivel de jugador a partir de la XP total.
export function playerLevelFromXp(xp) {
  let lvl = 1
  while (playerXpForLevel(lvl + 1) <= xp) lvl++
  return lvl
}

// Progreso dentro del nivel actual: { level, into, need, pct }.
export function playerProgress(xp) {
  const level = playerLevelFromXp(xp)
  const base = playerXpForLevel(level)
  const next = playerXpForLevel(level + 1)
  const into = xp - base, need = next - base
  return { level, into, need, pct: need > 0 ? into / need : 1 }
}

// XP de skill para un nivel (más plana que la de jugador; cap 20).
export function skillXpForLevel(level) {
  if (level <= 1) return 0
  return Math.round(40 * Math.pow(level - 1, 1.35))
}

export function skillLevelFromXp(xp) {
  let lvl = 1
  while (lvl < SKILL_CAP && skillXpForLevel(lvl + 1) <= xp) lvl++
  return lvl
}

export function emptySkills() {
  const s = {}
  for (const k of SKILLS) s[k] = { xp: 0, level: 1 }
  return s
}
