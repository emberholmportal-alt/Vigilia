// Configuración: sonido (y lo que sumemos). Panel chico, no usa el marco 640×832.
import { useGameStore } from '../store.js'

export default function Settings() {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const setPanel = useGameStore((s) => s.setPanel)

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <b>Configuración</b>
          <button className="settings-x" onClick={() => setPanel(null)}>✕</button>
        </div>
        <div className="settings-row">
          <span>Sonido</span>
          <button className={'settings-toggle' + (muted ? '' : ' on')} onClick={toggleMute}>
            {muted ? '🔇 Silenciado' : '🔊 Activado'}
          </button>
        </div>
      </div>
    </div>
  )
}
