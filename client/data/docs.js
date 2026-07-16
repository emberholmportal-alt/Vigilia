// Documentación / Docs — wiki del juego. Bilingüe ES/EN, tono dark-fantasy. Todo sale del
// código real y de docs/WORLD.md · ECONOMY.md · ESCENARIOS.md. Canon: Triston es la última
// ciudad; Black Oak City es una zona mayor / futuro gran hub.
//
// Estructura: DOCS[lang] = { groups: [ { title, topics: [ { id, title, blocks[] } ] } ] }.
// Bloques: { h } subtítulo · { p } párrafo · { list:[...] } viñetas · { table:{cols,rows} } ·
//          { tip } consejo (verde) · { warn } aviso (ámbar).

export const DOCS = {
  es: {
    groups: [
      {
        title: 'Empezar',
        topics: [
          {
            id: 'intro', title: 'Introducción',
            blocks: [
              { p: 'Velgrim es un MMORPG isométrico de navegador, dark fantasy. Movés a tu personaje sobre un mapa de tiles, matás enemigos, juntás recursos, cumplís misiones, forjás equipo y viajás entre realms conectados —todo con un mismo personaje compartido.' },
              { p: 'Empyrea cayó. Los muertos no descansan, los duendes bajaron de las minas y algo antiguo respira en el Laberinto de Hierro. Triston es lo último que queda en pie: la última ciudad con murallas. Vos sos un vigilante, alguien a quien la ciudad le paga para salir cuando nadie más quiere.' },
              { p: 'Tu inventario, oro, niveles y equipo te acompañan entre realms. El servidor es autoritativo: la posición, el daño, el loot y la XP los valida el servidor, así nadie hace trampa.' },
            ],
          },
          {
            id: 'account', title: 'Cuenta e identidad',
            blocks: [
              { p: 'Entrás firmando con tu billetera de Solana: tu dirección ES tu cuenta. No hay email ni contraseña. Por ahora no se exige ninguna moneda para jugar (el token $VEL todavía no existe).' },
              { h: 'Qué se guarda solo' },
              { list: ['Nombre, raza y aspecto del personaje', 'Inventario, equipo y cinturón', 'Oro, niveles, XP y puntos de atributo/habilidad', 'Misiones diarias, sellos y progreso de quests', 'Tu gremio y lo donado'] },
              { warn: 'El juego sólo te pide firmar un mensaje de login. Nunca pegues tu frase semilla en un popup: ninguna función legítima te la va a pedir.' },
            ],
          },
          {
            id: 'first-hour', title: 'Tu primera hora',
            blocks: [
              { p: 'Al crear el personaje elegís raza y nombre, y despertás en la plaza de Triston con tu kit inicial ya puesto (arma y armadura según la raza) y 200 de oro.' },
              { h: 'Primeros pasos' },
              { list: ['Tocá el suelo para caminar y paseá por Triston: la Fragua, la Mesa de Alquimia, el mercader y la Casa de Gremios.', 'Abrí el inventario y mirá tu equipo: ya tenés arma, armadura y un par de pociones en el cinturón.', 'Tomá el arco Oeste hacia la Granja de Black Oak (tranquila, nivel 1-3) para tus primeras peleas y recolección.', 'Cuando juntes oro, reparás y forjás en la Fragua y preparás pociones en la Mesa de Alquimia.'] },
              { tip: 'Triston es refugio: adentro no te atacan y te regenerás de a poco. Aprovechá para acomodar el equipo antes de salir.' },
              { warn: 'Si morís afuera, tu carga queda en una tumba en el lugar. No te alejes demasiado del pueblo hasta tenerle la mano al combate.' },
            ],
          },
        ],
      },
      {
        title: 'El Mundo',
        topics: [
          {
            id: 'triston', title: 'Triston, la última ciudad',
            blocks: [
              { p: 'Triston es el hub y la única zona 100% segura. Tiene murallas, la fragua encendida y los gremios que todavía mandan gente afuera. Es donde reparás, forjás, crafteás, comprás y organizás tu personaje entre salidas.' },
              { h: 'Qué hay en la plaza' },
              { list: ['La Fragua (Herrero Dorn) — reparar y forjar equipo.', 'La Mesa de Alquimia (Yara la Bruja) — pociones y el Pergamino de Retorno.', 'El Mercader (Nix) — stock que rota cada día real.', 'La Casa de Gremios (Halvard) — fundar/unirte, contratos y depósito.', 'El Obelisco de Retorno y los Tres Guardianes.', 'Los dos arcos que llevan a los realms.'] },
              { p: 'Black Oak City (100×100) es una ciudad mucho mayor que queda como zona de nivel alto y futuro gran hub cuando el mundo crezca.' },
            ],
          },
          {
            id: 'realms', title: 'Los realms',
            blocks: [
              { p: 'El mundo se recorre por realms colgados de Triston por portales. Cada realm es su propio mapa, con su bioma, su rango de nivel y su propósito. Ahora mismo el mundo abre con estos realms curados:' },
              { table: {
                cols: ['Realm', 'Bioma', 'Nivel', 'Foco'],
                rows: [
                  ['Granja de Black Oak', 'pradera', '1–3', 'Herboristería + primeros duendes'],
                  ['Sendero del Río', 'pradera', '3–5', 'Hierbas junto al agua, tránsito'],
                  ['Campo Salado', 'pradera', '4–6', 'Combate no-muertos + saqueo'],
                  ['Cueva de Duendes', 'cueva', '5–8', 'Combate + primeras vetas de mastite'],
                ],
              } },
              { p: 'Cada realm trae sus enemigos, sus nodos de recurso y sus cofres. Más allá del arranque hay decenas de zonas encadenadas (minas, criptas, torres, el Laberinto de Hierro) que se van sumando a medida que el mundo crece.' },
              { tip: 'Elegí el realm por tu nivel: la rama Oeste (Granja → Río → Campo Salado) es recolección y curva suave; el arco Este (Cueva de Duendes) es puro combate.' },
            ],
          },
          {
            id: 'travel', title: 'Portales y viaje',
            blocks: [
              { p: 'El viaje funciona como en Diablo, con dos mecanismos que se complementan.' },
              { h: 'Portales y red de waypoints' },
              { p: 'Los dos arcos de Triston llevan al Oeste (Granja) y al Este (Cueva de Duendes). Cuando pisás un portal, esa zona queda descubierta y entra a tu red de waypoints: desde el menú de waypoints saltás a cualquier zona que ya hayas visitado.' },
              { h: 'Piedra de Retorno' },
              { p: 'La Piedra de Retorno (en el cinturón) te ancla el punto actual y te manda a Triston. El Obelisco del pueblo te devuelve a ese ancla. Es tu Portal a la Ciudad para volver rápido y seguir después donde estabas.' },
            ],
          },
          {
            id: 'death', title: 'La muerte y las tumbas',
            blocks: [
              { p: 'Si tu vida llega a cero afuera, caés y dejás una tumba en el lugar exacto con tu carga (inventario y parte del oro). Reapareces en el Obelisco de Retorno de la zona, con una penalidad de oro.' },
              { p: 'Volvé a la tumba a recuperar lo tuyo… si podés. Si morís de nuevo antes de recuperarla, se suma una tumba nueva —y el riesgo crece.' },
              { warn: 'En Triston no te pasa nada: es refugio. El peligro es sólo afuera. Bancá lo valioso y viajá liviano a las zonas duras.' },
            ],
          },
        ],
      },
      {
        title: 'Sistemas',
        topics: [
          {
            id: 'loop', title: 'El ciclo de juego',
            blocks: [
              { p: 'El bucle es simple y adictivo: salís de Triston, matás enemigos, juntás recursos y saqueás cofres. Volvés, reparás y forjás mejor equipo en la Fragua y preparás pociones en la Mesa de Alquimia. Con mejor equipo llegás más hondo, donde el loot es mejor. Repetir.' },
              { p: 'Cada acción que hacés sube su propio nivel (hasta 20) y, en paralelo, ganás XP de personaje que sube tu nivel general y te da puntos para repartir.' },
            ],
          },
          {
            id: 'movement', title: 'Movimiento y cámara',
            blocks: [
              { p: 'Tocá (o hacé clic en) el suelo para caminar hasta ahí. El personaje busca el camino solo esquivando paredes (pathfinding A* sobre la grilla de colisión). Tocá un enemigo para ir hacia él y atacarlo.' },
              { p: 'La cámara sigue al personaje con suavidad. En pantallas anchas se ve más mundo; en el móvil, el zoom está ajustado para que rindan 60fps con muchos sprites.' },
            ],
          },
          {
            id: 'inventory', title: 'Inventario, equipo y cinturón',
            blocks: [
              { p: 'El inventario arranca chico y crece con tu nivel (hasta 55 huecos). El oro se muestra abajo del panel.' },
              { h: 'Equipo' },
              { p: 'Diez slots: cabeza, torso, piernas, manos, pies, arma (main), secundaria/escudo (off), DOS anillos y un amuleto. Los siete primeros se ven en el paperdoll y cambian tu aspecto al instante; los anillos y el amuleto dan stats pero no se ven.' },
              { h: 'Cinturón' },
              { p: 'El cinturón guarda consumibles usables en combate (pociones, pergaminos). Arranca con 2 huecos y se agranda con un ítem de cinturón equipado.' },
              { tip: 'Tocá un ítem para ver su tooltip con stats y la comparación contra lo que tenés puesto (+4 def / −2 des), antes de decidir si lo equipás.' },
            ],
          },
          {
            id: 'gathering', title: 'Recolección',
            blocks: [
              { p: 'Dos de las seis acciones son de recolección, y sus nodos aparecen repartidos por cada realm (compartidos por canal, reaparecen con el tiempo).' },
              { list: ['Excavación — picás vetas de mastite en cuevas y minas. La mastite es la materia prima de la Forja.', 'Herboristería — juntás reactivos (aloe, hongos, cristal de maná) en el campo y los bordes de agua. Son la base de la Alquimia.'] },
              { p: 'Acercate a un nodo y usá el botón de recolectar. Cada juntada sube la acción correspondiente y te da el material.' },
            ],
          },
          {
            id: 'progression', title: 'Progresión y árbol',
            blocks: [
              { p: 'Al subir de nivel ganás puntos de atributo y puntos de habilidad. Repartir es una decisión, no sólo números.' },
              { h: 'Atributos' },
              { p: 'FUE (fuerza), DES (destreza), INT (inteligencia) y VIT (vitalidad). Definen vida, maná, daño, defensa y qué ramas del árbol podés abrir.' },
              { h: 'Árbol de habilidades' },
              { p: 'Tres ramas gateadas por un atributo: Guerrero (FUE), Cazador (DES) y Mago (INT). Los nodos son pasivos y suben stats derivados; cada vía además desbloquea una habilidad activa para el botón M2. Podés reespecializar pagando oro.' },
            ],
          },
        ],
      },
      {
        title: 'Combate',
        topics: [
          {
            id: 'combat', title: 'Visión general',
            blocks: [
              { p: 'El combate es autoritativo: vos pedís atacar y el servidor tira el daño con tus stats. M1 es tu golpe normal (con el arma equipada); M2 es tu habilidad especial, y elegís cuál va ahí. Las habilidades cuestan maná y tienen recarga.' },
              { p: 'Cuentan el daño del arma, tu multiplicador de daño, el crítico y la defensa del enemigo. La defensa que juntás reduce el daño que recibís. Sin arma peleás a puños (poco daño).' },
            ],
          },
          {
            id: 'weapons', title: 'Tipos de arma',
            blocks: [
              { p: 'El arma equipada define cómo atacás:' },
              { list: ['Cuerpo a cuerpo — espadas, hachas, martillos: alcance corto, daño físico.', 'A distancia — arcos y hondas: pegás de lejos, daño físico.', 'Mental — varitas y bastones: proyectil a distancia, escala con INT.'] },
              { p: 'Cada familia tiene afinidad con una raza: la raza correcta aprovecha mejor esa arma. Elegí arma según tu build (FUE/DES/INT).' },
            ],
          },
          {
            id: 'enemies', title: 'Enemigos y jefes de contrato',
            blocks: [
              { p: 'Los enemigos aparecen desde los spawners de cada mapa, con un nivel según la zona. Las familias del arranque son duendes (goblins) y no-muertos (zombies, esqueletos). Su IA va de idle → patrulla → persecución → ataque.' },
              { p: 'Cada día hay un jefe de contrato: un élite más duro ligado a la misión "Contrato" del día. Matarlo cierra esa daily y da recompensa grande. Reaparece más lento que los comunes, para que sea un evento.' },
            ],
          },
        ],
      },
      {
        title: 'Actividades',
        topics: [
          {
            id: 'quests', title: 'Misiones y diarias',
            blocks: [
              { p: 'Cada día hay tres misiones diarias (matar X enemigos, juntar X hierbas, vencer al élite del día). Se renuevan a medianoche del servidor y conservan el progreso si es el mismo día. Dan XP, oro y sellos.' },
              { p: 'Los sellos son la moneda especial: se gastan en cofres de sello (loot mejor) y en ofrendas. Además hay una quest narrativa, los Tres Nombres, que despierta a los Guardianes.' },
            ],
          },
          {
            id: 'alchemy', title: 'Alquimia',
            blocks: [
              { p: 'Yara la Bruja atiende la Mesa de Alquimia en Triston. Con reactivos de la Herboristería + una botella + el Mortero preparás pociones de vida y maná. La bruja además vende lo básico: pociones y el Pergamino de Retorno.' },
              { p: 'Las pociones van al cinturón para usarlas en combate. El maná, que hasta que aparecen las habilidades no tenía uso, pasa a importar.' },
            ],
          },
          {
            id: 'forge', title: 'Forja',
            blocks: [
              { p: 'Herrero Dorn atiende la Fragua. Hace dos cosas: reparar y forjar.' },
              { list: ['Reparar — el equipo con durabilidad se desgasta y, si llega a 0, deja de dar stats. Reparás pagando oro.', 'Forjar — con mastite (de la Excavación) + oro mejorás una pieza: sube su defensa o su daño por nivel de forja.'] },
              { tip: 'Un ítem roto no te da nada hasta repararlo. Si se rompe tu arma en plena zona, la Piedra de Retorno y una vuelta a la Fragua te salvan.' },
            ],
          },
        ],
      },
      {
        title: 'Gremios',
        topics: [
          {
            id: 'guild-basics', title: 'Fundar y unirse',
            blocks: [
              { p: 'Un gremio es una estructura persistente con nombre, sigla de tres letras y estandarte, compartida entre todos los que juegan. Hablás con Halvard en la Casa de Gremios.' },
              { list: ['Fundar — cuesta 500 de oro; elegís nombre, sigla (3 letras) y color de estandarte. Quedás como fundador.', 'Unirse — en la pestaña Ranking ves los gremios públicos ordenados por nivel; tocás "Unirme".'] },
              { p: 'Un gremio por cuenta. Podés salir cuando quieras; si eras el último, el gremio se disuelve.' },
            ],
          },
          {
            id: 'guild-levels', title: 'Niveles y ventajas',
            blocks: [
              { p: 'Donás oro al gremio para subir su nivel (por umbrales de oro donado). El nivel da ventajas a TODOS los miembros:' },
              { table: {
                cols: ['Nivel', 'Ventaja'],
                rows: [
                  ['1', '+5% oro de botín'],
                  ['2', '+4 defensa a todos'],
                  ['3', '+5% de XP'],
                  ['4', 'Depósito del Gremio'],
                  ['5', 'Estandarte visible en ciudad'],
                ],
              } },
            ],
          },
          {
            id: 'guild-contracts', title: 'Contratos semanales',
            blocks: [
              { p: 'Cada semana el gremio recibe un contrato compartido: un objetivo grande (purgar no-muertos, cazar duendes o abatir bestias). Cada miembro que mata enemigos de esa categoría suma al progreso común y visible.' },
              { p: 'Al completarlo, el gremio recibe una recompensa colectiva de oro al pozo, que empuja su nivel. El contrato se renueva cada semana (el mismo para todos).' },
            ],
          },
          {
            id: 'guild-deposit', title: 'Depósito del Gremio',
            blocks: [
              { p: 'A nivel 4 se abre el Depósito: un banco compartido del gremio. Cualquier miembro deposita y retira oro e ítems desde la pestaña "Depósito".' },
              { p: 'El servidor es la fuente de verdad del depósito: no se puede duplicar, y lo que guarda un miembro lo ve el resto. Es la forma de que el gremio junte materiales y equipo en común.' },
            ],
          },
        ],
      },
      {
        title: 'Economía',
        topics: [
          {
            id: 'gold', title: 'Oro y sumideros',
            blocks: [
              { p: 'Ganás oro peleando, juntando, con las misiones diarias y abriendo cofres. El oro compra reparaciones, forja, pociones y el stock del mercader.' },
              { p: 'Una economía sana necesita drenajes tanto como fuentes: morir deja tu carga y parte del oro en una tumba, la reparación cuesta, y las ofrendas a los Guardianes queman oro por un buff del día. Así el oro no se infla.' },
            ],
          },
          {
            id: 'seals', title: 'Sellos',
            blocks: [
              { p: 'Los fragmentos de sello salen de las misiones diarias y de las ofrendas. Son una moneda aparte del oro: se gastan en cofres de sello (loot de mejor calidad) sin tocar el token.' },
            ],
          },
          {
            id: 'token', title: '$VEL (a futuro)',
            blocks: [
              { p: 'El plan es que, más adelante, el oro se cambie por $VEL —el token del juego— en un marketplace: jugás, ganás oro, lo vendés por token y retirás. Como en los juegos play-to-earn, la venta reparte al vendedor y deja una parte al tesoro del juego.' },
              { warn: 'Por ahora el token NO existe y no se exige ninguna moneda para jugar. La prioridad es que el mundo esté vivo primero; recién después se define qué token y qué cantidades.' },
            ],
          },
        ],
      },
      {
        title: 'Referencia',
        topics: [
          {
            id: 'races', title: 'Razas',
            blocks: [
              { p: 'Cuatro pueblos siguen mandando vigilantes afuera. Cada uno pelea distinto; elegís el tuyo al crear el personaje y define tus stats de arranque y con qué equipo empezás.' },
              { table: {
                cols: ['Raza', 'Arquetipo', 'Bonus'],
                rows: [
                  ['Humano', 'Vigilante', '+10% XP'],
                  ['Elfo', 'Hechicero', '+30 maná · +3 INT · −10 vida'],
                  ['Enano', 'Guardián', '+40 vida · +3 VIT · −10% velocidad'],
                  ['Orco', 'Bruto', '+25% daño · +4 FUE · −15% maná'],
                ],
              } },
              { p: '“El humano aprende rápido, muere igual. El elfo: sangre arcana, huesos finos. El enano: piel de piedra, paso corto. El orco: furia, no mucho más.”' },
            ],
          },
          {
            id: 'roadmap', title: 'Roadmap',
            blocks: [
              { h: 'Andando' },
              { list: ['Mundo isométrico recorrible (portales estilo Diablo)', 'Combate autoritativo, enemigos y jefes de contrato', 'Ítems, inventario, equipo (2 anillos), forja y alquimia', 'Progresión: niveles, atributos, árbol, misiones diarias', 'Gremios: fundar, donar, contratos, depósito', 'Multijugador: mundo compartido, co-op, chat, reconexión', 'Persistencia en PostgreSQL'] },
              { h: 'Viene' },
              { list: ['Más realms curados hacia el endgame', 'Marketplace P2P y el token $VEL', 'Estandartes de gremio visibles y pool colaborativo', 'PvP / Arena (cuando el loop se sienta bien)'] },
            ],
          },
          {
            id: 'faq', title: 'Preguntas frecuentes',
            blocks: [
              { h: '¿Necesito una billetera para jugar?' },
              { p: 'Para jugar online, sí: la billetera es tu cuenta. Sin billetera podés entrar como espectador a mirar el mundo.' },
              { h: '¿Necesito tener el token $VEL?' },
              { p: 'No. El token todavía no existe y el gate está apagado: por ahora cualquiera entra.' },
              { h: '¿Pierdo mis cosas si muero?' },
              { p: 'No las perdés: quedan en una tumba en el lugar. Volvés a buscarlas. El riesgo es no llegar a tiempo.' },
              { h: '¿Se guarda mi progreso?' },
              { p: 'Sí, todo se guarda solo en el servidor. Cerrás el navegador, volvés al otro día y tu personaje está intacto, con dailies nuevas.' },
            ],
          },
        ],
      },
    ],
  },

  en: {
    groups: [
      {
        title: 'Getting Started',
        topics: [
          {
            id: 'intro', title: 'Introduction',
            blocks: [
              { p: 'Velgrim is a browser-based isometric MMORPG, dark fantasy. You move your character on a tile map, kill enemies, gather resources, complete quests, forge gear and travel between connected realms —all with one shared character.' },
              { p: 'Empyrea fell. The dead do not rest, goblins came down from the mines, and something ancient breathes in the Iron Labyrinth. Triston is the last thing standing: the last walled city. You are a watcher, someone the city pays to go out when no one else will.' },
              { p: 'Your inventory, gold, levels and gear travel with you between realms. The server is authoritative: position, damage, loot and XP are validated server-side, so no one cheats.' },
            ],
          },
          {
            id: 'account', title: 'Account & identity',
            blocks: [
              { p: 'You sign in with your Solana wallet: your address IS your account. There is no email or password. For now no currency is required to play (the $VEL token does not exist yet).' },
              { h: 'What saves automatically' },
              { list: ['Character name, race and look', 'Inventory, gear and belt', 'Gold, levels, XP and attribute/skill points', 'Daily quests, seals and quest progress', 'Your guild and what you donated'] },
              { warn: 'The game only asks you to sign a login message. Never paste your seed phrase into a popup: no legitimate feature will ever ask for it.' },
            ],
          },
          {
            id: 'first-hour', title: 'Your first hour',
            blocks: [
              { p: 'When you create your character you choose a race and name, and wake in the square of Triston with your starting kit already equipped (weapon and armor by race) and 200 gold.' },
              { h: 'First steps' },
              { list: ['Tap the ground to walk and explore Triston: the Forge, the Alchemy Table, the merchant and the Guild Hall.', 'Open your inventory and check your gear: you already have a weapon, armor and a couple of potions on the belt.', 'Take the West arch to Black Oak Farm (calm, level 1-3) for your first fights and gathering.', 'Once you gather gold, repair and forge at the Forge and brew potions at the Alchemy Table.'] },
              { tip: 'Triston is a refuge: nothing attacks you inside and you slowly regenerate. Use it to sort out your gear before heading out.' },
              { warn: 'If you die out in the wilds, your load stays in a grave on the spot. Do not stray too far from town until combat feels comfortable.' },
            ],
          },
        ],
      },
      {
        title: 'The World',
        topics: [
          {
            id: 'triston', title: 'Triston, the last city',
            blocks: [
              { p: 'Triston is the hub and the only fully safe zone. It has walls, a lit forge and the guilds that still send people out. It is where you repair, forge, craft, buy and organize your character between trips.' },
              { h: 'What is in the square' },
              { list: ['The Forge (Dorn the Smith) — repair and forge gear.', 'The Alchemy Table (Yara the Witch) — potions and the Return Scroll.', 'The Merchant (Nix) — stock that rotates each real day.', 'The Guild Hall (Halvard) — found/join, contracts and deposit.', 'The Obelisk of Return and the Three Guardians.', 'The two arches that lead to the realms.'] },
              { p: 'Black Oak City (100×100) is a much larger city that remains a high-level zone and future grand hub as the world grows.' },
            ],
          },
          {
            id: 'realms', title: 'The realms',
            blocks: [
              { p: 'The world is traveled through realms hung off Triston by portals. Each realm is its own map, with its biome, level range and purpose. Right now the world opens with these curated realms:' },
              { table: {
                cols: ['Realm', 'Biome', 'Level', 'Focus'],
                rows: [
                  ['Black Oak Farm', 'grassland', '1–3', 'Herbalism + first goblins'],
                  ['River Trail', 'grassland', '3–5', 'Herbs by the water, transit'],
                  ['Salted Field', 'grassland', '4–6', 'Undead combat + looting'],
                  ['Goblin Cave', 'cave', '5–8', 'Combat + first mastite veins'],
                ],
              } },
              { p: 'Each realm brings its own enemies, resource nodes and chests. Beyond the start there are dozens of chained zones (mines, crypts, towers, the Iron Labyrinth) added as the world grows.' },
              { tip: 'Pick the realm by your level: the West branch (Farm → River → Salted Field) is gathering and a gentle curve; the East arch (Goblin Cave) is pure combat.' },
            ],
          },
          {
            id: 'travel', title: 'Portals & travel',
            blocks: [
              { p: 'Travel works like in Diablo, with two mechanisms that complement each other.' },
              { h: 'Portals and waypoint network' },
              { p: "Triston's two arches lead West (Farm) and East (Goblin Cave). When you step on a portal, that zone is discovered and joins your waypoint network: from the waypoint menu you jump to any zone you have already visited." },
              { h: 'Return Stone' },
              { p: 'The Return Stone (on your belt) anchors your current spot and sends you to Triston. The town Obelisk brings you back to that anchor. It is your Town Portal to return fast and continue later where you were.' },
            ],
          },
          {
            id: 'death', title: 'Death & graves',
            blocks: [
              { p: 'If your health hits zero in the wilds, you fall and leave a grave on the exact spot with your load (inventory and some gold). You respawn at the zone Obelisk of Return, with a gold penalty.' },
              { p: 'Go back to the grave to recover what is yours… if you can. If you die again before recovering it, a new grave is added —and the risk grows.' },
              { warn: 'In Triston nothing happens to you: it is a refuge. Danger is only outside. Bank your valuables and travel light to the hard zones.' },
            ],
          },
        ],
      },
      {
        title: 'Systems',
        topics: [
          {
            id: 'loop', title: 'The gameplay loop',
            blocks: [
              { p: 'The loop is simple and addictive: leave Triston, kill enemies, gather resources and loot chests. Come back, repair and forge better gear at the Forge and brew potions at the Alchemy Table. Better gear takes you deeper, where the loot is better. Repeat.' },
              { p: 'Every action you do levels its own skill (up to 20) and, in parallel, you earn character XP that raises your overall level and grants points to spend.' },
            ],
          },
          {
            id: 'movement', title: 'Movement & camera',
            blocks: [
              { p: 'Tap (or click) the ground to walk there. The character finds its path on its own, avoiding walls (A* pathfinding over the collision grid). Tap an enemy to walk to it and attack.' },
              { p: 'The camera follows the character smoothly. On wide screens you see more of the world; on mobile, zoom is tuned for 60fps with many sprites on screen.' },
            ],
          },
          {
            id: 'inventory', title: 'Inventory, gear & belt',
            blocks: [
              { p: 'Your inventory starts small and grows with your level (up to 55 slots). Gold is shown at the bottom of the panel.' },
              { h: 'Gear' },
              { p: 'Ten slots: head, chest, legs, hands, feet, weapon (main), off-hand/shield (off), TWO rings and an amulet. The first seven show on the paperdoll and change your look instantly; rings and amulet give stats but are not shown.' },
              { h: 'Belt' },
              { p: 'The belt holds combat consumables (potions, scrolls). It starts with 2 slots and grows with an equipped belt item.' },
              { tip: 'Tap an item to see its tooltip with stats and the comparison against what you have on (+4 def / −2 dex), before deciding to equip it.' },
            ],
          },
          {
            id: 'gathering', title: 'Gathering',
            blocks: [
              { p: 'Two of the six actions are gathering, and their nodes appear spread across each realm (shared per channel, they respawn over time).' },
              { list: ['Digging — you mine mastite veins in caves and mines. Mastite is the raw material of the Forge.', 'Herbalism — you gather reagents (aloe, mushrooms, mana crystal) in the field and by the water. They are the base of Alchemy.'] },
              { p: 'Get close to a node and use the gather button. Each gather levels the matching action and gives you the material.' },
            ],
          },
          {
            id: 'progression', title: 'Progression & tree',
            blocks: [
              { p: 'On level-up you earn attribute points and skill points. Spending them is a decision, not just numbers.' },
              { h: 'Attributes' },
              { p: 'STR (strength), DEX (dexterity), INT (intelligence) and VIT (vitality). They set health, mana, damage, defense and which branches of the tree you can open.' },
              { h: 'Skill tree' },
              { p: 'Three branches gated by an attribute: Warrior (STR), Hunter (DEX) and Mage (INT). Nodes are passive and raise derived stats; each path also unlocks an active ability for the M2 button. You can respec by paying gold.' },
            ],
          },
        ],
      },
      {
        title: 'Combat',
        topics: [
          {
            id: 'combat', title: 'Overview',
            blocks: [
              { p: 'Combat is authoritative: you request an attack and the server rolls the damage with your stats. M1 is your normal strike (with the equipped weapon); M2 is your special ability, and you choose which one goes there. Abilities cost mana and have cooldowns.' },
              { p: 'Weapon damage, your damage multiplier, crit and the enemy defense all count. The defense you gather reduces the damage you take. Without a weapon you fight with fists (low damage).' },
            ],
          },
          {
            id: 'weapons', title: 'Weapon types',
            blocks: [
              { p: 'The equipped weapon defines how you attack:' },
              { list: ['Melee — swords, axes, hammers: short reach, physical damage.', 'Ranged — bows and slings: hit from afar, physical damage.', 'Mental — wands and staves: ranged projectile, scales with INT.'] },
              { p: 'Each family has an affinity with a race: the right race gets more out of that weapon. Choose your weapon to match your build (STR/DEX/INT).' },
            ],
          },
          {
            id: 'enemies', title: 'Enemies & contract bosses',
            blocks: [
              { p: 'Enemies appear from each map\'s spawners, at a level set by the zone. The starter families are goblins and undead (zombies, skeletons). Their AI goes idle → patrol → chase → attack.' },
              { p: 'Each day there is a contract boss: a tougher elite tied to the day\'s "Contract" quest. Killing it closes that daily and gives a big reward. It respawns slower than commons, so it stays an event.' },
            ],
          },
        ],
      },
      {
        title: 'Activities',
        topics: [
          {
            id: 'quests', title: 'Quests & dailies',
            blocks: [
              { p: 'Each day there are three daily quests (kill X enemies, gather X herbs, defeat the day\'s elite). They refresh at server midnight and keep progress within the same day. They grant XP, gold and seals.' },
              { p: 'Seals are the special currency: spend them on seal chests (better loot) and on offerings. There is also a story quest, the Three Names, that wakes the Guardians.' },
            ],
          },
          {
            id: 'alchemy', title: 'Alchemy',
            blocks: [
              { p: 'Yara the Witch runs the Alchemy Table in Triston. With Herbalism reagents + a bottle + the Mortar you brew health and mana potions. The witch also sells the basics: potions and the Return Scroll.' },
              { p: 'Potions go on the belt to use in combat. Mana, which had no use until abilities appear, starts to matter.' },
            ],
          },
          {
            id: 'forge', title: 'Smithing',
            blocks: [
              { p: 'Dorn the Smith runs the Forge. It does two things: repair and forge.' },
              { list: ['Repair — gear with durability wears down and, if it hits 0, stops giving stats. You repair by paying gold.', 'Forge — with mastite (from Digging) + gold you upgrade a piece: it raises its defense or damage per forge level.'] },
              { tip: 'A broken item gives you nothing until repaired. If your weapon breaks mid-zone, the Return Stone and a trip back to the Forge save you.' },
            ],
          },
        ],
      },
      {
        title: 'Guilds',
        topics: [
          {
            id: 'guild-basics', title: 'Found & join',
            blocks: [
              { p: 'A guild is a persistent structure with a name, a three-letter tag and a banner, shared across everyone who plays. You talk to Halvard at the Guild Hall.' },
              { list: ['Found — costs 500 gold; you choose a name, tag (3 letters) and banner color. You become the founder.', 'Join — in the Ranking tab you see the public guilds ordered by level; tap "Join".'] },
              { p: 'One guild per account. You can leave whenever you want; if you were the last, the guild disbands.' },
            ],
          },
          {
            id: 'guild-levels', title: 'Levels & perks',
            blocks: [
              { p: 'You donate gold to the guild to raise its level (by thresholds of donated gold). The level grants perks to EVERY member:' },
              { table: {
                cols: ['Level', 'Perk'],
                rows: [
                  ['1', '+5% loot gold'],
                  ['2', '+4 defense for all'],
                  ['3', '+5% XP'],
                  ['4', 'Guild Deposit'],
                  ['5', 'Banner shown in town'],
                ],
              } },
            ],
          },
          {
            id: 'guild-contracts', title: 'Weekly contracts',
            blocks: [
              { p: 'Each week the guild receives a shared contract: a big goal (purge undead, hunt goblins or slay beasts). Every member who kills enemies of that category adds to the shared, visible progress.' },
              { p: 'On completion, the guild gets a collective gold reward to its vault, which pushes its level. The contract refreshes weekly (the same for everyone).' },
            ],
          },
          {
            id: 'guild-deposit', title: 'Guild Deposit',
            blocks: [
              { p: 'At level 4 the Deposit opens: a shared guild bank. Any member deposits and withdraws gold and items from the "Deposit" tab.' },
              { p: 'The server is the source of truth for the deposit: it cannot be duplicated, and what one member stores the rest can see. It is how the guild pools materials and gear.' },
            ],
          },
        ],
      },
      {
        title: 'Economy',
        topics: [
          {
            id: 'gold', title: 'Gold & sinks',
            blocks: [
              { p: 'You earn gold by fighting, gathering, from daily quests and opening chests. Gold buys repairs, smithing, potions and merchant stock.' },
              { p: 'A healthy economy needs drains as much as sources: dying leaves your load and some gold in a grave, repairs cost, and offerings to the Guardians burn gold for a buff of the day. That way gold does not inflate.' },
            ],
          },
          {
            id: 'seals', title: 'Seals',
            blocks: [
              { p: 'Seal fragments come from daily quests and offerings. They are a currency apart from gold: spend them on seal chests (higher-quality loot) without touching the token.' },
            ],
          },
          {
            id: 'token', title: '$VEL (future)',
            blocks: [
              { p: 'The plan is that, later, gold will trade for $VEL —the game token— in a marketplace: play, earn gold, sell it for the token, cash out. As in play-to-earn games, the sale pays the seller and leaves a share to the game treasury.' },
              { warn: 'For now the token does NOT exist and no currency is required to play. The priority is a living world first; only after that do we define which token and what amounts.' },
            ],
          },
        ],
      },
      {
        title: 'Reference',
        topics: [
          {
            id: 'races', title: 'Races',
            blocks: [
              { p: 'Four peoples still send watchers out. Each fights differently; you choose yours when you create your character, and it sets your starting stats and what gear you begin with.' },
              { table: {
                cols: ['Race', 'Archetype', 'Bonus'],
                rows: [
                  ['Human', 'Watcher', '+10% XP'],
                  ['Elf', 'Sorcerer', '+30 mana · +3 INT · −10 health'],
                  ['Dwarf', 'Guardian', '+40 health · +3 VIT · −10% speed'],
                  ['Orc', 'Brute', '+25% damage · +4 STR · −15% mana'],
                ],
              } },
              { p: '“The human learns fast, dies all the same. The elf: arcane blood, fine bones. The dwarf: stone skin, short stride. The orc: fury, not much else.”' },
            ],
          },
          {
            id: 'roadmap', title: 'Roadmap',
            blocks: [
              { h: 'Live' },
              { list: ['Explorable isometric world (Diablo-style portals)', 'Authoritative combat, enemies and contract bosses', 'Items, inventory, gear (2 rings), smithing and alchemy', 'Progression: levels, attributes, skill tree, daily quests', 'Guilds: found, donate, contracts, deposit', 'Multiplayer: shared world, co-op, chat, reconnection', 'PostgreSQL persistence'] },
              { h: 'Coming' },
              { list: ['More curated realms toward the endgame', 'P2P marketplace and the $VEL token', 'Visible guild banners and a collaborative pool', 'PvP / Arena (once the loop feels good)'] },
            ],
          },
          {
            id: 'faq', title: 'FAQ',
            blocks: [
              { h: 'Do I need a wallet to play?' },
              { p: 'To play online, yes: the wallet is your account. Without a wallet you can enter as a spectator to watch the world.' },
              { h: 'Do I need the $VEL token?' },
              { p: 'No. The token does not exist yet and the gate is off: for now anyone can enter.' },
              { h: 'Do I lose my things if I die?' },
              { p: 'You do not lose them: they stay in a grave on the spot. You go back for them. The risk is not making it in time.' },
              { h: 'Is my progress saved?' },
              { p: 'Yes, everything saves automatically on the server. Close the browser, come back the next day, and your character is intact, with fresh dailies.' },
            ],
          },
        ],
      },
    ],
  },
}
