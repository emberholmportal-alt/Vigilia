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
        'M1 es tu golpe normal (usa tu arma); M2 es tu habilidad especial, y elegís cuál va ahí. El servidor decide el daño: nadie hace trampa.',
      ],
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
        'Si caés afuera, tu carga queda en una tumba en el lugar exacto. Volvé a buscarla… si podés.',
        'Morir otra vez antes de recuperarla suma una tumba nueva. Triston es refugio: adentro no te pasa nada.',
      ],
    },
    {
      icon: 'Shield', title: 'Gremios',
      body: [
        'Hablá con Halvard para fundar un gremio (500 de oro, una sigla de tres letras) o unirte a uno del ranking.',
        'Donás oro para subir su nivel y darle ventajas a todos los miembros. Cada semana hay un contrato compartido, y a nivel 4 se abre el Depósito común.',
      ],
    },
    {
      icon: 'Coin', title: 'La economía',
      body: [
        'Ganás oro peleando, juntando y con las misiones diarias, que además dan sellos.',
        'Con el tiempo el oro se cambiará por $VEL, el token del juego. Por ahora el token no existe: primero, que el mundo esté vivo.',
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
        'M1 is your normal strike (uses your weapon); M2 is your special ability, and you choose which one goes there. The server decides the damage: no one cheats.',
      ],
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
        'If you fall out in the wilds, your load stays in a grave on the exact spot. Go back for it… if you can.',
        'Dying again before you recover it leaves a new grave. Triston is a refuge: inside, nothing touches you.',
      ],
    },
    {
      icon: 'Shield', title: 'Guilds',
      body: [
        'Talk to Halvard to found a guild (500 gold, a three-letter tag) or join one from the ranking.',
        'Donate gold to raise its level and grant perks to every member. Each week there is a shared contract, and at level 4 the shared Deposit opens.',
      ],
    },
    {
      icon: 'Coin', title: 'The economy',
      body: [
        'You earn gold by fighting, gathering and from daily quests, which also grant seals.',
        'In time gold will trade for $VEL, the game token. For now the token does not exist: first, the world must be alive.',
      ],
    },
  ],
}
