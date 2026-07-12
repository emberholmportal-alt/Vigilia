// Pobladores por mapa. Sprites reales de Flare, diálogo con personalidad y rumores.
// `portrait` = retrato pintado de Flare que se muestra al hablar (public/assets/portraits).
// Varios patrullan. Direcciones: 0=SW 1=W 2=NW 3=N 4=NE 5=E 6=SE 7=S

const LOCHPORT = [
  // --- monumento: Obelisco de Retorno + los Tres Guardianes (WORLD.md) ---
  {
    sprite: 'return_obelisk1', name: 'Obelisco de Retorno', landmark: true, x: 37, y: 24, dir: 7,
    lines: ['La piedra está tibia. Los que caen afuera, vuelven acá.'],
  },
  {
    sprite: 'statue_guardian_fire', name: 'Guardián de Fuego', landmark: true, x: 35, y: 25, dir: 0,
    lines: ['Ofrendá oro a la llama y arderás más fuerte hoy.'],
  },
  {
    sprite: 'statue_guardian_ice', name: 'Guardián de Hielo', landmark: true, x: 39, y: 25, dir: 0,
    lines: ['El hielo no odia. Solo espera.'],
  },
  {
    sprite: 'statue_guardian_wind', name: 'Guardián del Viento', landmark: true, x: 37, y: 22, dir: 0,
    lines: ['El viento lleva los nombres de los que no volvieron.'],
  },

  // --- portales (destino por definir): flanquean la plaza al oeste y al este ---
  {
    sprite: 'return_obelisk2', name: 'Portal del Oeste', landmark: true, portal: true,
    glow: 0xb060ff, x: 20, y: 22, dir: 7,
    lines: ['El arco del oeste zumba, pero su destino todavía duerme.',
            'Cuando el sello ceda, llevará a tierras que aún no tienen nombre.'],
  },
  {
    sprite: 'return_obelisk2', name: 'Portal del Este', landmark: true, portal: true,
    glow: 0x50d0ff, x: 45, y: 30, dir: 7,
    lines: ['El arco del este está frío al tacto.',
            'Algo espera del otro lado. Todavía no es la hora.'],
  },

  // --- pobladores (con retrato y algunos patrullando) ---
  {
    sprite: 'knight', name: 'Guardia Bram', portrait: 'male07.png', x: 40, y: 28, dir: 1,
    lines: ['Ojos duros, vigilante. Afuera no perdona.',
            'Anoche hubo tambores del lado de las minas.',
            'No eran duendes. Los duendes no marcan el paso.'],
  },
  {
    sprite: 'guild_man', name: 'Halvard', portrait: 'male12.png', x: 33, y: 27, dir: 5,
    lines: ['Los gremios reclutan de nuevo.',
            'Quinientos de oro y una sigla de tres letras.',
            'Un buen estandarte vale más que cien espadas.'],
  },
  {
    sprite: 'wandering_trader', name: 'Mercader Oswin', portrait: 'male10.png', x: 34, y: 30, dir: 0,
    shop: true,
    lines: ['Traje acero del sur y algo de cuero.',
            'El precio sube con la luna, no conmigo.',
            'Vendé lo que no uses. El hierro oxidado no abriga.'],
  },
  {
    sprite: 'peddler_goblin', name: 'Nix', portrait: 'goblin.png', x: 41, y: 30, dir: 4,
    lines: ['¡Psst! Reliquias raras, precios de robo.',
            'Para vos, robo doble.',
            'No preguntes de dónde salió. Preguntá cuánto vale.'],
  },
  {
    sprite: 'peasant_man1', name: 'Tomas', portrait: 'male03.png', x: 32, y: 24, dir: 6,
    lines: ['En Lochport las lápidas cambian de lugar.',
            'Mi hermano salió a cazar duendes.',
            'Volvió su bota. Nada más.'],
  },
  {
    sprite: 'peasant_woman1', name: 'Wren', portrait: 'female02.png', x: 39, y: 31, dir: 3,
    lines: ['Cerrá la puerta al anochecer.',
            'Lo que camina de noche no golpea antes de entrar.',
            'La fragua no se apaga nunca. Menos mal.'],
  },
  {
    sprite: 'peasant_man2', name: 'el viejo Garrick', portrait: 'male18.png', x: 35, y: 32, dir: 2,
    lines: ['Empyrea cayó en una sola noche.',
            'Black Oak aguanta por pura terquedad.',
            'Vi el Laberinto de Hierro de joven. No entres.'],
  },
]

// La granja (mapa abierto con edificios estampados) queda como alternativa (?map=).
const FARM = [
  { sprite: 'return_obelisk1', name: 'Obelisco de Retorno', landmark: true, x: 58, y: 50, dir: 7,
    lines: ['La piedra está tibia. Los que caen afuera, vuelven acá.'] },
  { sprite: 'statue_guardian_fire', name: 'Guardián de Fuego', landmark: true, x: 56, y: 51, dir: 0,
    lines: ['Ofrendá oro a la llama y arderás más fuerte hoy.'] },
  { sprite: 'statue_guardian_ice', name: 'Guardián de Hielo', landmark: true, x: 60, y: 51, dir: 0,
    lines: ['El hielo no odia. Solo espera.'] },
  { sprite: 'statue_guardian_wind', name: 'Guardián del Viento', landmark: true, x: 58, y: 48, dir: 0,
    lines: ['El viento lleva los nombres de los que no volvieron.'] },
  { sprite: 'knight', name: 'Guardia Bram', portrait: 'male07.png', x: 63, y: 53, dir: 1,
    lines: ['Ojos duros, vigilante. Afuera no perdona.'] },
  { sprite: 'peddler_goblin', name: 'Nix', portrait: 'goblin.png', x: 61, y: 57, dir: 4,
    lines: ['¡Psst! Reliquias raras, precios de robo.'] },
]

export const NPCS_BY_MAP = { lochport: LOCHPORT, black_oak_farm: FARM }
