import { useEffect, useRef, useState } from 'react'
import { Game } from './engine/Game.js'
import { storeApi, useGameStore } from './store.js'
import { playMusic } from './engine/audio.js'
import { startingCharacter, raceById, RACES } from './data/characters.js'
import { loadGame, hasSave, unpackSave } from './data/save.js'
import { net, ONLINE } from './net/net.js'
import HUD from './ui/HUD.jsx'
import StartScreen from './ui/StartScreen.jsx'
import Welcome from './ui/Welcome.jsx'
import Trade from './ui/Trade.jsx'
import RaceScreen from './ui/RaceScreen.jsx'
import Inventory from './ui/Inventory.jsx'
import Character from './ui/Character.jsx'
import Powers from './ui/Powers.jsx'
import Settings from './ui/Settings.jsx'
import Vendor from './ui/Vendor.jsx'
import Blacksmith from './ui/Blacksmith.jsx'
import Alchemy from './ui/Alchemy.jsx'
import Guild from './ui/Guild.jsx'
import Missions from './ui/Missions.jsx'
import MouseBind from './ui/MouseBind.jsx'
import BootSplash from './ui/BootSplash.jsx'
import GameLoader from './ui/GameLoader.jsx'
import ChatLog from './ui/ChatLog.jsx'
import Minimap from './ui/Minimap.jsx'
import DialogueBox from './ui/DialogueBox.jsx'
import ZoneLoader from './ui/ZoneLoader.jsx'
import Waypoints from './ui/Waypoints.jsx'
import { useT } from './ui/useT.js'

// Flujo: Inicio -> Elegir raza -> Juego (con inventario).
export default function App() {
  const [phase, setPhase] = useState('boot') // 'boot' | 'start' | 'race' | 'game'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const panel = useGameStore((s) => s.panel)
  const waypointOpen = useGameStore((s) => s.waypointOpen)
  const showWelcome = useGameStore((s) => s.showWelcome)
  const initCharacter = useGameStore((s) => s.initCharacter)
  const t = useT()

  // Entra al juego con un personaje ya rehidratado (de localStorage o del servidor).
  function enterWithBlob(s) {
    useGameStore.getState().setPlayerName(s.playerName)
    const race = raceById(s.raceId) || RACES[0]
    initCharacter({ race, gold: s.gold, inventory: s.inventory, equipment: s.equipment,
                    belt: s.belt, equippedBelt: s.equippedBelt, xp: s.xp, skills: s.skills, discovered: s.discovered,
                    missions: s.missions, missionsDate: s.missionsDate, seals: s.seals,
                    attrAlloc: s.attrAlloc, skillRanks: s.skillRanks, questFlags: s.questFlags,
                    specialAbility: s.specialAbility, graves: s.graves })
    playMusic('town_theme.ogg')
    setLoading(true)
    setPhase('game')
  }

  // PLAY NOW: `char` es el blob del servidor (o null). Con la billetera conectada, un personaje
  // por cuenta con la raza fija: si ya existe se carga; si no, elegís nombre + raza.
  function play(char) {
    const s = char ? unpackSave(char) : null
    if (s && s.raceId) { enterWithBlob(s); return }
    if (!ONLINE) { const local = loadGame(); if (local && local.raceId) { enterWithBlob(local); return } }
    playMusic('title_theme.ogg')
    setPhase('race')   // crear personaje: pide nombre (obligatorio) + raza
  }
  function startGame() { setPhase('race') }

  // Crea el personaje (raza + nombre elegidos). Online: lo guarda en el servidor (queda ligado
  // a la cuenta/billetera — uno por cuenta, raza fija de acá en más).
  function chooseRace(raceId, name) {
    useGameStore.getState().setPlayerName(name || 'Vigilante')
    initCharacter(startingCharacter(raceId))
    if (ONLINE) { const b = storeApi.getSaveBlob(); net.save(b.name, b.race, b.char) }
    playMusic('town_theme.ogg')
    setLoading(true)
    setPhase('game')
  }

  // Modo espectador (mirón): entra al hub con un personaje descartable, sin combate ni guardado.
  function spectate() {
    useGameStore.getState().setPlayerName('Spectator')
    initCharacter({ ...startingCharacter('humano'), spectator: true })
    playMusic('town_theme.ogg')
    setLoading(true)
    setPhase('game')
  }

  useEffect(() => {
    if (phase !== 'game' || gameRef.current) return
    const game = new Game(storeApi)
    gameRef.current = game
    // Hub: el pueblo de Lochport (con fragua). ?map=<nombre> para probar otras zonas.
    const mapName = new URLSearchParams(location.search).get('map') || 'triston'
    game
      .mount(canvasRef.current, mapName)
      .then(() => setLoading(false))
      .catch((e) => {
        console.error(e)
        setError(String(e.message || e))
        setLoading(false)
      })
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [phase])

  // Botón "atrás" del navegador / gesto de retroceso del celular: en vez de ABANDONAR la página,
  // navega DENTRO de la app — primero cierra el overlay abierto (diálogo, waypoints, panel) y, si
  // no hay ninguno, vuelve del juego o la creación de personaje al menú de inicio. Se re-arma un
  // buffer de historial en cada retroceso para que la app no se cierre sola.
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => {
    window.history.pushState({ v: 'velgrim' }, '')
    const onPop = () => {
      const st = useGameStore.getState()
      if (st.dialogue) st.closeDialogue()
      else if (st.waypointOpen) st.closeWaypoints()
      else if (st.panel) st.setPanel(null)
      else if (phaseRef.current === 'game' || phaseRef.current === 'race') setPhase('start')
      window.history.pushState({ v: 'velgrim' }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div id="wrap">
      {phase === 'game' && <div ref={canvasRef} className="canvas-host" />}
      {phase === 'game' && !loading && !error && <HUD onExitSpectate={() => setPhase('start')} />}
      {phase === 'game' && !loading && !error && <Minimap />}
      {phase === 'game' && !loading && !error && <ChatLog />}
      {phase === 'game' && panel === 'inventory' && <Inventory />}
      {phase === 'game' && panel === 'character' && <Character />}
      {phase === 'game' && panel === 'powers' && <Powers />}
      {phase === 'game' && panel === 'settings' && <Settings />}
      {phase === 'game' && panel === 'shop' && <Vendor />}
      {phase === 'game' && panel === 'smith' && <Blacksmith />}
      {phase === 'game' && panel === 'alchemy' && <Alchemy />}
      {phase === 'game' && panel === 'guild' && <Guild />}
      {phase === 'game' && panel === 'missions' && <Missions />}
      {phase === 'game' && panel === 'mousebind' && <MouseBind />}
      {phase === 'game' && !loading && !error && <DialogueBox />}
      {phase === 'game' && waypointOpen && <Waypoints />}
      {phase === 'game' && !loading && !error && showWelcome && <Welcome />}
      {phase === 'game' && !loading && !error && <Trade />}
      {phase === 'game' && <ZoneLoader />}
      {error && <div className="error">Error: {error}</div>}

      {phase === 'boot' && <BootSplash onDone={() => setPhase('start')} />}
      {phase === 'start' && <StartScreen onPlay={play} onSpectate={spectate} onNew={startGame} canContinue={hasSave()} loading={false} />}
      {phase === 'race' && <RaceScreen onChoose={chooseRace} onBack={() => setPhase('start')} />}
      {phase === 'game' && loading && <GameLoader />}
    </div>
  )
}
