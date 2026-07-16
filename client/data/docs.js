// Contenido de "Documentación / Docs" (referencia profunda). Bilingüe ES/EN, tono dark-fantasy.
// Sale de docs/WORLD.md, docs/ECONOMY.md, docs/ESCENARIOS.md, characters.js y los sistemas ya
// implementados. Cada categoría: { id, icon, title, blocks[] }. Tipos de bloque:
//   { h }  subtítulo · { p }  párrafo · { list:[...] }  viñetas · { table:{cols,rows} }  tabla.

export const DOCS = {
  es: [
    {
      id: 'world', icon: 'Portal', title: 'El Mundo',
      blocks: [
        { p: 'Empyrea cayó. Los muertos no descansan, los duendes bajaron de las minas y algo antiguo respira en el Laberinto de Hierro.' },
        { p: 'Triston es lo último que queda en pie: la última ciudad con murallas, la fragua encendida y los gremios que todavía mandan gente afuera.' },
        { h: 'El Vigilante' },
        { p: 'Sos un vigilante: alguien a quien la ciudad le paga para salir cuando nadie más quiere. Afuera no perdona, y volver ya es una victoria.' },
        { h: 'Perdición' },
        { p: 'Perdición no es un lugar; es lo que le pasa a quien se queda de más. Cada zona más honda cobra un peaje distinto: primero el oro, después el nombre.' },
        { h: 'Los Tres Guardianes' },
        { p: 'En la plaza de Triston velan tres estatuas —Fuego, Hielo y Viento—. Una ofrenda de oro despierta el buff del día. La competencia por su favor es vieja como la ciudad.' },
      ],
    },
    {
      id: 'races', icon: 'Shield', title: 'Razas',
      blocks: [
        { p: 'Cuatro pueblos siguen mandando vigilantes afuera. Cada uno pelea distinto; elegí el tuyo al crear el personaje.' },
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
      id: 'realms', icon: 'Boots', title: 'Escenarios',
      blocks: [
        { p: 'El mundo se recorre por realms colgados de Triston por portales. Cada realm tiene un propósito y un rango de nivel.' },
        { h: 'Las seis acciones' },
        { p: 'Todo lo que hacés sube una de seis acciones (cap nivel 20). Subir una abre nodos, recetas y equipo mejor.' },
        { list: ['Combate — matar enemigos', 'Excavación — picar vetas de mastite', 'Herboristería — juntar reactivos', 'Alquimia — pociones (en el Hub)', 'Forja — equipo (en el Hub)', 'Saqueo — abrir cofres y reliquias'] },
        { h: 'Realms de arranque' },
        { table: {
          cols: ['Realm', 'Bioma', 'Nivel', 'Foco'],
          rows: [
            ['Triston', 'ciudad', '—', 'Hub seguro: Fragua, Alquimia, Gremios'],
            ['Granja de Black Oak', 'pradera', '1–3', 'Herboristería + primeros duendes'],
            ['Sendero del Río', 'pradera', '3–5', 'Hierbas junto al agua'],
            ['Campo Salado', 'pradera', '4–6', 'Combate no-muertos + saqueo'],
            ['Cueva de Duendes', 'cueva', '5–8', 'Combate + primeras vetas'],
          ],
        } },
        { p: 'Más allá del arranque hay decenas de zonas encadenadas (minas, criptas, torres, el Laberinto de Hierro) que se van sumando a medida que el mundo crece.' },
      ],
    },
    {
      id: 'systems', icon: 'Gem', title: 'Sistemas',
      blocks: [
        { h: 'Atributos' },
        { p: 'FUE (fuerza), DES (destreza), INT (inteligencia) y VIT (vitalidad). Al subir de nivel repartís puntos y cambiás cómo pega y aguanta tu personaje.' },
        { h: 'Árbol de habilidades' },
        { p: 'Tres ramas gateadas por un atributo: Guerrero (FUE), Cazador (DES) y Mago (INT). Nodos pasivos que suben stats, y una habilidad activa por vía para el botón M2.' },
        { h: 'Gremios' },
        { p: 'Fundás por 500 de oro (sigla de 3 letras + estandarte) o te unís desde el ranking. Donás oro para subir el nivel del gremio y dar ventajas a todos: +oro de botín, +defensa, +XP, el Depósito compartido (nivel 4) y el estandarte (nivel 5). Cada semana hay un contrato compartido.' },
        { h: 'Misiones diarias' },
        { p: 'Tres misiones por día (se renuevan a medianoche del servidor). Dan XP, oro y sellos —una moneda para cofres de sello y ofrendas.' },
      ],
    },
    {
      id: 'economy', icon: 'Coin', title: 'Economía',
      blocks: [
        { p: 'Ganás oro peleando, juntando, con las misiones diarias y abriendo cofres. El oro compra reparaciones, forja, pociones y stock del mercader.' },
        { h: '$VEL' },
        { p: 'A futuro el oro se cambiará por $VEL, el token del juego, en un marketplace: jugás, ganás oro, lo vendés por token, retirás. Por ahora el token no existe: la prioridad es que el mundo esté vivo.' },
        { h: 'El sumidero' },
        { p: 'La economía necesita drenajes tanto como fuentes: morir deja tu carga (y parte del oro) en una tumba, la reparación cuesta, y las ofrendas a los Guardianes queman oro por un buff. Así el oro no se infla.' },
        { h: 'Sellos' },
        { p: 'Los fragmentos de sello salen de las dailies y las ofrendas. Son la moneda “premium” para cofres de sello (loot mejor) sin tocar el token.' },
      ],
    },
    {
      id: 'roadmap', icon: 'Loop', title: 'Roadmap',
      blocks: [
        { h: 'Andando' },
        { list: ['Mundo isométrico recorrible (portales estilo Diablo)', 'Combate autoritativo, enemigos, jefes de contrato', 'Ítems, inventario, equipo (2 anillos), forja y alquimia', 'Progresión: niveles, atributos, árbol, misiones diarias', 'Gremios: fundar, donar, contratos, depósito', 'Multijugador: mundo compartido, co-op, chat, reconexión', 'Persistencia en PostgreSQL'] },
        { h: 'Viene' },
        { list: ['Documentación y guía (esto)', 'Marketplace P2P y el token $VEL', 'Más realms curados hacia el endgame', 'Estandartes de gremio visibles y pool colaborativo', 'PvP / Arena (después de que el loop se sienta bien)'] },
      ],
    },
  ],
  en: [
    {
      id: 'world', icon: 'Portal', title: 'The World',
      blocks: [
        { p: 'Empyrea fell. The dead do not rest, goblins came down from the mines, and something ancient breathes in the Iron Labyrinth.' },
        { p: 'Triston is the last thing standing: the last walled city, its forge lit and its guilds still sending people out.' },
        { h: 'The Watcher' },
        { p: 'You are a watcher: someone the city pays to go out when no one else will. The wilds do not forgive, and coming back is already a win.' },
        { h: 'Perdition' },
        { p: 'Perdition is not a place; it is what happens to those who linger. Each deeper zone charges a different toll: first your gold, then your name.' },
        { h: 'The Three Guardians' },
        { p: "In Triston's square three statues keep watch —Fire, Ice and Wind. An offering of gold wakes the buff of the day. The rivalry for their favor is as old as the city." },
      ],
    },
    {
      id: 'races', icon: 'Shield', title: 'Races',
      blocks: [
        { p: 'Four peoples still send watchers out. Each fights differently; choose yours when you create your character.' },
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
      id: 'realms', icon: 'Boots', title: 'Realms',
      blocks: [
        { p: 'The world is traveled through realms hung off Triston by portals. Each realm has a purpose and a level range.' },
        { h: 'The six actions' },
        { p: 'Everything you do levels one of six actions (cap level 20). Leveling one unlocks nodes, recipes and better gear.' },
        { list: ['Combat — kill enemies', 'Digging — mine mastite veins', 'Herbalism — gather reagents', 'Alchemy — potions (in the Hub)', 'Smithing — gear (in the Hub)', 'Looting — open chests and relics'] },
        { h: 'Starter realms' },
        { table: {
          cols: ['Realm', 'Biome', 'Level', 'Focus'],
          rows: [
            ['Triston', 'city', '—', 'Safe hub: Forge, Alchemy, Guilds'],
            ['Black Oak Farm', 'grassland', '1–3', 'Herbalism + first goblins'],
            ['River Trail', 'grassland', '3–5', 'Herbs by the water'],
            ['Salted Field', 'grassland', '4–6', 'Undead combat + looting'],
            ['Goblin Cave', 'cave', '5–8', 'Combat + first veins'],
          ],
        } },
        { p: 'Beyond the start there are dozens of chained zones (mines, crypts, towers, the Iron Labyrinth) added as the world grows.' },
      ],
    },
    {
      id: 'systems', icon: 'Gem', title: 'Systems',
      blocks: [
        { h: 'Attributes' },
        { p: 'STR (strength), DEX (dexterity), INT (intelligence) and VIT (vitality). On level-up you spend points and change how your character hits and endures.' },
        { h: 'Skill tree' },
        { p: 'Three branches gated by an attribute: Warrior (STR), Hunter (DEX) and Mage (INT). Passive nodes that raise stats, plus one active ability per path for the M2 button.' },
        { h: 'Guilds' },
        { p: 'Found one for 500 gold (a 3-letter tag + banner) or join from the ranking. Donate gold to raise the guild level and grant perks to everyone: +loot gold, +defense, +XP, the shared Deposit (level 4) and the banner (level 5). Each week there is a shared contract.' },
        { h: 'Daily quests' },
        { p: 'Three quests per day (they refresh at server midnight). They grant XP, gold and seals —a currency for seal chests and offerings.' },
      ],
    },
    {
      id: 'economy', icon: 'Coin', title: 'Economy',
      blocks: [
        { p: 'You earn gold by fighting, gathering, from daily quests and opening chests. Gold buys repairs, smithing, potions and merchant stock.' },
        { h: '$VEL' },
        { p: 'In time gold will trade for $VEL, the game token, in a marketplace: play, earn gold, sell it for the token, cash out. For now the token does not exist: the priority is a living world.' },
        { h: 'The sink' },
        { p: 'An economy needs drains as much as sources: dying leaves your load (and some gold) in a grave, repairs cost, and offerings to the Guardians burn gold for a buff. That way gold does not inflate.' },
        { h: 'Seals' },
        { p: 'Seal fragments come from dailies and offerings. They are the “premium” currency for seal chests (better loot) without touching the token.' },
      ],
    },
    {
      id: 'roadmap', icon: 'Loop', title: 'Roadmap',
      blocks: [
        { h: 'Live' },
        { list: ['Explorable isometric world (Diablo-style portals)', 'Authoritative combat, enemies, contract bosses', 'Items, inventory, gear (2 rings), smithing and alchemy', 'Progression: levels, attributes, skill tree, daily quests', 'Guilds: found, donate, contracts, deposit', 'Multiplayer: shared world, co-op, chat, reconnection', 'PostgreSQL persistence'] },
        { h: 'Coming' },
        { list: ['Documentation and guide (this)', 'P2P marketplace and the $VEL token', 'More curated realms toward the endgame', 'Visible guild banners and a collaborative pool', 'PvP / Arena (after the loop feels good)'] },
      ],
    },
  ],
}
