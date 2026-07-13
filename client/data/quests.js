// Quests narrativas: máquina de estados por banderas, como Flare (requires_status /
// requires_not_status / complete_status). Cada quest tiene etapas; el registro muestra la
// primera etapa cuyas banderas requeridas están puestas y las prohibidas no. Los NPCs, las
// zonas y los eventos setean banderas (client/store.js: setQuestFlag).
//
// La primera quest —"Los Tres Nombres"— adapta el lore del mod living_bones de Flare (los
// magos Scathelocke/Vesuvvio/Grisbon, sellados en hielo/fuego/viento) y lo ata a los tres
// Guardianes que ya están plantados en el pueblo. Los nombres se descubren al llegar a
// ciertas ruinas; con los tres, el Guardián de Fuego despierta y cierra la quest.

// Al descubrir/entrar a estas zonas (con la quest activa) se revela un nombre olvidado.
export const ZONE_REVEALS = {
  st_maria_1: { flag: 'q3_ice', name: 'Scathelocke' },
  perdition_mines: { flag: 'q3_fire', name: 'Vesuvvio' },
  stormrock_pass: { flag: 'q3_wind', name: 'Grisbon' },
}

export const QUESTS = [
  {
    id: 'guardianes',
    name: 'Los Tres Nombres', name_en: 'The Three Names',
    complete: 'q3_finish',
    reward: { xp: 220, gold: 150, seals: 8 },
    // Etapas: la primera cuyo `req` esté todo puesto y `not` nada puesto es la activa.
    stages: [
      { req: ['q3_init'], not: ['q3_ice'],
        text: 'Encontrá el nombre sellado en hielo, en las ruinas de Sta. María.',
        text_en: 'Find the name sealed in ice, in the ruins of St. Maria.' },
      { req: ['q3_init', 'q3_ice'], not: ['q3_fire'],
        text: 'Encontrá el nombre sellado en fuego, en las Minas de Perdición.',
        text_en: 'Find the name sealed in fire, in the Perdition Mines.' },
      { req: ['q3_init', 'q3_ice', 'q3_fire'], not: ['q3_wind'],
        text: 'Encontrá el nombre sellado en viento, en el Paso Roca-Tormenta.',
        text_en: 'Find the name sealed in wind, at Stormrock Pass.' },
      { req: ['q3_init', 'q3_ice', 'q3_fire', 'q3_wind'], not: ['q3_finish'],
        text: 'Volvé al pueblo y despertá al Guardián de Fuego con los tres nombres.',
        text_en: 'Return to town and awaken the Guardian of Fire with the three names.' },
    ],
  },
]

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]))

const allSet = (flags, list) => (list || []).every((f) => flags[f])
const noneSet = (flags, list) => !(list || []).some((f) => flags[f])

// ¿La quest está completa?
export const questComplete = (flags, q) => !!flags[q.complete]

// ¿La quest está iniciada (alguna bandera propia puesta) pero sin completar?
export function questActive(flags, q) {
  if (flags[q.complete]) return false
  return q.stages.some((st) => (st.req || []).some((f) => flags[f]))
}

// Etapa activa (la primera que cumple req/not). null si no hay ninguna visible.
export function activeStage(flags, q) {
  for (const st of q.stages) {
    if (allSet(flags, st.req) && noneSet(flags, st.not)) return st
  }
  return null
}

// ¿Se puede despertar a los Guardianes? (los tres nombres, quest sin cerrar)
export function canAwakenGuardians(flags) {
  return !!(flags.q3_init && flags.q3_ice && flags.q3_fire && flags.q3_wind && !flags.q3_finish)
}
