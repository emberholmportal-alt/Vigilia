import { useEffect, useRef, useState } from 'react'
import { Game } from './engine/Game.js'
import { storeApi } from './store.js'
import HUD from './ui/HUD.jsx'
import StartScreen from './ui/StartScreen.jsx'

export default function App() {
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)

  async function enter() {
    setStarted(true)
    setLoading(true)
  }

  // Montamos Pixi cuando el contenedor ya está en el DOM.
  useEffect(() => {
    if (!started || gameRef.current) return
    const game = new Game(storeApi)
    gameRef.current = game
    game
      .mount(canvasRef.current, 'black_oak_city')
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
  }, [started])

  return (
    <div id="wrap">
      {started && <div ref={canvasRef} className="canvas-host" />}
      {started && !loading && !error && <HUD />}
      {error && <div className="error">Error: {error}</div>}
      {!started && <StartScreen onEnter={enter} loading={loading} />}
      {started && loading && <div className="loading">Cargando Black Oak City…</div>}
    </div>
  )
}
