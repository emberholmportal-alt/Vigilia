// i18n: español (por defecto) / inglés. El idioma vive en el store (reactivo en React) y
// también en un módulo local `_lang` para que el motor y el store lean sin ciclo de imports.
// Los componentes usan el hook useT (ui/useT.js); el motor/store usan tt().

let _lang = 'es'
export const getLang = () => _lang
export function setLangGlobal(l) { _lang = l === 'en' ? 'en' : 'es' }

// Diccionario de strings de UI. clave -> { es, en }. Interpolación con {var}.
const DICT = {
  // menús / barra
  character: { es: 'Personaje', en: 'Character' },
  inventory: { es: 'Inventario', en: 'Inventory' },
  powers: { es: 'Acciones', en: 'Actions' },
  settings: { es: 'Ajustes', en: 'Settings' },
  gold: { es: 'oro', en: 'gold' },
  gold_word: { es: 'Oro', en: 'Gold' },
  buy: { es: 'Comprar', en: 'Buy' },
  sell: { es: 'Vender', en: 'Sell' },
  sold_out: { es: 'Agotado', en: 'Sold out' },
  sold_today: { es: 'Agotado hoy', en: 'Sold out today' },
  in_stock: { es: 'En stock: {n}', en: 'In stock: {n}' },
  no_gold: { es: 'Sin oro', en: 'No gold' },
  equip: { es: 'Equipar', en: 'Equip' },
  unequip: { es: 'Sacar', en: 'Unequip' },
  to_belt: { es: 'Al cinturón', en: 'To belt' },
  use_item: { es: 'Usar', en: 'Use' },
  gather_action: { es: 'Recolectar {name}', en: 'Gather {name}' },
  equip_belt: { es: 'Equipar cinturón', en: 'Equip belt' },
  bigger_belt: { es: 'Comprá un cinturón más grande', en: 'Buy a bigger belt' },
  view_character: { es: 'Ver personaje', en: 'View character' },
  talk: { es: 'Hablar', en: 'Talk' },
  say_something: { es: 'Decir algo…', en: 'Say something…' },
  // configuración
  config: { es: 'Configuración', en: 'Settings' },
  sound: { es: 'Sonido', en: 'Sound' },
  language: { es: 'Idioma', en: 'Language' },
  sound_on: { es: '🔊 Activado', en: '🔊 On' },
  sound_off: { es: '🔇 Silenciado', en: '🔇 Muted' },
  // inventario / tooltip
  level_n: { es: 'Nivel {n}', en: 'Level {n}' },
  spaces: { es: 'Espacios', en: 'Slots' },
  durability: { es: 'Durabilidad', en: 'Durability' },
  broken: { es: 'ROTO', en: 'BROKEN' },
  locked_hint: { es: 'Se desbloquea al subir de nivel', en: 'Unlocks as you level up' },
  // personaje
  char_title: { es: 'Personaje', en: 'Character' },
  stat_hp: { es: 'Vida', en: 'Health' },
  stat_mp: { es: 'Maná', en: 'Mana' },
  stat_dmg: { es: 'Daño', en: 'Damage' },
  stat_def: { es: 'Defensa', en: 'Defense' },
  stat_crit: { es: 'Crítico', en: 'Crit' },
  stat_hpregen: { es: 'Regen. vida', en: 'HP regen' },
  stat_speed: { es: 'Velocidad', en: 'Speed' },
  stat_xpbonus: { es: 'Bonus XP', en: 'XP bonus' },
  // herrero
  smith_empty: { es: 'No tenés equipo que reparar.', en: 'Nothing to repair.' },
  smith_perfect: { es: 'Equipo impecable', en: 'Gear is pristine' },
  smith_nogold: { es: 'Sin oro ({n})', en: 'Not enough gold ({n})' },
  smith_repair: { es: 'Reparar todo — {n} oro', en: 'Repair all — {n} gold' },
  // alquimia
  alch_hint: { es: 'Juntá hierbas y cristales en el mundo; acá los volvés pociones.', en: 'Gather herbs and crystals out in the world; here you turn them into potions.' },
  alch_craft: { es: 'Preparar', en: 'Brew' },
  alch_lack: { es: 'Faltan', en: 'Missing' },
  // chat
  chan_sistema: { es: 'Sistema', en: 'System' },
  chan_mundo: { es: 'Mundo', en: 'World' },
  // inicio
  start_tag: { es: 'Black Oak City es lo último que queda en pie.', en: 'Black Oak City is the last thing left standing.' },
  start_new: { es: 'Nueva partida', en: 'New game' },
  start_begin: { es: 'Comenzar', en: 'Begin' },
  start_continue: { es: 'Continuar', en: 'Continue' },
  loading: { es: 'Cargando…', en: 'Loading…' },
  credits: { es: 'Flare — Empyrean Campaign', en: 'Flare — Empyrean Campaign' },
  race_title: { es: 'Elegí tu sangre', en: 'Choose your blood' },
  your_name: { es: 'Tu nombre', en: 'Your name' },
  incarnate: { es: 'Encarnar {race}', en: 'Incarnate {race}' },
  loading_city: { es: 'Cargando Black Oak City…', en: 'Loading Black Oak City…' },
  // viaje
  traveling_to: { es: 'Viajando a', en: 'Traveling to' },
  travel_label: { es: 'Viajar: {zone}', en: 'Travel: {zone}' },
  portal_use: { es: 'Usar portal', en: 'Use portal' },
  waypoint_found: { es: 'Nuevo destino: {zone}', en: 'New destination: {zone}' },
  waypoints_title: { es: 'Red de portales', en: 'Portal network' },
  waypoints_hint: { es: 'Elegí un destino descubierto.', en: 'Pick a discovered destination.' },
  wp_here: { es: 'Estás acá', en: 'You are here' },
  wp_adjacent: { es: 'Adyacente', en: 'Adjacent' },
  wp_none: { es: 'Todavía no descubriste otros destinos. Caminá sobre los portales para activarlos.', en: 'You have not discovered other destinations yet. Walk over portals to activate them.' },
  // misiones diarias
  missions_menu: { es: 'Misiones', en: 'Missions' },
  missions_title: { es: 'Misiones diarias', en: 'Daily missions' },
  missions_hint: { es: 'Se renuevan cada día.', en: 'They refresh each day.' },
  mission_kill: { es: 'Matá {n} enemigos', en: 'Slay {n} enemies' },
  mission_mine: { es: 'Extraé {n} cristales', en: 'Mine {n} crystals' },
  mission_herb: { es: 'Juntá {n} hierbas', en: 'Gather {n} herbs' },
  mission_chest: { es: 'Abrí {n} cofres', en: 'Open {n} chests' },
  mission_contract: { es: 'Vencé al élite del día', en: "Defeat the day's elite" },
  mission_offering: { es: 'Entregá {n} oro a un Guardián', en: 'Offer {n} gold to a Guardian' },
  mission_in: { es: 'en {zone}', en: 'in {zone}' },
  mission_reward_line: { es: '+{xp} XP · +{gold} oro · +{seals} sellos', en: '+{xp} XP · +{gold} gold · +{seals} seals' },
  mission_done: { es: '¡Misión completa!', en: 'Mission complete!' },
  mission_reward: { es: 'Recompensa: +{xp} XP, +{gold} oro, +{seals} sellos', en: 'Reward: +{xp} XP, +{gold} gold, +{seals} seals' },
  // sellos / cofre / ofrenda / guardián
  seals_word: { es: 'Sellos', en: 'Seals' },
  seal_need: { es: 'Te faltan sellos ({n})', en: 'You lack seals ({n})' },
  seal_chest: { es: 'Cofre de sellos', en: 'Seal chest' },
  seal_chest_open: { es: 'Abrir cofre — {n} sellos', en: 'Open chest — {n} seals' },
  seal_chest_empty: { es: 'El cofre estaba vacío...', en: 'The chest was empty...' },
  seal_chest_got: { es: 'Del cofre: {items}', en: 'From the chest: {items}' },
  contract_appeared: { es: '¡El élite del día apareció en esta zona!', en: "The day's elite has appeared in this zone!" },
  offering_need: { es: 'Necesitás {n} oro para la ofrenda', en: 'You need {n} gold for the offering' },
  offering_done: { es: 'El Guardián acepta tu ofrenda', en: 'The Guardian accepts your offering' },
  offering_sleep_name: { es: 'Guardián', en: 'Guardian' },
  offering_sleep_l1: { es: 'La estatua te observa en silencio.', en: 'The statue watches you in silence.' },
  offering_sleep_l2: { es: 'Cuando el día pida una ofrenda, traé el oro y yo la recibiré.', en: 'When the day calls for an offering, bring the gold and I will receive it.' },
  mission_claim: { es: 'Reclamar', en: 'Claim' },
  mission_claimed: { es: 'Reclamada', en: 'Claimed' },
  // forja (herrero)
  repair_tab: { es: 'Reparar', en: 'Repair' },
  forge_tab: { es: 'Forjar', en: 'Forge' },
  forge_hint: { es: 'Mejorá el equipo con cristales de las minas.', en: 'Upgrade gear with crystals from the mines.' },
  forge_upgrade: { es: 'Mejorar', en: 'Upgrade' },
  forge_maxed: { es: 'Al máximo', en: 'Maxed' },
  forge_cost: { es: '{c} cristales · {g} oro', en: '{c} crystals · {g} gold' },
  forge_max: { es: 'Esta pieza ya está al máximo', en: 'This piece is already maxed out' },
  forge_need_crystals: { es: 'Te faltan cristales ({n})', en: 'You lack crystals ({n})' },
  forge_need_gold: { es: 'No te alcanza el oro ({n})', en: "You can't afford it ({n})" },
  forge_done: { es: '{name} mejorada a +{n}', en: '{name} upgraded to +{n}' },
  forge_none: { es: 'No tenés equipo para forjar.', en: 'No gear to forge.' },
  affinity: { es: 'Afinidad: {race}', en: 'Affinity: {race}' },
  race_humano: { es: 'Humano', en: 'Human' }, race_elfo: { es: 'Elfo', en: 'Elf' },
  race_enano: { es: 'Enano', en: 'Dwarf' }, race_orco: { es: 'Orco', en: 'Orc' },
  trade_with: { es: 'Comerciar con {name}', en: 'Trade with {name}' },
  talk_with: { es: 'Hablar con {name}', en: 'Talk with {name}' },
  // toasts / motor
  zone_unavailable: { es: 'Esa zona todavía no está disponible', en: "That zone isn't available yet" },
  already_in_town: { es: 'Ya estás en el pueblo', en: "You're already in town" },
  stone_pulls: { es: 'El pergamino te arranca del mundo...', en: 'The scroll tears you from the world...' },
  obelisk_opens: { es: 'El obelisco se abre hacia {zone}', en: 'The obelisk opens toward {zone}' },
  revive_town: { es: 'Despertás a salvo en Triston...', en: 'You wake up safe in Triston...' },
  fell_combat: { es: 'Caíste en combate...', en: 'You fell in battle...' },
  grave_left: { es: 'Tu carga quedó en una tumba en {zone}. Volvé por ella.', en: 'Your load stayed in a grave in {zone}. Go back for it.' },
  grave_recovered: { es: 'Recuperaste tu tumba', en: 'You recovered your grave' },
  grave_full: { es: 'Inventario lleno: la tumba guarda lo que no entró', en: "Inventory full: the grave keeps what didn't fit" },
  inv_full: { es: 'Inventario lleno', en: 'Inventory full' },
  gathered: { es: 'Juntaste {name} ×{n}', en: 'Gathered {name} ×{n}' },
  arrived_at: { es: 'Llegaste a {zone}', en: 'You reached {zone}' },
  defeated: { es: 'Derrotaste a {name}', en: 'You defeated {name}' },
  brewed: { es: 'Preparaste: {name}', en: 'Brewed: {name}' },
  alchemy_log: { es: 'Alquimia: preparaste {name}', en: 'Alchemy: you brewed {name}' },
  need_materials: { es: 'Te faltan materiales', en: 'You lack materials' },
  corpse_empty: { es: 'Cadáver vacío', en: 'Empty corpse' },
  inspect_corpse: { es: 'Inspeccionás el cadáver de {name} (Nv {lv}). No queda nada de valor.', en: 'You inspect the corpse of {name} (Lv {lv}). Nothing of value remains.' },
  belt_full: { es: 'El cinturón está lleno', en: 'The belt is full' },
  belt_only: { es: 'Sólo consumibles van al cinturón', en: 'Only consumables go in the belt' },
  hp_full: { es: 'Tu vida ya está al máximo', en: 'Your health is already full' },
  mp_full: { es: 'Tu maná ya está al máximo', en: 'Your mana is already full' },
  hp_gain: { es: '+{n} de vida', en: '+{n} health' },
  mp_gain: { es: '+{n} de maná', en: '+{n} mana' },
  cant_use: { es: 'No podés usar esto todavía', en: "You can't use this yet" },
  level_up: { es: '¡Nivel {n}!', en: 'Level {n}!' },
  levelup_toast: { es: '¡Subiste a nivel {n}!', en: 'You reached level {n}!' },
  dodge_hint: { es: 'esquivá', en: 'dodge' },
  belt_equipped: { es: 'Cinturón equipado: {n} espacios', en: 'Belt equipped: {n} slots' },
  gear_destroyed: { es: '¡Tu {name} se destruyó!', en: 'Your {name} was destroyed!' },
  gear_broke: { es: '¡Se rompió tu {name}! Llevalo al herrero.', en: 'Your {name} broke! Take it to the smith.' },
  gear_impeccable: { es: 'Tu equipo está impecable', en: 'Your gear is pristine' },
  no_gold_repair: { es: 'No te alcanza el oro para reparar', en: "You can't afford the repair" },
  gear_repaired: { es: 'Equipo reparado (-{n} oro)', en: 'Gear repaired (-{n} gold)' },
  gear_word: { es: 'equipo', en: 'gear' },
  obelisk_name: { es: 'Obelisco de Retorno', en: 'Obelisk of Return' },
  obelisk_l1: { es: 'La piedra rúnica duerme, fría al tacto.', en: 'The runestone sleeps, cold to the touch.' },
  obelisk_l2: { es: 'Usá un Pergamino de Retorno allá afuera: su luz te traerá aquí, y este obelisco te devolverá al punto donde estabas.', en: 'Use a Return Scroll out there: its light brings you here, and this obelisk sends you back to where you stood.' },
  picked_up: { es: 'Recogiste {name}{qty}', en: 'Picked up {name}{qty}' },
  attr_str: { es: 'Fuerza', en: 'Strength' }, abbr_str: { es: 'FUE', en: 'STR' },
  attr_int: { es: 'Inteligencia', en: 'Intelligence' }, abbr_int: { es: 'INT', en: 'INT' },
  attr_dex: { es: 'Destreza', en: 'Dexterity' }, abbr_dex: { es: 'DES', en: 'DEX' },
  attr_vit: { es: 'Vitalidad', en: 'Vitality' }, abbr_vit: { es: 'VIT', en: 'VIT' },
  lv: { es: 'Nv', en: 'Lv' },
  xp_of: { es: 'Nv {lv} · {into}/{need} XP', en: 'Lv {lv} · {into}/{need} XP' },
  powers_title: { es: 'Acciones', en: 'Actions' },
  skill_combate: { es: 'Combate', en: 'Combat' },
  skill_excavacion: { es: 'Excavación', en: 'Mining' },
  skill_herboristeria: { es: 'Herboristería', en: 'Herbalism' },
  skill_alquimia: { es: 'Alquimia', en: 'Alchemy' },
  skill_forja: { es: 'Forja', en: 'Smithing' },
  skill_saqueo: { es: 'Saqueo', en: 'Looting' },
  skilld_combate: { es: 'Matar enemigos afuera de la ciudad.', en: 'Slay enemies out beyond the town.' },
  skilld_excavacion: { es: 'Picar vetas de cristal en cuevas y minas.', en: 'Mine crystal veins in caves and mines.' },
  skilld_herboristeria: { es: 'Juntar hierbas y reactivos en el campo.', en: 'Gather herbs and reagents in the field.' },
  skilld_alquimia: { es: 'Preparar pociones con lo que juntás.', en: 'Brew potions from what you gather.' },
  skilld_forja: { es: 'Forjar y mejorar equipo con mastite.', en: 'Forge and upgrade gear with ore.' },
  skilld_saqueo: { es: 'Abrir cofres y desenterrar reliquias.', en: 'Open chests and unearth relics.' },
  // árbol de habilidades + atributos
  tab_actions: { es: 'Oficios', en: 'Trades' },
  tab_tree: { es: 'Árbol', en: 'Tree' },
  attr_points: { es: 'Puntos de atributo', en: 'Attribute points' },
  skill_points: { es: 'Puntos de habilidad', en: 'Skill points' },
  attr_points_n: { es: '{n} pts. de atributo', en: '{n} attribute pts.' },
  skill_points_n: { es: '{n} pts. de habilidad', en: '{n} skill pts.' },
  no_attr_points: { es: 'No te quedan puntos de atributo', en: 'No attribute points left' },
  no_skill_points: { es: 'No te quedan puntos de habilidad', en: 'No skill points left' },
  node_max: { es: 'Ese nodo ya está al máximo', en: 'That node is maxed out' },
  node_req: { es: 'Requiere el atributo en {n}', en: 'Requires the attribute at {n}' },
  node_req_short: { es: 'Req. {attr} {n}', en: 'Req. {attr} {n}' },
  tree_hint: { es: 'Gastá puntos de habilidad en los nodos. Cada nodo pide un mínimo del atributo de su rama.', en: 'Spend skill points on nodes. Each node needs a minimum in its branch attribute.' },
  respec_btn: { es: 'Reiniciar puntos', en: 'Reset points' },
  respec_cost: { es: 'Reiniciar — {n} oro', en: 'Reset — {n} gold' },
  respec_nothing: { es: 'No hay nada que reiniciar', en: 'Nothing to reset' },
  respec_no_gold: { es: 'No te alcanza el oro para reiniciar ({n})', en: "You can't afford the reset ({n})" },
  respec_done: { es: 'Puntos reiniciados (-{n} oro)', en: 'Points reset (-{n} gold)' },
  branch_guerrero: { es: 'Guerrero', en: 'Warrior' },
  branch_cazador: { es: 'Cazador', en: 'Ranger' },
  branch_mago: { es: 'Mago', en: 'Magician' },
  // nodos del árbol
  node_g_power: { es: 'Golpe brutal', en: 'Brutal strike' },
  noded_g_power: { es: '+5% de daño por rango.', en: '+5% damage per rank.' },
  node_g_tough: { es: 'Piel de hierro', en: 'Iron skin' },
  noded_g_tough: { es: '+14 vida y +2 defensa por rango.', en: '+14 health and +2 defense per rank.' },
  node_g_rage: { es: 'Furia', en: 'Fury' },
  noded_g_rage: { es: '+3% crítico y +3% daño por rango.', en: '+3% crit and +3% damage per rank.' },
  node_c_aim: { es: 'Puntería', en: 'Keen aim' },
  noded_c_aim: { es: '+2% crítico y +3 precisión por rango.', en: '+2% crit and +3 accuracy per rank.' },
  node_c_swift: { es: 'Pies ligeros', en: 'Swift feet' },
  noded_c_swift: { es: '+3% velocidad por rango.', en: '+3% speed per rank.' },
  node_c_greed: { es: 'Codicia', en: 'Greed' },
  noded_c_greed: { es: '+6% de hallazgo de botín por rango.', en: '+6% loot find per rank.' },
  node_m_arcane: { es: 'Poder arcano', en: 'Arcane power' },
  noded_m_arcane: { es: '+14 maná y +4% daño por rango.', en: '+14 mana and +4% damage per rank.' },
  node_m_medit: { es: 'Meditación', en: 'Meditation' },
  noded_m_medit: { es: '+1 regen. de maná por rango.', en: '+1 mana regen per rank.' },
  node_m_sage: { es: 'Sabiduría', en: 'Sage' },
  noded_m_sage: { es: '+4% XP y +8 maná por rango.', en: '+4% XP and +8 mana per rank.' },
  // habilidades activas (barra de acción)
  ability_locked: { es: 'Todavía no desbloqueaste esa habilidad', en: "You haven't unlocked that ability" },
  ability_no_target: { es: 'Necesitás un objetivo', en: 'You need a target' },
  ability_no_mana: { es: 'No te alcanza el maná', en: 'Not enough mana' },
  ability_locked_req: { es: 'Se desbloquea con {attr} {n}', en: 'Unlocks at {attr} {n}' },
  ab_embate: { es: 'Embate', en: 'Cleave' },
  abd_embate: { es: 'Molinete que golpea a todos los enemigos cercanos.', en: 'A spinning blow that hits every nearby enemy.' },
  ab_saeta: { es: 'Saeta certera', en: 'Keen Shot' },
  abd_saeta: { es: 'Disparo crítico garantizado a tu objetivo.', en: 'A guaranteed critical shot at your target.' },
  ab_fuego: { es: 'Bola de fuego', en: 'Fireball' },
  abd_fuego: { es: 'Proyectil que estalla en fuego alrededor del objetivo.', en: 'A bolt that bursts into fire around the target.' },
  ab_vigor: { es: 'Vigor', en: 'Vigor' },
  abd_vigor: { es: 'Te potencia con +daño y +defensa por unos segundos.', en: 'Empowers you with +damage and +defense for a few seconds.' },
  ab_lluvia: { es: 'Lluvia de flechas', en: 'Arrow Rain' },
  abd_lluvia: { es: 'Volea que cae en área sobre el objetivo.', en: 'A volley that falls over the target area.' },
  ab_restaurar: { es: 'Restaurar', en: 'Restore' },
  abd_restaurar: { es: 'Recuperás vida escalada por tu INT.', en: 'Recover health scaled by your INT.' },
  ab_cercenar: { es: 'Cercenar', en: 'Reap' },
  abd_cercenar: { es: 'Molinete devastador que te cura parte del daño infligido.', en: 'A devastating spin that heals you for part of the damage dealt.' },
  ab_andanada: { es: 'Andanada', en: 'Volley' },
  abd_andanada: { es: 'Volea brutal que cae en gran área sobre el objetivo.', en: 'A brutal volley over a wide area at the target.' },
  ab_meteoro: { es: 'Meteoro', en: 'Meteor' },
  abd_meteoro: { es: 'Estallido enorme de fuego por INT, en gran área.', en: 'A huge fiery burst scaled by INT, over a wide area.' },
  // quests narrativas / registro
  tab_daily: { es: 'Diarias', en: 'Daily' },
  tab_story: { es: 'Historia', en: 'Story' },
  quests_none: { es: 'No tenés ninguna aventura en curso. Hablá con la gente del pueblo.', en: 'You have no quest underway. Talk to the townsfolk.' },
  quests_completed: { es: 'Completadas', en: 'Completed' },
  quest_updated: { es: 'Registro actualizado', en: 'Journal updated' },
  quest_done: { es: '¡Aventura completa: {name}!', en: 'Quest complete: {name}!' },
  quest_reward: { es: 'Recompensa: +{xp} XP, +{gold} oro, +{seals} sellos', en: 'Reward: +{xp} XP, +{gold} gold, +{seals} seals' },
  name_found: { es: 'Un nombre olvidado resuena: {name}', en: 'A forgotten name echoes: {name}' },
  guardians_wake: { es: 'Pronunciás los tres nombres. Los Guardianes despiertan.', en: 'You speak the three names. The Guardians awaken.' },
  guardian_asleep: { es: 'La estatua duerme. Le falta oír los nombres que la sellaron.', en: 'The statue sleeps. It must hear the names that sealed it.' },
  enemy_summons: { es: '{name} invoca a los muertos', en: '{name} summons the dead' },
  no_combat_town: { es: 'En el pueblo no se combate', en: 'No fighting in town' },
  // slots del mouse (M1 / M2) + configuración del especial
  m1_normal: { es: 'Ataque normal (clic izquierdo)', en: 'Normal attack (left click)' },
  bind_special: { es: 'Elegir especial (clic derecho)', en: 'Set special (right click)' },
  mousebind_title: { es: 'Botón derecho', en: 'Right click' },
  mousebind_hint: { es: 'Elegí la habilidad que se lanza con el clic derecho (o el slot M2).', en: 'Pick the ability cast with right click (or the M2 slot).' },
  mousebind_none_unlocked: { es: 'Todavía no desbloqueaste habilidades. Subí atributos en el árbol.', en: "You haven't unlocked abilities yet. Raise attributes in the tree." },
  bind_none: { es: 'Ninguna', en: 'None' },
}

// Nombre de raza según idioma (los datos traen name + name_en).
export const raceName = (race, lang = _lang) => (!race ? '' : lang === 'en' ? (race.name_en || race.name) : race.name)

// Nombre / texto de etapa de una quest según idioma (los datos traen *_en).
export const questName = (q, lang = _lang) => (!q ? '' : lang === 'en' ? (q.name_en || q.name) : q.name)
export const stageText = (st, lang = _lang) => (!st ? '' : lang === 'en' ? (st.text_en || st.text) : st.text)

export function translate(lang, key, vars) {
  const e = DICT[key]
  let s = e ? (e[lang] ?? e.es) : key
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k])
  return s
}
// versión no reactiva (motor / store): usa el idioma del módulo.
export const tt = (key, vars) => translate(_lang, key, vars)

// --- etiquetas compartidas (slot / stat / rareza) ---
const SLOT = {
  head: ['Cabeza', 'Head'], chest: ['Torso', 'Chest'], legs: ['Piernas', 'Legs'],
  hands: ['Manos', 'Hands'], feet: ['Pies', 'Feet'], main: ['Arma', 'Weapon'],
  off: ['Escudo', 'Shield'], ring: ['Anillo', 'Ring'], artifact: ['Reliquia', 'Relic'],
  potion: ['Poción', 'Potion'], scroll: ['Pergamino', 'Scroll'], belt: ['Cinturón', 'Belt'],
  crafting: ['Material', 'Material'], gem: ['Gema', 'Gem'],
}
const STAT = {
  absorb_min: ['Defensa mín', 'Defense min'], absorb_max: ['Defensa máx', 'Defense max'],
  dmg_melee_min: ['Daño c.c. mín', 'Melee dmg min'], dmg_melee_max: ['Daño c.c. máx', 'Melee dmg max'],
  dmg_ranged_min: ['Daño dist. mín', 'Ranged dmg min'], dmg_ranged_max: ['Daño dist. máx', 'Ranged dmg max'],
  dmg_ment_min: ['Daño mental mín', 'Mental dmg min'], dmg_ment_max: ['Daño mental máx', 'Mental dmg max'],
  hp: ['Vida', 'Health'], mp: ['Maná', 'Mana'], hp_regen: ['Regen. vida', 'HP regen'], mp_regen: ['Regen. maná', 'MP regen'],
  fire_resist: ['Res. fuego', 'Fire res'], ice_resist: ['Res. hielo', 'Ice res'],
  accuracy: ['Precisión', 'Accuracy'], crit: ['Crítico', 'Crit'], avoidance: ['Evasión', 'Avoidance'],
  xp_gain: ['Bonus XP', 'XP bonus'], item_find: ['+Botín', '+Loot'],
  poise: ['Aplomo', 'Poise'], currency_find: ['+Oro', '+Gold'],
}
const RARITY = {
  comun: ['Común', 'Common'], fino: ['Fino', 'Fine'], encantado: ['Encantado', 'Enchanted'],
  legendario: ['Legendario', 'Legendary'], unico: ['Único', 'Unique'],
}
const idx = (lang) => (lang === 'en' ? 1 : 0)
export const slotLabel = (slot, lang = _lang) => (SLOT[slot] ? SLOT[slot][idx(lang)] : slot)
export const statLabel = (k, lang = _lang) => (STAT[k] ? STAT[k][idx(lang)] : k)
export const rarityLabel = (r, lang = _lang) => (RARITY[r] ? RARITY[r][idx(lang)] : r)

// Nombre del ítem según idioma (los datos de Flare traen name + name_en).
export const itemName = (item, lang = _lang) =>
  (!item ? '' : lang === 'en' ? (item.name_en || item.name) : (item.name || item.name_en || ''))

// NPC: nombre y líneas de diálogo según idioma (los datos traen name_en / lines_en opcionales).
export const npcName = (def, lang = _lang) => (!def ? '' : lang === 'en' ? (def.name_en || def.name) : def.name)
export const npcLines = (def, lang = _lang) => (!def ? [] : lang === 'en' ? (def.lines_en || def.lines || []) : (def.lines || []))

// Nombre de zona (mapa). ES curado; EN usa el título original de Flare (inglés).
const ZONE_EN = {
  triston: 'Triston', goblin_camp: 'Goblin Camp', goblin_cave: 'Goblin Cave',
  stonewood: 'Stonewood', salted_field: 'Salted Field', merrimead_swamp: 'Merrimead Swamp',
  lochport_cemetery: 'Lochport Cemetery', family_crypt: 'Family Crypt', lochport: 'Lochport',
  st_maria_1: 'St. Maria: Mausoleum', st_maria_2: 'St. Maria: Catacombs', st_maria_3: 'St. Maria: Crypt',
  perdition_mines: 'Perdition Mines', river_trail: 'River Trail', book_of_the_dead: 'Book of the Dead',
  perdition_harbor: 'Perdition Harbor', perdition_harbor_cave: 'Perdition Harbor Cave',
  abandoned_mines: 'Abandoned Mines', blackmire_mines: 'Blackmire Mines', the_breach: 'The Breach',
  grot_lagoon: 'Grot Lagoon', lake_kuuma: 'Lake Kuuma', stormrock_pass: 'Stormrock Pass',
  stormrock_ruins: 'Stormrock Ruins', antlion_nest: 'Antlion Nest', fort_amir: 'Fort Amir',
  temple_of_mez_1: 'Temple of Mez: Basement', temple_of_mez_2: 'Temple of Mez: Main Hall', temple_of_mez_3: 'Temple of Mez: Entrance',
  black_oak_city: 'Black Oak City', black_oak_farm: 'Black Oak Farm', southern_ridge: 'Southern Ridge',
  dilapidated_sewers: 'Dilapidated Sewers', nazia_highlands: 'Nazia Highlands', nazia_mines: 'Nazia Mines',
  nazia_underground: 'Nazia Underground', oasis: 'Oasis', mog_caverns: 'Mog Caverns', fort_nasu: 'Fort Nasu',
  the_pit: 'The Pit', torture_chambers: 'Torture Chambers', underworld: 'Underworld',
  underworld_catacombs: 'Underworld Catacombs', underworld_mines: 'Underworld Mines',
  underworld_stronghold_1: 'Underworld Stronghold I', underworld_stronghold_2: 'Underworld Stronghold II',
  wizards_tower_1: "Wizard's Tower: Entrance", wizards_tower_2: "Wizard's Tower: Study", wizards_tower_3: "Wizard's Tower: Laboratory",
}
const ZONE_ES = {
  triston: 'Triston', goblin_camp: 'Campo de Duendes', goblin_cave: 'Cueva de Duendes',
  stonewood: 'Bosque Pétreo', salted_field: 'Campo Salado', merrimead_swamp: 'Ciénaga de Merrimead',
  lochport_cemetery: 'Cementerio de Lochport', family_crypt: 'Cripta Familiar', lochport: 'Lochport',
  st_maria_1: 'Sta. María: Mausoleo', st_maria_2: 'Sta. María: Catacumbas', st_maria_3: 'Sta. María: Osario',
  perdition_mines: 'Minas de Perdición', river_trail: 'Sendero del Río', book_of_the_dead: 'Libro de los Muertos',
  perdition_harbor: 'Puerto de Perdición', perdition_harbor_cave: 'Cueva del Puerto',
  abandoned_mines: 'Minas Abandonadas', blackmire_mines: 'Minas de Ciénaga Negra', the_breach: 'La Brecha',
  grot_lagoon: 'Laguna Grot', lake_kuuma: 'Lago Kuuma', stormrock_pass: 'Paso Roca-Tormenta',
  stormrock_ruins: 'Ruinas de Roca-Tormenta', antlion_nest: 'Nido de Hormigas León', fort_amir: 'Fuerte Amir',
  temple_of_mez_1: 'Templo de Mez: Sótano', temple_of_mez_2: 'Templo de Mez: Gran Salón', temple_of_mez_3: 'Templo de Mez: Entrada',
  black_oak_city: 'Black Oak City', black_oak_farm: 'Granja de Black Oak', southern_ridge: 'Cresta del Sur',
  dilapidated_sewers: 'Cloacas Ruinosas', nazia_highlands: 'Tierras Altas de Nazia', nazia_mines: 'Minas de Nazia',
  nazia_underground: 'Subsuelo de Nazia', oasis: 'Oasis', mog_caverns: 'Cavernas de Mog', fort_nasu: 'Fuerte Nasu',
  the_pit: 'La Fosa', torture_chambers: 'Cámaras de Tortura', underworld: 'Inframundo',
  underworld_catacombs: 'Inframundo: Catacumbas', underworld_mines: 'Inframundo: Minas',
  underworld_stronghold_1: 'Inframundo: Fortaleza I', underworld_stronghold_2: 'Inframundo: Fortaleza II',
  wizards_tower_1: 'Torre del Mago: Entrada', wizards_tower_2: 'Torre del Mago: Estudio', wizards_tower_3: 'Torre del Mago: Laboratorio',
}
export const zoneNameEN = (mapName, fallback) => ZONE_EN[mapName] || fallback || mapName
export function zoneName(mapName, lang = _lang, fallback) {
  return lang === 'en' ? (ZONE_EN[mapName] || fallback || mapName) : (ZONE_ES[mapName] || fallback || mapName)
}
