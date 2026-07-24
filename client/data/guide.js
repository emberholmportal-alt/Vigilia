// Contenido de "Cómo Jugar" (onboarding). Bilingüe ES/EN, tono dark-fantasy de Velgrim.
// Sale de docs/WORLD.md, docs/ECONOMY.md y docs/ESCENARIOS.md. Cada sección: { icon, title, body[] }.
// El icon es un nombre exportado por client/ui/Icon.jsx.

export const HOW_TO_PLAY = {
  es: [
    {
      icon: 'Portal', title: 'Despertás en Triston',
      body: [
        'El mundo te olvidó, pero Triston sigue en pie: la última ciudad con murallas, la fragua encendida y gremios que todavía mandan gente afuera.',
        'Conectás tu billetera, elegís tu raza y tu nombre, y aparecés en la plaza. Desde acá sale todo.',
      ],
    },
    {
      icon: 'Sword', title: 'Moverte y pelear',
      body: [
        'Tocá el suelo para caminar; tocá un enemigo para atacarlo.',
        'Tocá el botón de correr (o mantené Shift en la compu) para ir más rápido: gastás estamina y se recarga sola cuando aflojás.',
        'M1 es tu golpe normal (usa tu arma); M2 es tu habilidad especial, y elegís cuál va ahí. El servidor decide el daño: nadie hace trampa.',
      ],
      tip: 'Sin arma peleás a puños y hacés poco daño: equipate algo antes de salir.',
    },
    {
      icon: 'Fist', title: 'Las seis acciones',
      body: [
        'Todo lo que hacés sube una de seis acciones, cada una hasta nivel 20:',
        'Combate · Excavación · Herboristería · Alquimia · Forja · Saqueo.',
        'Subir una abre nodos, recetas y equipo mejor.',
      ],
    },
    {
      icon: 'Loop', title: 'El ciclo',
      body: [
        'Salís de la ciudad, matás, juntás recursos y saqueás cofres.',
        'Volvés, forjás tu equipo en la Fragua y preparás pociones en la Mesa de Alquimia. Con mejor equipo, más hondo llegás.',
      ],
    },
    {
      icon: 'Boots', title: 'Viajar',
      body: [
        'Los dos arcos de Triston llevan a la Granja de Black Oak (recolección) y a la Cueva de Duendes (combate).',
        'Pisás un portal y esa zona entra a tu red de waypoints: desde ahí saltás a donde ya estuviste. La Piedra de Retorno te trae a casa desde cualquier lado.',
      ],
    },
    {
      icon: 'Grave', title: 'La muerte tiene precio',
      body: [
        'Si caés afuera, tu carga cae en una tumba en el lugar exacto: la bolsa y una parte del oro. La armadura que llevás puesta y el cinturón NO se pierden.',
        'Al llegarle a la tumba se abre el ataúd: ahí ves tu armadura, tu cinturón y la bolsa, y con "Retirar todo" recuperás la carga. Morir otra vez antes de volver suma una tumba nueva.',
        'Triston es refugio: adentro no te pasa nada, y por ahora ningún jugador puede atacarte para robarte.',
      ],
      warn: 'Viajá liviano a las zonas duras: lo que llevás en la bolsa es lo que podés perder. Dejá lo que no necesites en tu alijo.',
    },
    {
      icon: 'Stash', title: 'Tu alijo',
      body: [
        'En Triston tenés un cofre personal: tu alijo. Solamente vos lo ves y lo abrís, para dejar guardado lo que no querés cargar.',
        'Lo encontrás cerca de la plaza. Le caminás encima y se abre: tocás un ítem de tu bolsa para guardarlo, o uno del alijo para retirarlo. Lo guardado está a salvo aunque mueras.',
        'También tenés una bóveda de oro: depositás y retirás cuando quieras. Y guardás cualquier poción —vida, maná y las demás— para no cargarlas encima.',
      ],
      tip: 'Antes de salir a pelear, dejá en el alijo el botín valioso y el oro que no vas a usar: si caés, no lo perdés.',
    },
    {
      icon: 'Swap', title: 'Comerciar y el mercado',
      body: [
        'Tocá a otro jugador cercano y elegí "Comerciar": se abre un intercambio cara a cara. Cada uno pone ítems y oro, y recién se cierra cuando los dos confirman. El servidor hace el cambio de una sola vez: no hay estafas.',
        'En el mercader también entrás al Mercado de jugadores: publicás un ítem a precio fijo en oro y otro lo compra aunque no estés conectado. El ítem queda en custodia del servidor mientras está en venta.',
      ],
    },
    {
      icon: 'Shield', title: 'Gremios',
      body: [
        'Hablá con Halvard, el Maestro de Gremios, para fundar uno (500 de oro, una sigla de tres letras) o unirte a otro. Fundar y gestionar se hace sólo con él.',
        'Hay tres rangos: fundador, oficial y miembro. El fundador y los oficiales invitan (tocá a un jugador cercano y elegí "Invitar al gremio"), expulsan, y el fundador asciende oficiales o transfiere el liderazgo. El gremio tiene su propio canal de chat.',
        'Donás oro al pozo para subir el nivel del gremio y darle ventajas a todos: más oro de botín, defensa, XP compartida, el Depósito común a nivel 4 y el estandarte a nivel 5. Del 6 al 10 hay ventajas de prestigio (más oro y XP, contrato reforzado); pasado el 10 el nivel sigue subiendo (pesa en el ranking). Cada semana hay un contrato compartido.',
        'El ranking ordena por el Poder del gremio, que suma cinco cosas sin tope: los niveles de todos los miembros, su promedio de nivel, la cantidad de miembros, el nivel del gremio y el oro donado al pozo. El promedio premia la calidad del roster, así que no gana sólo el más numeroso.',
      ],
      tip: 'En la hoja de personaje ves a qué gremio pertenecés y el ranking completo, sin salir del pueblo.',
    },
    {
      icon: 'Coin', title: 'La economía',
      body: [
        'Ganás oro peleando, juntando y con las misiones diarias, que además dan sellos. Todo el oro, el loot y las ventas los valida el servidor: nadie fabrica oro de la nada.',
        'Entre jugadores el oro circula por el comercio y el mercado.',
        'Cuando exista $VEL, el token del juego, vas a poder cambiar oro por $VEL con otros jugadores: publicás oro pidiendo $VEL y quien compra te lo paga directo a tu billetera (el juego nunca toca tu token; el pago se firma en tu wallet). Por ahora el token no existe: primero, que el mundo esté vivo.',
      ],
    },
  ],
  en: [
    {
      icon: 'Portal', title: 'You wake in Triston',
      body: [
        'The world forgot you, but Triston still stands: the last walled city, its forge lit and its guilds still sending people out.',
        'Connect your wallet, choose your race and name, and appear in the square. Everything starts here.',
      ],
    },
    {
      icon: 'Sword', title: 'Move and fight',
      body: [
        'Tap the ground to walk; tap an enemy to attack it.',
        'Tap the run button (or hold Shift on desktop) to move faster: it drains stamina, which refills on its own when you ease off.',
        'M1 is your normal strike (uses your weapon); M2 is your special ability, and you choose which one goes there. The server decides the damage: no one cheats.',
      ],
      tip: 'Without a weapon you fight with fists and do little damage: equip something before heading out.',
    },
    {
      icon: 'Fist', title: 'The six actions',
      body: [
        'Everything you do levels one of six actions, each up to level 20:',
        'Combat · Digging · Herbalism · Alchemy · Smithing · Looting.',
        'Leveling one unlocks nodes, recipes and better gear.',
      ],
    },
    {
      icon: 'Loop', title: 'The loop',
      body: [
        'Leave town, kill, gather resources and loot chests.',
        'Come back, forge your gear at the Forge and brew potions at the Alchemy Table. Better gear takes you deeper.',
      ],
    },
    {
      icon: 'Boots', title: 'Travel',
      body: [
        "Triston's two arches lead to Black Oak Farm (gathering) and the Goblin Cave (combat).",
        'Step on a portal and that zone joins your waypoint network: from there you jump to anywhere you have been. The Return Stone brings you home from anywhere.',
      ],
    },
    {
      icon: 'Grave', title: 'Death has a price',
      body: [
        'If you fall out in the wilds, your load drops into a grave on the exact spot: your bag and part of your gold. The armor you are wearing and your belt are NOT lost.',
        'Reach the grave and the coffin opens: there you see your armor, your belt and your bag, and "Take all" recovers the load. Dying again before you return leaves a new grave.',
        'Triston is a refuge: inside, nothing touches you, and for now no player can attack you to rob you.',
      ],
      warn: 'Travel light to the hard zones: what you carry in your bag is what you can lose. Leave what you do not need in your stash.',
    },
    {
      icon: 'Stash', title: 'Your stash',
      body: [
        'In Triston you have a personal chest: your stash. Only you can see and open it, to store what you do not want to carry.',
        'You find it near the square. Walk onto it and it opens: tap a bag item to store it, or a stash item to take it back. What is stored is safe even if you die.',
        'It also holds a gold vault: deposit and withdraw whenever you like. And you can stash any potion —health, mana and the rest— so you do not have to carry them.',
      ],
      tip: 'Before heading out to fight, leave your valuable loot and spare gold in the stash: if you fall, you keep it.',
    },
    {
      icon: 'Swap', title: 'Trading and the market',
      body: [
        'Tap a nearby player and pick "Trade": a face-to-face exchange opens. Each side puts up items and gold, and it only closes once both confirm. The server swaps it all at once: no scams.',
        'At the merchant you also enter the Player Market: list an item for a fixed gold price and someone can buy it even while you are offline. The item stays in the server’s custody while it is for sale.',
      ],
    },
    {
      icon: 'Shield', title: 'Guilds',
      body: [
        'Talk to Halvard, the Guildmaster, to found one (500 gold, a three-letter tag) or join another. Founding and managing happen only with him.',
        'There are three ranks: founder, officer and member. Founders and officers invite (tap a nearby player and pick "Invite to guild"), kick, and the founder promotes officers or transfers leadership. The guild has its own chat channel.',
        'Donate gold to the pool to raise the guild level and grant perks to everyone: more loot gold, defense, shared XP, the shared Deposit at level 4 and the banner at level 5. Levels 6 to 10 give prestige perks (more gold and XP, a reinforced contract); past 10 the level keeps climbing (it weighs on the ranking). Each week there is a shared contract.',
        'The ranking is ordered by the guild Power, which adds five uncapped things: the levels of all members, their average level, the member count, the guild level, and the gold donated to the pool. The average rewards roster quality, so the biggest guild does not simply win.',
      ],
      tip: 'Your character sheet shows which guild you belong to and the full ranking, without leaving town.',
    },
    {
      icon: 'Coin', title: 'The economy',
      body: [
        'You earn gold by fighting, gathering and from daily quests, which also grant seals. All gold, loot and sales are validated by the server: no one mints gold from nothing.',
        'Between players, gold flows through trading and the market.',
        'Once $VEL, the game token, exists you will be able to trade gold for $VEL with other players: list gold asking for $VEL, and whoever buys pays you straight to your wallet (the game never touches your token; the payment is signed in your wallet). For now the token does not exist: first, the world must be alive.',
      ],
    },
  ],
}
