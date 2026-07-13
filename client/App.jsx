import { useEffect, useRef, useState } from 'react'
import { Game } from './engine/Game.js'
import { storeApi, useGameStore } from './store.js'
import { playMusic } from './engine/audio.js'
import { startingCharacter, raceById, RACES } from './data/characters.js'
import { loadGame, hasSave } from './data/save.js'
import HUD from './ui/HUD.jsx'
import StartScreen from './ui/StartScreen.jsx'
import RaceScreen from './ui/RaceScreen.jsx'
import Inventory from './ui/Inventory.jsx'
import Character from './ui/Character.jsx'
import Powers from './ui/Powers.jsx'
import Settings from './ui/Settings.jsx'
import Vendor from './ui/Vendor.jsx'
import Blacksmith from './ui/Blacksmith.jsx'
import ChatLog from './ui/ChatLog.jsx'
import Minimap from './ui/Minimap.jsx'
import DialogueBox from './ui/DialogueBox.jsx'

// Flujo: Inicio -> Elegir raza -> Juego (con inventario).
export default function App() {
  const [phase, setPhase] = useState('start') // 'start' | 'race' | 'game'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const panel = useGameStore((s) => s.panel)
  const initCharacter = useGameStore((s) => s.initCharacter)

  function startGame() {
    playMusic('title_theme.ogg') // gesto del usuario: arranca la música
    setPhase('race')
  }

  function chooseRace(raceId, name) {
    // Personaje con kit real ANTES de montar el juego (el paperdoll lo lee al arrancar).
    if (name) useGameStore.getState().setPlayerName(name)
    initCharacter(startingCharacter(raceId))
    playMusic('town_theme.ogg')
    setLoading(true)
    setPhase('game')
  }

  // Continuar la partida guardada (progreso, oro, XP, skills, inventario y equipo).
  function continueGame() {
    const s = loadGame()
    if (!s) { startGame(); return }
    useGameStore.getState().setPlayerName(s.playerName)
    const race = raceById(s.raceId) || RACES[0]
    initCharacter({ race, gold: s.gold, inventory: s.inventory, equipment: s.equipment,
                    belt: s.belt, equippedBelt: s.equippedBelt, xp: s.xp, skills: s.skills })
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

  return (
    <div id="wrap">
      {phase === 'game' && <div ref={canvasRef} className="canvas-host" />}
      {phase === 'game' && !loading && !error && <HUD />}
      {phase === 'game' && !loading && !error && <Minimap />}
      {phase === 'game' && !loading && !error && <ChatLog />}
      {phase === 'game' && panel === 'inventory' && <Inventory />}
      {phase === 'game' && panel === 'character' && <Character />}
      {phase === 'game' && panel === 'powers' && <Powers />}
      {phase === 'game' && panel === 'settings' && <Settings />}
      {phase === 'game' && panel === 'shop' && <Vendor />}
      {phase === 'game' && panel === 'smith' && <Blacksmith />}
      {phase === 'game' && !loading && !error && <DialogueBox />}
      {error && <div className="error">Error: {error}</div>}

      {phase === 'start' && <StartScreen onEnter={startGame} onContinue={continueGame} canContinue={hasSave()} loading={false} />}
      {phase === 'race' && <RaceScreen onChoose={chooseRace} />}
      {phase === 'game' && loading && <div className="loading">Cargando Black Oak City…</div>}
    </div>
  )
}
