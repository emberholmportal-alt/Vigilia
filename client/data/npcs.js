// Pobladores de la plaza de Black Oak City. Sprites reales de Flare, diálogo con
// personalidad (nada de "Hola, aventurero") y algún rumor que apunta al mundo.
// Cada línea es corta (una sola línea de globo). Direcciones: 0=SW 1=W 2=NW 3=N 4=NE 5=E 6=SE 7=S

export const NPCS = [
  {
    sprite: 'return_obelisk1', name: 'Obelisco de Retorno', landmark: true,
    x: 38, y: 10, dir: 7,
    lines: ['La piedra está tibia. Los que caen afuera, vuelven acá.'],
  },
  {
    sprite: 'knight', name: 'Guardia Bram', x: 44, y: 15, dir: 1,
    lines: [
      'Ojos duros, vigilante. Afuera no perdona.',
      'Anoche hubo tambores del lado de las minas.',
      'No eran duendes. Los duendes no marcan el paso.',
    ],
  },
  {
    sprite: 'guild_man', name: 'Halvard', x: 37, y: 15, dir: 5,
    lines: [
      'Los gremios reclutan de nuevo.',
      'Quinientos de oro y una sigla de tres letras.',
      'Un buen estandarte vale más que cien espadas.',
    ],
  },
  {
    sprite: 'wandering_trader', name: 'Mercader Oswin', x: 45, y: 13, dir: 0,
    lines: [
      'Traje acero del sur y algo de cuero.',
      'El precio sube con la luna, no conmigo.',
      'Vendé lo que no uses. El hierro oxidado no abriga.',
    ],
  },
  {
    sprite: 'peddler_goblin', name: 'Nix', x: 36, y: 18, dir: 4,
    lines: [
      '¡Psst! Reliquias raras, precios de robo.',
      'Para vos, robo doble.',
      'No preguntes de dónde salió. Preguntá cuánto vale.',
    ],
  },
  {
    sprite: 'peasant_man1', name: 'Tomas', x: 43, y: 11, dir: 6,
    lines: [
      'En Lochport las lápidas cambian de lugar.',
      'Mi hermano salió a cazar duendes.',
      'Volvió su bota. Nada más.',
    ],
  },
  {
    sprite: 'peasant_woman1', name: 'Wren', x: 39, y: 18, dir: 3,
    lines: [
      'Cerrá la puerta al anochecer.',
      'Lo que camina de noche no golpea antes de entrar.',
      'La fragua no se apaga nunca. Menos mal.',
    ],
  },
  {
    sprite: 'peasant_man2', name: 'el viejo Garrick', x: 46, y: 17, dir: 2,
    lines: [
      'Empyrea cayó en una sola noche.',
      'Black Oak aguanta por pura terquedad.',
      'Vi el Laberinto de Hierro de joven. No entres.',
    ],
  },
]
