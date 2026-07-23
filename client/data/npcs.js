// Pobladores por mapa. Sprites reales de Flare, diálogo con personalidad y rumores.
// `portrait` = retrato pintado de Flare que se muestra al hablar (public/assets/portraits).
// Varios patrullan. Direcciones: 0=SW 1=W 2=NW 3=N 4=NE 5=E 6=SE 7=S

const LOCHPORT = [
  // El Obelisco de Retorno y los Tres Guardianes NO van acá: son seña de identidad de Triston
  // (el pueblo principal) y no se repiten (igual que en la granja). Antes se duplicaban como
  // props sin funcionar (sin `obelisk:true`); quitados para respetar la regla del mundo.

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
// Granja de Black Oak (realm 1, gathering lv1-3): puesto de frontera, NO un segundo pueblo.
// Sólo un guardia + el buhonero ambulante. El Obelisco de Retorno y los Tres Guardianes son
// seña de identidad de Triston (el pueblo principal): no se repiten acá.
const FARM = [
  { sprite: 'knight', name: 'Guardia Bram', name_en: 'Guard Bram', portrait: 'male07.png', x: 63, y: 53, dir: 1,
    lines: ['Ojos duros, vigilante. Afuera no perdona.'] },
  { sprite: 'peddler_goblin', name: 'Nix', name_en: 'Nix', portrait: 'goblin.png', x: 61, y: 57, dir: 4,
    lines: ['¡Psst! Reliquias raras, precios de robo.'] },
]

// Greenwood Point (pueblo del mod noname): hub con edificios reales. Cada NPC de servicio
// se ubica FRENTE a un edificio. El obelisco/guardianes son de Triston y no se repiten acá.
const GREENWOOD = [
  // El Obelisco de Retorno y los Tres Guardianes NO van acá (seña de identidad de Triston):
  // antes se duplicaban como props sin funcionar; quitados para respetar la regla del mundo.

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
            'No preguntes de dónde salió. Preguntá cuánto vale.',
            'Los míos no dejamos las minas por oro, vigilante. Salimos corriendo. Preguntate de qué.'],
    lines_en: ['Psst! Rare relics, thieving prices.',
               'For you, double the thieving.',
               "Don't ask where it came from. Ask what it's worth.",
               "My kind didn't leave the mines for gold, watcher. We ran. Ask yourself from what."] },
  { sprite: 'knight', name: 'Guardia Bram', name_en: 'Guard Bram', portrait: 'male07.png', x: 64, y: 57, dir: 1,
    lines: ['Ojos duros, vigilante. Afuera no perdona.',
            'Anoche hubo tambores del lado de las minas. No eran duendes: los duendes no marcan el paso.',
            'Cada zona más honda cobra un peaje distinto. Primero el oro. Después el nombre.'],
    lines_en: ['Hard eyes, watcher. The wilds do not forgive.',
               'There were drums by the mines last night. Not goblins: goblins do not keep the beat.',
               'Each deeper zone charges a different toll. First your gold. Then your name.'] },
  { sprite: 'guild_man', name: 'Halvard', name_en: 'Halvard', portrait: 'male01.png', x: 56, y: 58, dir: 5, guild: true,
    lines: ['Los gremios reclutan de nuevo.',
            'Quinientos de oro y una sigla de tres letras.',
            'Alguien tiene que organizar a los que salen. El muro de los Guardianes nos protege, pero no nos da de comer.'],
    lines_en: ['The guilds are recruiting again.',
               'Five hundred gold and a three-letter tag.',
               "Someone has to organize those who go out. The Guardians' wall protects us, but it does not feed us."] },
  // Herrero: repara el equipo por oro (zona de la fragua/yunque). Sprite HERESY con idle animado.
  { sprite: 'peasant_man2', name: 'Herrero Dorn', name_en: 'Dorn the Smith', portrait: 'male16.png', x: 70, y: 52, dir: 5, smith: true,
    lines: ['El acero se cansa como los hombres.',
            'Tráemelo antes de que se quiebre del todo.',
            'Con mastite de las cuevas te levanto un filo que corta lo que ya está muerto. Nada barato.'],
    lines_en: ['Steel tires just like men do.',
               'Bring it to me before it breaks for good.',
               'With mastite from the caves I can raise you an edge that cuts what is already dead. Nothing cheap.'] },
  // Obelisco de Retorno: en el camposanto (junto a la cripta de la iglesia). Si usaste una
  // Piedra de Retorno en el mundo, este obelisco te devuelve al punto anclado (mecánica de
  // portal de Diablo). Sin partículas mágicas (noParticles): queda como piedra sobria.
  { sprite: 'return_obelisk1', name: 'Obelisco de Retorno', name_en: 'Obelisk of Return', landmark: true, obelisk: true, noParticles: true, x: 47, y: 70, dir: 7 },
  // Yara la Bruja: la alquimista es la bruja de la casa del rincón (NE del mapa). ES la ÚNICA que
  // vende pociones de vida/maná y el Pergamino de Retorno (shopKind 'alchemist'). Sprite de la
  // bruja de HERESY, en su lugar (87,18).
  { sprite: 'witch_adriana', name: 'Yara la Bruja', name_en: 'Yara the Witch', portrait: 'female04.png', x: 87, y: 18, dir: 0, alchemy: true,
    lines: ['Pociones de vida y de maná, y pergaminos para volver. Nada más… nada menos.',
            'La botella vacía y el aloe los junta cualquiera. El jugo lo saco yo.',
            'Desde la Caída los muertos no descansan. Ninguna poción arregla eso; sólo te compra tiempo.'],
    lines_en: ['Health and mana potions, and scrolls to return. Nothing more… nothing less.',
               'Anyone can gather an empty bottle and aloe. Wringing the juice — that I do.',
               'Since the Fall the dead do not rest. No potion fixes that; it only buys you time.'] },
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
  // Los Tres Guardianes: las estatuas que velan Triston desde el BANCO DEL RÍO al oeste, en línea
  // sobre la orilla y mirando al pueblo (dir 5 = E), lejos del centro. Posiciones caminables,
  // sin oclusión (verificado contra colisión + captura). Son el corazón del lore (los tres
  // archimagos de Empyrea, sellados en piedra). Cada uno habla con su voz —Vesuvvio (fuego),
  // Scathelocke (hielo), Grisbon (viento)—. La ofrenda del buff del día se hace en el Obelisco;
  // estos son puramente lore + ambiente.
  { sprite: 'statue_guardian_fire', name: 'Guardián de Fuego', name_en: 'Guardian of Fire', landmark: true, x: 18, y: 44, dir: 0, scale: 2.4,
    lines: ['Fui el Fuego de Empyrea. Vesuvvio, me llamaban, cuando aún tenía voz.',
            'Mi nombre arde sellado en las Minas de Perdición. No lo traigas de vuelta sin estar seguro.'],
    lines_en: ['I was the Fire of Empyrea. Vesuvvio, they called me, when I still had a voice.',
               'My name burns sealed in the Perdition Mines. Do not bring it back unless you are certain.'] },
  { sprite: 'statue_guardian_wind', name: 'Guardián del Viento', name_en: 'Guardian of Wind', landmark: true, x: 20, y: 46, dir: 0, scale: 2.4,
    lines: ['El viento lleva los nombres de los que no volvieron.',
            'Grisbon fui, y llevé las órdenes de un confín al otro. Ahora sólo llevo silencio.'],
    lines_en: ['The wind carries the names of those who did not return.',
               'Grisbon I was, and I carried orders from one edge of the realm to the other. Now I carry only silence.'] },
  { sprite: 'statue_guardian_ice', name: 'Guardián de Hielo', name_en: 'Guardian of Ice', landmark: true, x: 22, y: 48, dir: 0, scale: 2.4,
    lines: ['El hielo no odia. Sólo espera.',
            'Scathelocke guardaba las verdades del reino. Ahora me guardo a mí misma, dormida en la piedra.'],
    lines_en: ['Ice does not hate. It only waits.',
               'Scathelocke kept the truths of the kingdom. Now I keep myself, asleep in the stone.'] },
  // Aldeanos con nombre: tejen la historia de a pedazos al hablarles. El viejo Garrick vio la
  // Caída; Wren teme lo que respira en el Laberinto; Tomas cuenta lo de las minas. Los otros dos
  // quedan de ambiente (critter: sin nombre ni diálogo), para dar vida sin amontonar.
  { sprite: 'peasant_man1', name: 'Tomas', name_en: 'Tomas', portrait: 'male03.png', x: 58, y: 44, dir: 6,
    lines: ['Mi hermano salió a cazar duendes a las minas. Volvió su bota. Nada más.',
            'En las minas abandonadas hay algo que no es duende. Todos lo saben. Nadie va.'],
    lines_en: ['My brother went to hunt goblins in the mines. His boot came back. Nothing else.',
               'In the abandoned mines there is something that is not a goblin. Everyone knows. No one goes.'] },
  { sprite: 'peasant_woman1', name: 'Wren', name_en: 'Wren', portrait: 'female02.png', x: 67, y: 47, dir: 6,
    lines: ['Cerrá la puerta al anochecer. Lo que camina de noche no golpea antes de entrar.',
            'Mi abuela decía que algo respira bajo el Laberinto de Hierro. Yo antes me reía.'],
    lines_en: ['Close your door at dusk. What walks at night does not knock before coming in.',
               'My grandmother said something breathes beneath the Iron Labyrinth. I used to laugh.'] },
  { sprite: 'peasant_man2', name: 'el viejo Garrick', name_en: 'Old Garrick', portrait: 'male18.png', x: 48, y: 48, dir: 4,
    lines: ['Yo vi las torres de Empyrea encendidas, pibe. Y vi cómo se apagaron, una por una.',
            'Dicen que fueron los Tres, que rompieron su propio sello. Yo no digo nada.',
            'Cuidá tu nombre allá afuera. Es lo último que te queda.'],
    lines_en: ['I saw the towers of Empyrea lit, boy. And I saw them go out, one by one.',
               'They say it was the Three, that they broke their own seal. I say nothing.',
               'Guard your name out there. It is the last thing you have left.'] },
  { sprite: 'peasant_woman2', x: 74, y: 51, dir: 7, critter: true },
  { sprite: 'peasant_man1', x: 68, y: 54, dir: 1, critter: true },
]

// Black Oak City (la joya caída del reino, nivel ~10): NO es un pueblo. Un puñado de sobrevivientes
// se aferra a una esquina cerca de la puerta (el hub de llegada, 41,13); las avenidas son de los
// monstruos. Un mercader carroñero (compra/venta en el lugar, valioso tan lejos de Triston), un
// centinela solitario y una vieja que recuerda la ciudad en pie. Ambiente + un servicio real.
const BLACK_OAK_CITY = [
  { sprite: 'wandering_trader', name: 'Corvin el Carroñero', name_en: 'Corvin the Scavenger', portrait: 'male10.png', x: 39, y: 13, dir: 5, shop: true,
    lines: ['Compro lo que saques de las avenidas. No pregunto de qué boca lo sacaste.',
            'Acero de la vieja guardia, todavía sirve. Más de lo que sirvieron ellos.',
            'Vendé antes de bajar. Los muertos no dan cambio.'],
    lines_en: ['I buy whatever you pull from the avenues. I do not ask whose mouth you pulled it from.',
               'Steel from the old guard, still good. More than they turned out to be.',
               'Sell before you go deeper. The dead do not make change.'] },
  { sprite: 'knight', name: 'Centinela Aldric', name_en: 'Sentinel Aldric', portrait: 'male07.png', x: 41, y: 11, dir: 7,
    lines: ['No queda muro que valga acá. Sólo esta esquina, y sólo porque la peleamos cada noche.',
            'Si vas a las avenidas, andá con filo. La ciudad se come a los que llegan blandos.',
            'La Torre del Mago sigue en pie al fondo. Nadie que entró volvió a contarlo.'],
    lines_en: ['No wall worth the name holds here. Just this corner, and only because we fight for it every night.',
               'If you go to the avenues, go with a blade. The city eats those who arrive soft.',
               "The Wizard's Tower still stands at the far end. No one who went in came back to tell it."] },
  { sprite: 'peasant_woman1', name: 'la vieja Maerith', name_en: 'Old Maerith', portrait: 'female02.png', x: 41, y: 15, dir: 3,
    lines: ['Nací bajo estas torres cuando todavía tenían luz. Black Oak era la joya del reino.',
            'Ahora la joya está engarzada en la garganta de otra cosa. Y todavía brilla.',
            'Los Tres se sellaron en su torre, dicen. Yo digo que nunca se fueron.'],
    lines_en: ['I was born beneath these towers when they still held light. Black Oak was the jewel of the kingdom.',
               'Now the jewel is set in the throat of something else. And it still shines.',
               'The Three sealed themselves in their tower, they say. I say they never left.'] },
  { sprite: 'peasant_man1', x: 43, y: 12, dir: 1, critter: true },
]

// El Inframundo (nivel ~13): nadie vive acá; algunos, apenas, no terminan de morirse. Un ermitaño
// que bajó y no supo volver (lore) y un contrabandista que comercia con los que se atreven (compra/
// venta — invaluable tan hondo). Cerca del punto de llegada (67,47).
const UNDERWORLD = [
  { sprite: 'peasant_man2', name: 'el Descendido', name_en: 'the Descended One', portrait: 'male18.png', x: 65, y: 47, dir: 5,
    lines: ['Bajé a buscar a mi hija. Bajé y bajé. Ya no sé cuál de los dos se perdió.',
            'El pozo no tiene fondo, forastero. Sólo tiene más abajo.',
            'Escuchá. ¿Lo oís? La cosa que abrió todo esto todavía respira ahí en la oscuridad.'],
    lines_en: ['I came down to find my daughter. I came down and down. I no longer know which of us is lost.',
               'The pit has no bottom, stranger. It only has further down.',
               'Listen. Do you hear it? The thing that opened all this still breathes there in the dark.'] },
  { sprite: 'peddler_goblin', name: 'Grask el Descarnado', name_en: 'Grask the Fleshless', portrait: 'goblin.png', x: 69, y: 47, dir: 0, shop: true,
    lines: ['¿Comprás, vendés? Nadie más baja tan hondo con mercadería. Aprovechá.',
            'Todo tiene precio acá abajo. Hasta salir.',
            'No mirés al Minotauro a los ojos. A los cuernos, tampoco.'],
    lines_en: ['Buying, selling? No one else comes this deep with goods. Make the most of it.',
               'Everything has a price down here. Even leaving.',
               "Don't look the Minotaur in the eyes. Nor at the horns, either."] },
]

export const NPCS_BY_MAP = {
  lochport: LOCHPORT, black_oak_farm: FARM, greenwood_point: GREENWOOD, triston: TRISTON,
  black_oak_city: BLACK_OAK_CITY, underworld: UNDERWORLD,
}
