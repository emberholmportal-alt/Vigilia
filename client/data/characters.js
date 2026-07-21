// Razas y kit inicial. Los modificadores salen de docs/WORLD.md. El equipamiento
// inicial es distinto por raza (WORLD.md: "Diferenciá con equipamiento inicial
// distinto") y usa ítems REALES de Flare, elegidos por su capa de paperdoll (gfx).
import { startingKit } from '../../shared/starterkit.js'

export const RACES = [
  {
    id: 'humano', name: 'Humano', name_en: 'Human', archetype: 'Vigilante', archetype_en: 'Watcher',
    fantasy: 'Aprende rápido, muere igual.', fantasy_en: 'Learns fast, dies all the same.',
    mods: { xp: 0.1 }, modText: '+10% XP', modText_en: '+10% XP',
    kit: { chest: 'leather_chest', main: 'longsword', off: 'buckler' },
    tint: 0xffffff, head: 'head_short',
  },
  {
    id: 'elfo', name: 'Elfo', name_en: 'Elf', archetype: 'Hechicero', archetype_en: 'Sorcerer',
    fantasy: 'Sangre arcana, huesos finos.', fantasy_en: 'Arcane blood, fine bones.',
    mods: { mana: 30, int: 3, hp: -10 }, modText: '+30 maná · +3 INT · −10 vida', modText_en: '+30 mana · +3 INT · −10 health',
    kit: { chest: 'mage_vest', main: 'wand' },
    tint: 0xdfe6dc, head: 'head_short',   // piel pálida/fría
  },
  {
    id: 'enano', name: 'Enano', name_en: 'Dwarf', archetype: 'Guardián', archetype_en: 'Guardian',
    fantasy: 'Piel de piedra, paso corto.', fantasy_en: 'Stone skin, short stride.',
    mods: { hp: 40, vit: 3, speed: -0.1 }, modText: '+40 vida · +3 VIT · −10% velocidad', modText_en: '+40 health · +3 VIT · −10% speed',
    kit: { chest: 'chain_cuirass', main: 'smith_hammer', off: 'shield' },
    tint: 0xcf9366, head: 'head_bald',    // piel curtida/rojiza, calvo
  },
  {
    id: 'orco', name: 'Orco', name_en: 'Orc', archetype: 'Bruto', archetype_en: 'Brute',
    fantasy: 'Furia. No mucho más.', fantasy_en: 'Fury. Not much else.',
    mods: { dmg: 0.25, str: 4, mana: -0.15 }, modText: '+25% daño · +4 FUE · −15% maná', modText_en: '+25% damage · +4 STR · −15% mana',
    kit: { chest: 'leather_chest', main: 'infantry_axe' },
    tint: 0x86ad63, head: 'head_bald',    // piel verde, calvo
  },
]

export const raceById = (id) => RACES.find((r) => r.id === id)

// Aspecto por raza para el paperdoll. Flare no trae cuerpos orco/elfo/enano (el avatar es humano),
// así que diferenciamos con un TINTE de piel + la forma de cabeza (corta/calvo). Es lo mejor con
// los assets de Flare; si más adelante hay cuerpos por raza, se reemplaza acá.
export function raceAppearance(id) {
  const r = raceById(id)
  return { tint: (r && r.tint) || 0xffffff, head: (r && r.head) || 'head_short' }
}

// Arma el personaje inicial para una raza: equipo puesto + pocas cosas más + oro. El kit es CANÓNICO
// y vive en shared/ (el server lo asigna autoritativo al crear: un blob manipulado no da oro/equipo
// falso). Acá sólo le sumamos el objeto `race` para la UI.
export function startingCharacter(raceId, body = 'male', head = null) {
  const race = raceById(raceId) || RACES[0]
  return {
    race,
    body: (body === 'female' || body === 'female_dark') ? body : 'male',
    head: normalizeHead(head, race.id),
    ...startingKit(race.id),
  }
}

// Peinados disponibles POR CUERPO (sólo lo que trae Flare). El cuerpo masculino tiene con-pelo
// (head_short) o pelado (head_bald); los cuerpos femeninos sólo pelo largo (head_long). Se ofrece
// como elección en la creación; por defecto toma la cabeza de la raza (enano/orco pelados).
export const HAIR_OPTIONS = {
  male: [
    { id: 'head_short', label: 'Con pelo', label_en: 'Hair' },
    { id: 'head_bald', label: 'Pelado', label_en: 'Bald' },
  ],
  female: [{ id: 'head_long', label: 'Pelo largo', label_en: 'Long hair' }],
  female_dark: [{ id: 'head_long', label: 'Pelo largo', label_en: 'Long hair' }],
}

// Normaliza el peinado a uno válido para el cuerpo; si no viene, usa el default de la raza.
export function normalizeHead(head, raceId, body = 'male') {
  const opts = HAIR_OPTIONS[body] || HAIR_OPTIONS.male
  if (head && opts.some((o) => o.id === head)) return head
  const race = raceById(raceId)
  const def = (race && race.head) || 'head_short'
  return opts.some((o) => o.id === def) ? def : opts[0].id
}
