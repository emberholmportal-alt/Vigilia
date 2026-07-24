// Quests narrativas: máquina de estados por banderas, como Flare (requires_status /
// requires_not_status / complete_status). Cada quest tiene etapas; el registro muestra la
// primera etapa cuyas banderas requeridas están puestas y las prohibidas no. Los NPCs, las
// zonas y los eventos setean banderas (client/store.js: setQuestFlag).
//
// La primera quest —"Los Tres Nombres"— adapta el lore del mod living_bones de Flare (los
// magos Scathelocke/Vesuvvio/Grisbon, sellados en hielo/fuego/viento) y lo ata a los tres
// Guardianes que ya están plantados en el pueblo. Los nombres se descubren al llegar a
// ciertas ruinas; con los tres, el Guardián de Fuego despierta y cierra la quest.

// Al entrar a estas zonas (con la quest correspondiente activa) se revela algo: un nombre olvidado
// o un fragmento de diario. Cada entrada declara su `quest`, la bandera que la habilita (`gate`),
// la que la cierra (`done`) y la que setea al revelar (`flag`). `name`/`name_en` es lo que se anuncia.
export const ZONE_REVEALS = {
  // "Los Tres Nombres": online se revela al matar al guardián elemental de la ruina; offline, al llegar.
  st_maria_1: { quest: 'guardianes', gate: 'q3_init', done: 'q3_finish', flag: 'q3_ice', name: 'Scathelocke' },
  perdition_mines: { quest: 'guardianes', gate: 'q3_init', done: 'q3_finish', flag: 'q3_fire', name: 'Vesuvvio' },
  stormrock_pass: { quest: 'guardianes', gate: 'q3_init', done: 'q3_finish', flag: 'q3_wind', name: 'Grisbon' },
  // "El Diario del Vigilante": los fragmentos se revelan al LLEGAR a la zona (online y offline).
  dilapidated_sewers: { quest: 'diario', gate: 'd_init', done: 'd_finish', flag: 'd_p1',
    name: 'Fragmento del diario de Aldwin: «Bajé por las cloacas. El agua sabe a hierro viejo. Algo me sigue, pero no tiene pasos.»',
    name_en: "A page of Aldwin's journal: “I went down through the sewers. The water tastes of old iron. Something follows me, but it has no footsteps.”" },
  family_crypt: { quest: 'diario', gate: 'd_init', done: 'd_finish', flag: 'd_p2',
    name: 'Fragmento del diario de Aldwin: «En la cripta enterramos lo que no debía despertar. Recé para que la piedra aguantara. No aguantó.»',
    name_en: "A page of Aldwin's journal: “In the crypt we buried what should never wake. I prayed the stone would hold. It did not.”" },
  fort_amir: { quest: 'diario', gate: 'd_init', done: 'd_finish', flag: 'd_p3',
    name: 'Fragmento del diario de Aldwin: «El Fuerte cayó al alba. Soy el último. Si alguien lee esto: los Tres no se sellaron. Se escondieron.»',
    name_en: "A page of Aldwin's journal: “The Fort fell at dawn. I am the last. If anyone reads this: the Three did not seal themselves. They hid.”" },
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
        text: 'Llevá los tres nombres a los Tres Guardianes, en la orilla del río de Triston.',
        text_en: 'Bring the three names to the Three Guardians, on the riverbank of Triston.' },
    ],
  },
  {
    id: 'diario',
    name: 'El Diario del Vigilante', name_en: "The Watcher's Journal",
    complete: 'd_finish',
    reward: { xp: 260, gold: 180, seals: 10 },
    stages: [
      { req: ['d_init'], not: ['d_p1'],
        text: 'Buscá el primer fragmento del diario, en las Cloacas en Ruinas.',
        text_en: 'Find the first journal fragment, in the Dilapidated Sewers.' },
      { req: ['d_init', 'd_p1'], not: ['d_p2'],
        text: 'Buscá el segundo fragmento, en la Cripta Familiar.',
        text_en: 'Find the second fragment, in the Family Crypt.' },
      { req: ['d_init', 'd_p1', 'd_p2'], not: ['d_p3'],
        text: 'Buscá el tercer fragmento, en el Fuerte Amir.',
        text_en: 'Find the third fragment, in Fort Amir.' },
      { req: ['d_init', 'd_p1', 'd_p2', 'd_p3'], not: ['d_finish'],
        text: 'Llevá los tres fragmentos al viejo Garrick, en Triston.',
        text_en: 'Bring the three fragments to Old Garrick, in Triston.' },
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
