import { useEffect, useRef, useState } from 'react'
import { Game } from './engine/Game.js'
import { storeApi, useGameStore } from './store.js'
import { playMusic } from './engine/audio.js'
import { startingCharacter } from './data/characters.js'
import HUD from './ui/HUD.jsx'
import StartScreen from './ui/StartScreen.jsx'
import RaceScreen from './ui/RaceScreen.jsx'
import Inventory from './ui/Inventory.jsx'
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

  useEffect(() => {
    if (phase !== 'game' || gameRef.current) return
    const game = new Game(storeApi)
    gameRef.current = game
    // Hub: el pueblo de Lochport (con fragua). ?map=<nombre> para probar otras zonas.
    const mapName = new URLSearchParams(location.search).get('map') || 'lochport'
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
      {phase === 'game' && panel === 'inventory' && <Inventory />}
      {phase === 'game' && !loading && !error && <DialogueBox />}
      {error && <div className="error">Error: {error}</div>}

      {phase === 'start' && <StartScreen onEnter={startGame} loading={false} />}
      {phase === 'race' && <RaceScreen onChoose={chooseRace} />}
      {phase === 'game' && loading && <div className="loading">Cargando Black Oak City…</div>}
    </div>
  )
}
