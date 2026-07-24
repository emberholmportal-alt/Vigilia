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
        title: 'Historia',
        topics: [
          {
            id: 'empyrea', title: 'La Edad de Empyrea',
            blocks: [
              { p: 'Antes de la Caída hubo un reino: Empyrea, de torres altas y caminos de piedra, alumbrado por tres magisterios. El Fuego de Vesuvvio calentaba las fraguas y quemaba lo que debía arder. El Hielo de Scathelocke guardaba las cosechas y las verdades. El Viento de Grisbon llevaba las órdenes de un confín al otro.' },
              { p: 'Vesuvvio, Scathelocke y Grisbon no eran estatuas: eran los tres archimagos que sostenían el reino. Su obra secreta, la que nadie cantaba en las plazas, era otra: mantener dormida una cosa antigua y sin nombre, encerrada en el corazón de hierro del mundo, bajo lo que hoy llaman el Laberinto de Hierro.' },
              { p: 'Mientras los Tres velaron, Empyrea prosperó. La gente creyó que sería para siempre. La gente siempre lo cree.' },
            ],
          },
          {
            id: 'the-fall', title: 'La Caída',
            blocks: [
              { p: 'Nadie que lo viera vive para contarlo entero. Lo que se sabe es esto: el sello se quebró. Unos dicen que fue ambición —que uno de los Tres quiso usar el poder de lo que ataban—; otros, que fue descuido de una generación que dejó de creer en el peligro. Da igual. La atadura cedió, y la cosa despertó a medias.' },
              { p: 'No hubo un ejército ni una batalla. Hubo un apagón lento. Los muertos dejaron de descansar. Los duendes huyeron de las minas hacia la superficie, más asustados que fieros. Los caminos se llenaron de cosas que antes no salían de noche. En una sola generación, Empyrea se apagó como una vela.' },
              { p: 'A eso lo llaman la Caída. No tiene fecha exacta: cada pueblo la cuenta desde el día en que le tocó.' },
            ],
          },
          {
            id: 'guardians', title: 'Los Tres Guardianes',
            blocks: [
              { p: 'Cuando entendieron que no podían volver a atar del todo lo que despertaba, los Tres tomaron la última decisión. Se sellaron a sí mismos en piedra —Fuego, Hielo, Viento— en la plaza de la última ciudad, y volcaron lo que les quedaba de poder en un muro invisible que mantiene a raya lo de afuera.' },
              { p: 'El precio fue quedar dormidos. Y algo más: para que nadie los despertara antes de tiempo —ni la cosa los usara a través de un tonto con buenas intenciones— sus nombres verdaderos fueron escondidos, cada uno en el lugar atado a su elemento. El de Vesuvvio, sellado en fuego en las Minas de Perdición. El de Scathelocke, en hielo, entre las ruinas de Santa María. El de Grisbon, en viento, en el Paso Roca-Tormenta.' },
              { p: 'Hoy son tres estatuas que velan la plaza de Triston. Una ofrenda de oro despierta un hilo de su antiguo poder —el buff del día—. Pronunciar los tres nombres los despierta de verdad; si eso es salvación o el error final, sólo Udana la Vidente se atreve a sospecharlo.' },
              { tip: 'La quest de los Tres Nombres te lleva a esas tres ruinas a recuperar los nombres, y de vuelta con la Vidente. Es la historia central del mundo, contada con tus pies.' },
            ],
          },
          {
            id: 'watchers', title: 'La Orden de los Vigilantes',
            blocks: [
              { p: 'El muro de los Guardianes protege a Triston, pero no alimenta a nadie. Alguien tiene que salir: por mastite para las fraguas, por hierbas para las pociones, por reliquias que todavía sirven, por noticias de qué se mueve allá afuera. Esos son los vigilantes.' },
              { p: 'No es una orden noble. Son cazadores, buscavidas y penitentes a los que la ciudad les paga en oro por hacer lo que nadie más quiere. La mayoría no dura. Los que duran no hablan mucho. Vos sos uno de ellos.' },
              { p: '“Ojos duros, vigilante. Afuera no perdona.” —Guardia Bram, en la puerta.' },
            ],
          },
          {
            id: 'perdition', title: 'Perdición',
            blocks: [
              { p: 'Cuanto más hondo vas hacia el corazón de hierro, más fuerte tira la cosa que despierta. Perdición no es sólo un lugar en el mapa —aunque las Minas y el Puerto de Perdición existan y sean bien reales—. Perdición es lo que te pasa cuando te quedás de más.' },
              { p: 'Primero cobra el oro: las zonas hondas son caras de sobrevivir. Después cobra algo peor. Los vigilantes lo dicen simple: “Cada zona más honda cobra un peaje distinto: primero el oro, después el nombre.” Los que se quedan de más no vuelven, o vuelven vacíos, sin acordarse de cómo se llamaban.' },
              { warn: 'Tu tumba es la prueba pequeña de eso: morís lejos y dejás algo tuyo atrás. Perdición es la versión grande, la que no se recupera con una caminata.' },
            ],
          },
          {
            id: 'omens', title: 'Rumores y presagios',
            blocks: [
              { p: 'En Triston, los aldeanos hablan. No todo es cierto, pero nada es del todo mentira:' },
              { list: ['“Dicen que en las minas abandonadas hay algo que no es duende.”', '“Las minas cantan cuando el aire baja. No es el viento.”', '“Un arquero muerto sigue apuntando: no le des la espalda a un esqueleto.”', '“Bajo las viejas ciudades hay más túneles que calles sobre ellas.”', '“Los duendes no cavan por oro: cavan buscando algo que enterraron sus abuelos.”'] },
              { p: 'Y siempre, la misma sombra al fondo de cada historia: algo antiguo que respira en el Laberinto de Hierro, esperando que alguien, por miedo o por codicia, termine de despertarlo.' },
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
              { p: 'Si tu vida llega a cero afuera, caés y dejás una tumba en el lugar exacto. Cae tu BOLSA y una parte del oro; la armadura que llevás puesta y el cinturón NO se pierden. Reapareces en el Obelisco de Retorno de la zona.' },
              { p: 'Al llegarle a la tumba se abre el ataúd: un panel que muestra, en columna, tu armadura, tu cinturón y la bolsa. Con "Retirar todo" recuperás la carga (si la bolsa no entra entera, lo que sobra queda en la tumba).' },
              { p: 'Si morís de nuevo antes de recuperarla, se suma una tumba nueva —y el riesgo crece.' },
              { warn: 'En Triston no te pasa nada: es refugio, y por ahora ningún jugador puede atacarte para robarte. El peligro es sólo afuera. Dejá lo valioso en tu alijo y viajá liviano.' },
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
              { p: 'El cinturón guarda consumibles usables en combate (pociones, pergaminos). Arranca con 2 huecos y se agranda con un ítem de cinturón equipado. En el panel se ve como una grilla 3×3 justo debajo del muñeco de armadura; tocás un slot para usar lo que tenga.' },
              { tip: 'Tocá un ítem para ver su tooltip con stats y la comparación contra lo que tenés puesto (+4 def / −2 des), antes de decidir si lo equipás.' },
            ],
          },
          {
            id: 'stash', title: 'El alijo',
            blocks: [
              { p: 'El alijo es tu cofre personal en Triston: un guardado privado que SÓLO vos ves y abrís. Sirve para dejar ítems que no querés llevar encima —justo lo que no querés perder si morís.' },
              { p: 'Lo encontrás plantado cerca de la plaza. Caminás hasta él y se abre un panel con dos lados: el alijo y tu bolsa. Tocás un ítem de la bolsa para guardarlo, o uno del alijo para retirarlo.' },
              { h: 'Cómo funciona por dentro' },
              { p: 'El alijo es autoritativo del servidor: los ítems guardados viven en el servidor ligados a tu cuenta, no en tu bolsa. Por eso no se pueden duplicar ni perder, y siguen ahí aunque cierres el juego o mueras. Arranca con 20 huecos.' },
              { tip: 'Antes de una salida peligrosa, dejá en el alijo el botín valioso: si caés, tu tumba sólo se lleva lo que tenías en la bolsa.' },
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
          {
            id: 'inspect', title: 'Inspeccionar jugadores y hazañas',
            blocks: [
              { p: 'Tocá a otro jugador para ver su ficha pública: nivel, raza, vida y maná, daño y defensa, el conjunto que lleva equipado, su gremio y sus hazañas. Es una tarjeta de sólo lectura que arma el servidor; no revela inventario ni oro.' },
              { h: 'Hazañas' },
              { p: 'Cada personaje acumula hazañas server-autoritativas: los jefes que derrotó (sobre el total del mundo) y la zona más profunda a la que llegó. Se ven en tu hoja de personaje y en la ficha pública de cualquier jugador, y quedan guardadas entre sesiones.' },
              { p: 'El Salón de la Fama (desde la hoja de personaje) rankea a TODOS los jugadores del mundo por nivel, por jefes derrotados y por zona más profunda. Es el ranking de personas, hermano del ranking de gremios.' },
              { p: 'Correr consume estamina (la barra bajo los globos): sirve para ráfagas cortas, no para cruzar el mundo a la carrera. Se regenera sola al caminar o parar.' },
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
              { p: 'Los sellos son la moneda especial: se gastan en cofres de sello (loot mejor) y en ofrendas.' },
              { h: 'Aventuras (quests narrativas)' },
              { p: 'Aparte de las diarias, ciertos NPCs con nombre te abren aventuras: líneas narrativas que cruzan varias zonas del mundo. Se anotan solas en tu registro; vas cumpliendo etapas (llegar a una zona, encontrar algo, volver con quien te la dio) y al cerrarlas ganás XP, oro y sellos, una sola vez.' },
              { p: 'Son de una sola vez y el servidor valida la recompensa (no se re-reclaman). Hoy hay tres hilos entrelazados que tejen la historia de los Tres y de la Caída — quién los da y adónde llevan, lo descubrís hablando y explorando.' },
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
              { p: 'Un gremio es una estructura persistente con nombre, sigla de tres letras y estandarte, compartida entre todos los que juegan. Fundar, unirse y gestionar se hace sólo con Halvard, el Maestro de Gremios, en la Casa de Gremios.' },
              { list: ['Fundar — cuesta 500 de oro; elegís nombre, sigla (3 letras) y color de estandarte. Quedás como fundador.', 'Unirse — en la pestaña Ranking ves los gremios públicos ordenados por Poder; tocás "Unirme". También te pueden invitar (ver abajo).'] },
              { p: 'Un gremio por cuenta. Podés salir cuando quieras; si eras el último, el gremio se disuelve; si eras el fundador y quedan otros, el liderazgo pasa al miembro más antiguo.' },
              { tip: 'En la hoja de personaje (pestaña de gremio) ves a qué gremio pertenecés, tu rango y el ranking completo sin ir hasta el NPC. Fundar y gestionar siguen siendo sólo con Halvard.' },
            ],
          },
          {
            id: 'guild-roles', title: 'Rangos, invitaciones y chat',
            blocks: [
              { p: 'Dentro del gremio hay tres rangos: fundador, oficial y miembro.' },
              { list: [
                'Invitar — el fundador y los oficiales invitan a jugadores: tocás a un jugador cercano y elegís "Invitar al gremio". Le llega un aviso que acepta o rechaza (caduca a los 2 minutos). No se puede invitar a alguien que ya está en un gremio.',
                'Roles — el fundador asciende miembros a oficial y los desciende. Los oficiales ayudan a invitar y expulsar.',
                'Expulsar — el fundador y los oficiales expulsan miembros; nadie expulsa al fundador y un oficial no expulsa a otro oficial.',
                'Transferir — el fundador puede pasarle el liderazgo a otro miembro.',
                'Privacidad — el fundador marca el gremio como privado (sólo se entra por invitación; desaparece el botón "Unirme" del ranking) o público (ingreso abierto). Las invitaciones funcionan igual en ambos casos.',
              ] },
              { p: 'El gremio tiene su propio canal de chat: los mensajes llegan a todos los miembros conectados, estén donde estén en el mundo. En el roster ves el aporte de cada miembro (oro donado y kills del contrato de la semana).' },
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
                  ['6', '+10% oro de botín'],
                  ['7', 'Recompensa de contrato ×1.5'],
                  ['8', '+10% de XP'],
                  ['9', '+8 defensa a todos'],
                  ['10', 'Recompensa de contrato ×2'],
                ],
              } },
              { p: 'Las ventajas llegan hasta el nivel 10 (prestigio del gremio). El nivel en sí NO tiene tope: pasado el 10, cada 30.000 de oro donado suma un nivel más (prestigio puro, sin ventaja nueva) que sigue pesando en el ranking.' },
            ],
          },
          {
            id: 'guild-contracts', title: 'Contratos semanales',
            blocks: [
              { p: 'Cada semana el gremio recibe un contrato compartido: un objetivo grande (purgar no-muertos, cazar duendes o abatir bestias). Cada miembro que mata enemigos de esa categoría suma al progreso común y visible.' },
              { p: 'Al completarlo, el gremio recibe una recompensa colectiva de oro al pozo, que empuja su nivel. Además, cada miembro que aportó kills esta semana gana sellos, proporcional a su aporte (con piso y techo): colaborar rinde también en lo individual, estés online u offline cuando se complete. El contrato se renueva cada semana (el mismo para todos).' },
            ],
          },
          {
            id: 'guild-ranking', title: 'Ranking y Poder del gremio',
            blocks: [
              { p: 'El ranking público no premia sólo el oro donado: ordena los gremios por su Poder, un puntaje que mezcla el tamaño, la fuerza y la actividad del gremio. Todos sus componentes son SIN TOPE, así que el ranking siempre puede seguir subiendo.' },
              { p: 'El Poder suma cinco cosas, todas server-autoritativas (no se pueden inflar desde el cliente):' },
              { list: [
                'Suma de niveles de personaje (experiencia) de todos los miembros — fuerza colectiva.',
                'Promedio de nivel de los miembros — calidad del roster (no gana sólo el más numeroso).',
                'Cantidad de miembros — tamaño del gremio.',
                'Nivel del gremio — progreso institucional (ya sin tope: sube donando).',
                'Oro donado acumulado al pozo — sin techo.',
              ] },
              { p: 'La fórmula es: Poder = Σniveles×10 + promedio×30 + miembros×10 + nivelGremio×40 + ⌊donado / 500⌋. La suma de niveles ya crece con el tamaño, así que la cantidad de miembros pesa poco (para no premiar el tamaño dos veces) y el promedio pesa fuerte (calidad). En empate, desempata el nivel del gremio y luego la antigüedad.' },
              { p: 'Cada fila del ranking muestra el Poder y su desglose (nivel del gremio, miembros, suma y promedio de nivel, oro donado), tanto en la Casa de Gremios como en la hoja de personaje.' },
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
            id: 'trade', title: 'Comercio entre jugadores',
            blocks: [
              { p: 'El oro y los ítems circulan entre jugadores por dos vías, las dos validadas por el servidor.' },
              { h: 'Intercambio cara a cara' },
              { p: 'Tocá a otro jugador cercano y elegí "Comerciar". Se abre una ventana con tu oferta y la del otro: cada uno pone ítems y oro. Recién se cierra cuando LOS DOS confirman, y el servidor hace el cambio de forma atómica (todo o nada), validando que cada parte tenga lo que ofrece. No hay forma de estafar ni de quedarse con las dos puntas.' },
              { h: 'Mercado de jugadores' },
              { p: 'Desde el mercader entrás al Mercado: publicás un ítem a precio fijo en oro y otro lo compra aunque no estés conectado. Mientras está en venta, el ítem queda en custodia del servidor (no lo tenés en la bolsa). Hay una comisión chica sobre la venta, y los listados vencen solos si nadie los compra (te devuelven el ítem).' },
              { warn: 'Por ahora el mercado es sólo en ORO. El cambio a token llega recién cuando exista $VEL.' },
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
        title: 'History',
        topics: [
          {
            id: 'empyrea', title: 'The Age of Empyrea',
            blocks: [
              { p: 'Before the Fall there was a kingdom: Empyrea, of tall towers and stone roads, lit by three magisteries. The Fire of Vesuvvio warmed the forges and burned what had to burn. The Ice of Scathelocke kept the harvests and the truths. The Wind of Grisbon carried orders from one edge of the realm to the other.' },
              { p: 'Vesuvvio, Scathelocke and Grisbon were not statues: they were the three archmages who held the kingdom up. Their secret work, the one no one sang about in the squares, was another: to keep asleep an ancient, nameless thing, locked in the iron heart of the world, beneath what today they call the Iron Labyrinth.' },
              { p: 'While the Three kept watch, Empyrea prospered. People believed it would last forever. People always do.' },
            ],
          },
          {
            id: 'the-fall', title: 'The Fall',
            blocks: [
              { p: 'No one who saw it lives to tell the whole of it. What is known is this: the seal broke. Some say it was ambition —that one of the Three wanted to use the power they were binding—; others, that it was the carelessness of a generation that stopped believing in the danger. It hardly matters. The binding gave way, and the thing half-woke.' },
              { p: 'There was no army, no battle. There was a slow going-out. The dead stopped resting. Goblins fled the mines toward the surface, more frightened than fierce. The roads filled with things that used to stay underground at night. In a single generation, Empyrea went out like a candle.' },
              { p: 'They call it the Fall. It has no exact date: each town counts it from the day it came for them.' },
            ],
          },
          {
            id: 'guardians', title: 'The Three Guardians',
            blocks: [
              { p: 'When they understood they could no longer fully bind what was waking, the Three made a last decision. They sealed themselves into stone —Fire, Ice, Wind— in the square of the last city, and poured what power they had left into an invisible wall that keeps the outside at bay.' },
              { p: 'The price was to sleep. And something more: so that no one would wake them too soon —nor the thing use them through some fool with good intentions— their true names were hidden, each in the place bound to its element. Vesuvvio\'s, sealed in fire in the Perdition Mines. Scathelocke\'s, in ice, among the ruins of St. Maria. Grisbon\'s, in wind, at Stormrock Pass.' },
              { p: "Today they are three statues watching over Triston's square. An offering of gold wakes a thread of their old power —the buff of the day. Speaking the three names wakes them for real; whether that is salvation or the final mistake, only Udana the Seer dares to suspect." },
              { tip: 'The Three Names quest takes you to those three ruins to recover the names, and back to the Seer. It is the central story of the world, told with your feet.' },
            ],
          },
          {
            id: 'watchers', title: 'The Order of Watchers',
            blocks: [
              { p: "The Guardians' wall protects Triston, but it feeds no one. Someone has to go out: for mastite for the forges, for herbs for the potions, for relics that still work, for word of what is moving out there. Those are the watchers." },
              { p: 'It is not a noble order. They are hunters, drifters and penitents whom the city pays in gold to do what no one else will. Most do not last. The ones who last do not talk much. You are one of them.' },
              { p: '“Hard eyes, watcher. The wilds do not forgive.” —Guard Bram, at the gate.' },
            ],
          },
          {
            id: 'perdition', title: 'Perdition',
            blocks: [
              { p: 'The deeper you go toward the iron heart, the harder the waking thing pulls. Perdition is not only a place on the map —though the Perdition Mines and Harbor exist and are very real. Perdition is what happens to you when you linger.' },
              { p: 'First it takes your gold: the deep zones are expensive to survive. Then it takes something worse. The watchers put it plainly: “Each deeper zone charges a different toll: first your gold, then your name.” Those who linger do not return, or return empty, no longer remembering what they were called.' },
              { warn: 'Your grave is the small proof of it: you die far away and leave something of yours behind. Perdition is the large version, the one a walk cannot undo.' },
            ],
          },
          {
            id: 'omens', title: 'Rumors & omens',
            blocks: [
              { p: 'In Triston, the townsfolk talk. Not all of it is true, but none of it is wholly a lie:' },
              { list: ['“They say there is something in the abandoned mines that is not a goblin.”', '“The mines sing when the air drops. It is not the wind.”', '“A dead archer keeps aiming: never turn your back on a skeleton.”', '“Beneath the old cities there are more tunnels than streets above them.”', "“Goblins don't dig for gold: they dig for what their grandfathers buried.”"] },
              { p: 'And always, the same shadow at the bottom of every story: something ancient breathing in the Iron Labyrinth, waiting for someone, out of fear or greed, to finish waking it.' },
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
              { p: 'If your health hits zero in the wilds, you fall and leave a grave on the exact spot. Your BAG and part of your gold drop; the armor you are wearing and your belt are NOT lost. You respawn at the zone Obelisk of Return.' },
              { p: 'Reach the grave and the coffin opens: a panel showing, in a column, your armor, your belt and the bag. "Take all" recovers the load (if the bag does not fit whole, the rest stays in the grave).' },
              { p: 'If you die again before recovering it, a new grave is added —and the risk grows.' },
              { warn: 'In Triston nothing happens to you: it is a refuge, and for now no player can attack you to rob you. Danger is only outside. Leave your valuables in your stash and travel light.' },
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
              { p: 'The belt holds combat consumables (potions, scrolls). It starts with 2 slots and grows with an equipped belt item. In the panel it shows as a 3×3 grid right below the armor paperdoll; tap a slot to use whatever it holds.' },
              { tip: 'Tap an item to see its tooltip with stats and the comparison against what you have on (+4 def / −2 dex), before deciding to equip it.' },
            ],
          },
          {
            id: 'stash', title: 'The stash',
            blocks: [
              { p: 'The stash is your personal chest in Triston: a private store that ONLY you can see and open. It is for items you do not want to carry —exactly what you do not want to lose if you die.' },
              { p: 'You find it planted near the square. Walk up to it and a panel opens with two sides: the stash and your bag. Tap a bag item to store it, or a stash item to take it back.' },
              { h: 'How it works underneath' },
              { p: 'The stash is server-authoritative: stored items live on the server tied to your account, not in your bag. That is why they cannot be duplicated or lost, and stay there even if you close the game or die. It starts with 20 slots.' },
              { tip: 'Before a dangerous run, leave your valuable loot in the stash: if you fall, your grave only takes what was in your bag.' },
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
          {
            id: 'inspect', title: 'Inspecting players & feats',
            blocks: [
              { p: 'Tap another player to see their public card: level, race, health and mana, damage and defense, the set they have equipped, their guild and their feats. It is a read-only card built by the server; it never reveals inventory or gold.' },
              { h: 'Feats' },
              { p: 'Every character accrues server-authoritative feats: the bosses they have defeated (out of the world total) and the deepest zone they have reached. They show on your character sheet and on any player’s public card, and persist between sessions.' },
              { p: 'The Hall of Fame (from the character sheet) ranks EVERY player in the world by level, by bosses defeated and by deepest zone. It is the ranking of people, the sibling of the guild ranking.' },
              { p: 'Running drains stamina (the bar under the globes): it is for short bursts, not for crossing the world at a sprint. It regenerates on its own while walking or standing still.' },
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
              { p: 'Seals are the special currency: spend them on seal chests (better loot) and on offerings.' },
              { h: 'Adventures (story quests)' },
              { p: 'Apart from the dailies, certain named NPCs open adventures: storylines that cross several zones of the world. They track themselves in your journal; you clear stages (reach a zone, find something, return to whoever gave it) and on completion you earn XP, gold and seals, once.' },
              { p: 'They are one-time and the server validates the reward (no re-claiming). Today there are three intertwined threads weaving the story of the Three and the Fall — who gives them and where they lead, you discover by talking and exploring.' },
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
              { p: 'A guild is a persistent structure with a name, a three-letter tag and a banner, shared across everyone who plays. Founding, joining and managing happen only with Halvard, the Guildmaster, at the Guild Hall.' },
              { list: ['Found — costs 500 gold; you choose a name, tag (3 letters) and banner color. You become the founder.', 'Join — in the Ranking tab you see the public guilds ordered by Power; tap "Join". You can also be invited (see below).'] },
              { p: 'One guild per account. You can leave whenever you want; if you were the last, the guild disbands; if you were the founder and others remain, leadership passes to the oldest member.' },
              { tip: 'Your character sheet (guild tab) shows which guild you belong to, your rank and the full ranking without walking to the NPC. Founding and managing still happen only with Halvard.' },
            ],
          },
          {
            id: 'guild-roles', title: 'Ranks, invites & chat',
            blocks: [
              { p: 'Inside a guild there are three ranks: founder, officer and member.' },
              { list: [
                'Invite — founders and officers invite players: tap a nearby player and pick "Invite to guild". They get a prompt to accept or decline (expires after 2 minutes). You cannot invite someone already in a guild.',
                'Roles — the founder promotes members to officer and demotes them. Officers help invite and kick.',
                'Kick — founders and officers kick members; no one kicks the founder and an officer cannot kick another officer.',
                'Transfer — the founder can hand leadership to another member.',
                'Privacy — the founder sets the guild private (invite only; the "Join" button disappears from the ranking) or open (anyone can join). Invitations work the same either way.',
              ] },
              { p: 'The guild has its own chat channel: messages reach every online member, wherever they are in the world. The roster shows each member’s contribution (gold donated and this week’s contract kills).' },
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
                  ['6', '+10% loot gold'],
                  ['7', 'Contract reward ×1.5'],
                  ['8', '+10% XP'],
                  ['9', '+8 defense for all'],
                  ['10', 'Contract reward ×2'],
                ],
              } },
              { p: 'Perks go up to level 10 (guild prestige). The level itself has NO cap: past 10, every 30,000 donated gold adds another level (pure prestige, no new perk) that keeps weighing on the ranking.' },
            ],
          },
          {
            id: 'guild-contracts', title: 'Weekly contracts',
            blocks: [
              { p: 'Each week the guild receives a shared contract: a big goal (purge undead, hunt goblins or slay beasts). Every member who kills enemies of that category adds to the shared, visible progress.' },
              { p: 'On completion, the guild gets a collective gold reward to its vault, which pushes its level. On top of that, every member who contributed kills this week earns seals, proportional to their part (with a floor and a cap): contributing pays off individually too, whether you are online or offline when it completes. The contract refreshes weekly (the same for everyone).' },
            ],
          },
          {
            id: 'guild-ranking', title: 'Ranking & guild Power',
            blocks: [
              { p: 'The public ranking does not reward donated gold alone: it orders guilds by their Power, a score that blends the guild’s size, strength and activity. Every component is UNCAPPED, so the ranking can always keep climbing.' },
              { p: 'Power adds five things, all server-authoritative (they cannot be faked from the client):' },
              { list: [
                'Sum of the character (experience) levels of every member — collective strength.',
                'Average member level — roster quality (the biggest guild does not simply win).',
                'Member count — guild size.',
                'Guild level — institutional progress (now uncapped: it rises by donating).',
                'Accumulated gold donated to the pool — no ceiling.',
              ] },
              { p: 'The formula is: Power = Σlevels×10 + average×30 + members×10 + guildLevel×40 + ⌊donated / 500⌋. The sum of levels already grows with size, so member count weighs little (to avoid rewarding size twice) and the average weighs heavily (quality). Ties break by guild level, then by age.' },
              { p: 'Each ranking row shows the Power and its breakdown (guild level, members, sum and average level, donated gold), both at the Guild Hall and on the character sheet.' },
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
            id: 'trade', title: 'Player trading',
            blocks: [
              { p: 'Gold and items flow between players two ways, both validated by the server.' },
              { h: 'Face-to-face trade' },
              { p: 'Tap a nearby player and pick "Trade". A window opens with your offer and theirs: each side puts up items and gold. It only closes when BOTH confirm, and the server performs the swap atomically (all or nothing), checking each side owns what it offers. There is no way to scam or to keep both ends.' },
              { h: 'Player market' },
              { p: 'From the merchant you enter the Market: list an item for a fixed gold price and someone can buy it even while you are offline. While it is for sale, the item is held in the server’s custody (not in your bag). There is a small commission on the sale, and listings expire on their own if no one buys them (the item is returned to you).' },
              { warn: 'For now the market is gold-only. The switch to a token comes only once $VEL exists.' },
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
