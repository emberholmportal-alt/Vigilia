// Pobladores por mapa. Sprites reales de Flare, diálogo con personalidad y rumores.
// `portrait` = retrato pintado de Flare que se muestra al hablar (public/assets/portraits).
// Varios patrullan. Direcciones: 0=SW 1=W 2=NW 3=N 4=NE 5=E 6=SE 7=S

const LOCHPORT = [
  // --- monumento: Obelisco de Retorno + los Tres Guardianes (WORLD.md) ---
  {
    sprite: 'return_obelisk1', name: 'Obelisco de Retorno', name_en: 'Obelisk of Return', landmark: true, x: 37, y: 24, dir: 7,
    lines: ['La piedra está tibia. Los que caen afuera, vuelven acá.'],
  },
  {
    sprite: 'statue_guardian_fire', name: 'Guardián de Fuego', name_en: 'Guardian of Fire', landmark: true, x: 35, y: 25, dir: 0,
    lines: ['Ofrendá oro a la llama y arderás más fuerte hoy.'],
  },
  {
    sprite: 'statue_guardian_ice', name: 'Guardián de Hielo', name_en: 'Guardian of Ice', landmark: true, x: 39, y: 25, dir: 0,
    lines: ['El hielo no odia. Solo espera.'],
  },
  {
    sprite: 'statue_guardian_wind', name: 'Guardián del Viento', name_en: 'Guardian of Wind', landmark: true, x: 37, y: 22, dir: 0,
    lines: ['El viento lleva los nombres de los que no volvieron.'],
  },

  // --- portales (destino por definir): flanquean la plaza al oeste y al este ---
  {
    sprite: 'return_obelisk2', name: 'Portal del Oeste', name_en: 'West Portal', landmark: true, portal: true,
    glow: 0xb060ff, x: 20, y: 22, dir: 7,
    lines: ['El arco del oeste zumba, pero su destino todavía duerme.',
            'Cuando el sello ceda, llevará a tierras que aún no tienen nombre.'],
  },
  {
    sprite: 'return_obelisk2', name: 'Portal del Este', name_en: 'East Portal', landmark: true, portal: true,
    glow: 0x50d0ff, x: 45, y: 30, dir: 7,
    lines: ['El arco del este está frío al tacto.',
            'Algo espera del otro lado. Todavía no es la hora.'],
  },

  // --- pobladores (con retrato y algunos patrullando) ---
  {
    sprite: 'knight', name: 'Guardia Bram', name_en: 'Guard Bram', portrait: 'male07.png', x: 40, y: 28, dir: 1,
    lines: ['Ojos duros, vigilante. Afuera no perdona.',
            'Anoche hubo tambores del lado de las minas.',
            'No eran duendes. Los duendes no marcan el paso.'],
  },
  {
    sprite: 'guild_man', name: 'Halvard', name_en: 'Halvard', portrait: 'male01.png', x: 33, y: 27, dir: 5,
    lines: ['Los gremios reclutan de nuevo.',
            'Quinientos de oro y una sigla de tres letras.',
            'Un buen estandarte vale más que cien espadas.'],
  },
  {
    sprite: 'wandering_trader', name: 'Mercader Oswin', name_en: 'Oswin the Merchant', portrait: 'male10.png', x: 34, y: 30, dir: 0,
    shop: true,
    lines: ['Traje acero del sur y algo de cuero.',
            'El precio sube con la luna, no conmigo.',
            'Vendé lo que no uses. El hierro oxidado no abriga.'],
  },
  {
    sprite: 'peddler_goblin', name: 'Nix', name_en: 'Nix', portrait: 'goblin.png', x: 41, y: 30, dir: 4,
    lines: ['¡Psst! Reliquias raras, precios de robo.',
            'Para vos, robo doble.',
            'No preguntes de dónde salió. Preguntá cuánto vale.'],
  },
  {
    sprite: 'peasant_man1', name: 'Tomas', name_en: 'Tomas', portrait: 'male03.png', x: 32, y: 24, dir: 6,
    lines: ['En Lochport las lápidas cambian de lugar.',
            'Mi hermano salió a cazar duendes.',
            'Volvió su bota. Nada más.'],
  },
  {
    sprite: 'peasant_woman1', name: 'Wren', name_en: 'Wren', portrait: 'female02.png', x: 39, y: 31, dir: 3,
    lines: ['Cerrá la puerta al anochecer.',
            'Lo que camina de noche no golpea antes de entrar.',
            'La fragua no se apaga nunca. Menos mal.'],
  },
  {
    sprite: 'peasant_man2', name: 'el viejo Garrick', name_en: 'Old Garrick', portrait: 'male18.png', x: 35, y: 32, dir: 2,
    lines: ['Empyrea cayó en una sola noche.',
            'Black Oak aguanta por pura terquedad.',
            'Vi el Laberinto de Hierro de joven. No entres.'],
  },
]

// La granja (mapa abierto con edificios estampados) queda como alternativa (?map=).
const FARM = [
  { sprite: 'return_obelisk1', name: 'Obelisco de Retorno', name_en: 'Obelisk of Return', landmark: true, x: 58, y: 50, dir: 7,
    lines: ['La piedra está tibia. Los que caen afuera, vuelven acá.'] },
  { sprite: 'statue_guardian_fire', name: 'Guardián de Fuego', name_en: 'Guardian of Fire', landmark: true, x: 56, y: 51, dir: 0,
    lines: ['Ofrendá oro a la llama y arderás más fuerte hoy.'] },
  { sprite: 'statue_guardian_ice', name: 'Guardián de Hielo', name_en: 'Guardian of Ice', landmark: true, x: 60, y: 51, dir: 0,
    lines: ['El hielo no odia. Solo espera.'] },
  { sprite: 'statue_guardian_wind', name: 'Guardián del Viento', name_en: 'Guardian of Wind', landmark: true, x: 58, y: 48, dir: 0,
    lines: ['El viento lleva los nombres de los que no volvieron.'] },
  { sprite: 'knight', name: 'Guardia Bram', name_en: 'Guard Bram', portrait: 'male07.png', x: 63, y: 53, dir: 1,
    lines: ['Ojos duros, vigilante. Afuera no perdona.'] },
  { sprite: 'peddler_goblin', name: 'Nix', name_en: 'Nix', portrait: 'goblin.png', x: 61, y: 57, dir: 4,
    lines: ['¡Psst! Reliquias raras, precios de robo.'] },
]

// Greenwood Point (pueblo del mod noname): hub con edificios reales. Cada NPC de servicio
// se ubica FRENTE a un edificio; los landmarks (obelisco/guardianes) en la plaza (51,51).
const GREENWOOD = [
  // monumento en la plaza
  { sprite: 'return_obelisk1', name: 'Obelisco de Retorno', name_en: 'Obelisk of Return', landmark: true, x: 51, y: 49, dir: 7,
    lines: ['La piedra está tibia. Los que caen afuera, vuelven acá.'] },
  { sprite: 'statue_guardian_fire', name: 'Guardián de Fuego', name_en: 'Guardian of Fire', landmark: true, x: 49, y: 50, dir: 0,
    lines: ['Ofrendá oro a la llama y arderás más fuerte hoy.'] },
  { sprite: 'statue_guardian_ice', name: 'Guardián de Hielo', name_en: 'Guardian of Ice', landmark: true, x: 53, y: 50, dir: 0,
    lines: ['El hielo no odia. Solo espera.'] },
  { sprite: 'statue_guardian_wind', name: 'Guardián del Viento', name_en: 'Guardian of Wind', landmark: true, x: 51, y: 47, dir: 0,
    lines: ['El viento lleva los nombres de los que no volvieron.'] },

  // portales (flanquean el pueblo)
  { sprite: 'return_obelisk2', name: 'Portal del Oeste', name_en: 'West Portal', landmark: true, portal: true, glow: 0xb060ff,
    x: 28, y: 47, dir: 7,
    lines: ['El arco del oeste zumba, pero su destino todavía duerme.',
            'Cuando el sello ceda, llevará a tierras que aún no tienen nombre.'] },
  { sprite: 'return_obelisk2', name: 'Portal del Este', name_en: 'East Portal', landmark: true, portal: true, glow: 0x50d0ff,
    x: 74, y: 52, dir: 7,
    lines: ['El arco del este está frío al tacto.',
            'Algo espera del otro lado. Todavía no es la hora.'] },

  // NPCs de servicio, FRENTE a sus edificios
  { sprite: 'wandering_trader', name: 'Mercader Oswin', name_en: 'Oswin the Merchant', portrait: 'male10.png', x: 55, y: 53, dir: 3, shop: true,
    lines: ['Traje acero del sur y algo de cuero.',
            'El precio sube con la luna, no conmigo.',
            'Vendé lo que no uses. El hierro oxidado no abriga.'] },
  { sprite: 'guild_man', name: 'Halvard', name_en: 'Halvard', portrait: 'male01.png', x: 59, y: 50, dir: 1,
    lines: ['Los gremios reclutan de nuevo.',
            'Quinientos de oro y una sigla de tres letras.',
            'Un buen estandarte vale más que cien espadas.'] },
  { sprite: 'knight', name: 'Guardia Bram', name_en: 'Guard Bram', portrait: 'male07.png', x: 40, y: 52, dir: 5,
    lines: ['Ojos duros, vigilante. Afuera no perdona.',
            'Anoche hubo tambores del lado de las minas.',
            'No eran duendes. Los duendes no marcan el paso.'] },
  { sprite: 'peasant_man1', name: 'Tomas', name_en: 'Tomas', portrait: 'male03.png', x: 52, y: 60, dir: 3,
    lines: ['En Greenwood las lápidas cambian de lugar.',
            'Mi hermano salió a cazar duendes.',
            'Volvió su bota. Nada más.'] },
  { sprite: 'peasant_woman1', name: 'Wren', name_en: 'Wren', portrait: 'female02.png', x: 45, y: 57, dir: 5,
    lines: ['Cerrá la puerta al anochecer.',
            'Lo que camina de noche no golpea antes de entrar.'] },
  { sprite: 'peddler_goblin', name: 'Nix', name_en: 'Nix', portrait: 'goblin.png', x: 59, y: 58, dir: 2,
    lines: ['¡Psst! Reliquias raras, precios de robo.',
            'Para vos, robo doble.'] },
]

// Triston (ciudad del mod HERESY): edificios isométricos de OpenGameArt (taberna,
// casas de entramado, graneros, fragua). Es el hub principal + punto de respawn.
// Plaza de la fuente (61,55): por ahora sólo el mercader + 2 NPCs (sin totems).
const TRISTON = [
  // Nix el Buhonero: el ÚNICO mercader del pueblo (compra/venta). Arma su puesto frente al carro
  // y los barriles (el mercado). De frente (dir 7 = S) para que se le vea la cara y la mercadería.
  { sprite: 'peddler_goblin', name: 'Nix el Buhonero', name_en: 'Nix the Peddler', portrait: 'goblin.png', x: 61, y: 51, dir: 6, shop: true,
    lines: ['¡Psst! Reliquias raras, precios de robo.',
            'Para vos, robo doble.',
            'No preguntes de dónde salió. Preguntá cuánto vale.'],
    lines_en: ['Psst! Rare relics, thieving prices.',
               'For you, double the thieving.',
               "Don't ask where it came from. Ask what it's worth."] },
  { sprite: 'knight', name: 'Guardia Bram', name_en: 'Guard Bram', portrait: 'male07.png', x: 64, y: 57, dir: 1,
    lines: ['Ojos duros, vigilante. Afuera no perdona.',
            'Anoche hubo tambores del lado de las minas.'],
    lines_en: ['Hard eyes, watcher. The wilds do not forgive.',
               'There were drums by the mines last night.'] },
  { sprite: 'guild_man', name: 'Halvard', name_en: 'Halvard', portrait: 'male01.png', x: 56, y: 58, dir: 5,
    lines: ['Los gremios reclutan de nuevo.',
            'Quinientos de oro y una sigla de tres letras.'],
    lines_en: ['The guilds are recruiting again.',
               'Five hundred gold and a three-letter tag.'] },
  // Herrero: repara el equipo por oro (zona de la fragua/yunque). Sprite HERESY con idle animado.
  { sprite: 'peasant_man2', name: 'Herrero Dorn', name_en: 'Dorn the Smith', portrait: 'male16.png', x: 70, y: 52, dir: 5, smith: true,
    lines: ['El acero se cansa como los hombres.',
            'Tráemelo antes de que se quiebre del todo.'],
    lines_en: ['Steel tires just like men do.',
               'Bring it to me before it breaks for good.'] },
  // Obelisco de Retorno: en el camposanto (junto a la cripta de la iglesia). Si usaste una
  // Piedra de Retorno en el mundo, este obelisco te devuelve al punto anclado (mecánica de
  // portal de Diablo). Sin partículas mágicas (noParticles): queda como piedra sobria.
  { sprite: 'return_obelisk1', name: 'Obelisco de Retorno', name_en: 'Obelisk of Return', landmark: true, obelisk: true, noParticles: true, x: 47, y: 70, dir: 7 },
  // Yara la Bruja: la alquimista es la bruja de la casa del rincón (NE del mapa). ES la ÚNICA que
  // vende pociones de vida/maná y el Pergamino de Retorno (shopKind 'alchemist'). Sprite de la
  // bruja de HERESY, en su lugar (87,18).
  { sprite: 'witch_adriana', name: 'Yara la Bruja', name_en: 'Yara the Witch', portrait: 'female04.png', x: 87, y: 18, dir: 0, alchemy: true,
    lines: ['Pociones de vida y de maná, y pergaminos para volver. Nada más… nada menos.',
            'La botella vacía y el aloe los junta cualquiera. El jugo lo saco yo.'],
    lines_en: ['Health and mana potions, and scrolls to return. Nothing more… nothing less.',
               'Anyone can gather an empty bottle and aloe. Wringing the juice — that I do.'] },
  // Udana la Vidente: da y CIERRA la quest de los Tres Nombres. Con los tres nombres, ella misma
  // los pronuncia y los sellos ceden (antes lo hacía el Guardián de Fuego, ya quitado). Diálogo
  // condicional por banderas; el nodo con los tres nombres setea q3_finish (recompensa incluida).
  { sprite: 'peasant_woman1', name: 'Udana la Vidente', name_en: 'Udana the Seer', portrait: 'female01.png', x: 58, y: 50, dir: 7,
    dialog: [
      { req: ['q3_finish'],
        lines: ['Los sellos cedieron. El pueblo respira distinto desde entonces.'],
        lines_en: ['The seals gave way. The town has breathed differently since.'] },
      { req: ['q3_init', 'q3_ice', 'q3_fire', 'q3_wind'], not: ['q3_finish'], set: 'q3_finish',
        lines: ['Traés los tres nombres. Dejá que los pronuncie…',
                'Scathelocke. Vesuvvio. Grisbon. Los sellos ceden. Está hecho.'],
        lines_en: ['You carry the three names. Let me speak them…',
                   'Scathelocke. Vesuvvio. Grisbon. The seals give way. It is done.'] },
      { req: ['q3_init'], not: ['q3_finish'],
        lines: ['Los nombres duermen en las ruinas: uno en el hielo, uno en el fuego, uno en el viento.',
                'Caminá sobre ellas y los oirás resonar. Traémelos y yo los pronunciaré.'],
        lines_en: ['The names sleep in the ruins: one in ice, one in fire, one in wind.',
                   'Walk upon them and you will hear them echo. Bring them to me and I will speak them.'] },
      { not: ['q3_init'], set: 'q3_init',
        lines: ['Tres magos se sellaron a sí mismos en las ruinas, hechos piedra y silencio.',
                'Buscá sus tres nombres y traémelos. Cuando los pronuncie, los sellos cederán.'],
        lines_en: ['Three mages sealed themselves in the ruins, turned to stone and silence.',
                   'Seek their three names and bring them to me. When I speak them, the seals will give way.'] },
    ] },
  // Aldeanos de ambiente: unos pocos pobladores repartidos por la plaza (los cerdos viven en la
  // granja del norte, ya en el mapa). Mismos sprites que los NPCs con nombre (mismo tamaño y con
  // idle animado), sin nombre ni diálogo — sólo dan vida sin amontonar. Direcciones variadas.
  { sprite: 'peasant_man1', x: 58, y: 44, dir: 6, critter: true },
  { sprite: 'peasant_woman1', x: 67, y: 47, dir: 6, critter: true },
  { sprite: 'peasant_man2', x: 48, y: 48, dir: 4, critter: true },
  { sprite: 'peasant_woman2', x: 74, y: 51, dir: 7, critter: true },
  { sprite: 'peasant_man1', x: 68, y: 54, dir: 1, critter: true },
]

export const NPCS_BY_MAP = {
  lochport: LOCHPORT, black_oak_farm: FARM, greenwood_point: GREENWOOD, triston: TRISTON,
}
