// Pobladores por mapa. Sprites reales de Flare, diálogo con personalidad (nada de
// "Hola, aventurero") y rumores que apuntan al mundo. Varios patrullan entre puntos.
// Cada línea es corta (un globo). Direcciones: 0=SW 1=W 2=NW 3=N 4=NE 5=E 6=SE 7=S

const FARM = [
  // --- monumento central: Obelisco de Retorno + los Tres Guardianes (WORLD.md) ---
  {
    sprite: 'return_obelisk1', name: 'Obelisco de Retorno', landmark: true,
    x: 58, y: 50, dir: 7,
    lines: ['La piedra está tibia. Los que caen afuera, vuelven acá.'],
  },
  {
    sprite: 'statue_guardian_fire', name: 'Guardián de Fuego', landmark: true,
    x: 56, y: 51, dir: 0,
    lines: ['Ofrendá oro a la llama y arderás más fuerte hoy.'],
  },
  {
    sprite: 'statue_guardian_ice', name: 'Guardián de Hielo', landmark: true,
    x: 60, y: 51, dir: 0,
    lines: ['El hielo no odia. Solo espera.'],
  },
  {
    sprite: 'statue_guardian_wind', name: 'Guardián del Viento', landmark: true,
    x: 58, y: 48, dir: 0,
    lines: ['El viento lleva los nombres de los que no volvieron.'],
  },

  // --- pobladores ---
  {
    sprite: 'knight', name: 'Guardia Bram', x: 63, y: 53, dir: 1,
    patrol: [[63, 53], [63, 49], [59, 49], [63, 53]],
    lines: [
      'Ojos duros, vigilante. Afuera no perdona.',
      'Anoche hubo tambores del lado de las minas.',
      'No eran duendes. Los duendes no marcan el paso.',
    ],
  },
  {
    sprite: 'guild_man', name: 'Halvard', x: 51, y: 53, dir: 5,
    lines: [
      'Los gremios reclutan de nuevo.',
      'Quinientos de oro y una sigla de tres letras.',
      'Un buen estandarte vale más que cien espadas.',
    ],
  },
  {
    sprite: 'wandering_trader', name: 'Mercader Oswin', x: 53, y: 56, dir: 0,
    lines: [
      'Traje acero del sur y algo de cuero.',
      'El precio sube con la luna, no conmigo.',
      'Vendé lo que no uses. El hierro oxidado no abriga.',
    ],
  },
  {
    sprite: 'peddler_goblin', name: 'Nix', x: 61, y: 57, dir: 4,
    patrol: [[61, 57], [65, 57], [65, 53], [61, 57]],
    lines: [
      '¡Psst! Reliquias raras, precios de robo.',
      'Para vos, robo doble.',
      'No preguntes de dónde salió. Preguntá cuánto vale.',
    ],
  },
  {
    sprite: 'peasant_man1', name: 'Tomas', x: 50, y: 50, dir: 6,
    patrol: [[50, 50], [50, 56], [55, 56], [50, 50]],
    lines: [
      'En Lochport las lápidas cambian de lugar.',
      'Mi hermano salió a cazar duendes.',
      'Volvió su bota. Nada más.',
    ],
  },
  {
    sprite: 'peasant_woman1', name: 'Wren', x: 62, y: 60, dir: 3,
    patrol: [[62, 60], [58, 60], [58, 56], [62, 60]],
    lines: [
      'Cerrá la puerta al anochecer.',
      'Lo que camina de noche no golpea antes de entrar.',
      'La fragua no se apaga nunca. Menos mal.',
    ],
  },
  {
    sprite: 'peasant_man2', name: 'el viejo Garrick', x: 56, y: 60, dir: 2,
    lines: [
      'Empyrea cayó en una sola noche.',
      'Black Oak aguanta por pura terquedad.',
      'Vi el Laberinto de Hierro de joven. No entres.',
    ],
  },
]

export const NPCS_BY_MAP = { black_oak_farm: FARM }
