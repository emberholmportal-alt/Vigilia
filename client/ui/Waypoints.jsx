// Modal de red de portales (estilo Diablo): lista SÓLO los destinos que descubriste (pisaste
// su portal o estuviste ahí). Elegir uno viaja allá. Usa el panel real de Flare (powers.png),
// como el resto de los modales del juego.
import { useGameStore } from '../store.js'
import { useT } from './useT.js'

const UI = (import.meta.env.BASE_URL || '/') + 'assets/ui/'
const PW = 640, PH = 832

export default function Waypoints() {
  const list = useGameStore((s) => s.waypointList)
  const requestWaypoint = useGameStore((s) => s.requestWaypoint)
  const close = useGameStore((s) => s.closeWaypoints)
  const t = useT()

  const rows = [...(list || [])].sort((a, b) => (b.current - a.current) || a.label.localeCompare(b.label))
  const others = rows.filter((r) => !r.current)

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="flare-panel" style={{ backgroundImage: `url(${UI}powers.png)` }}
           onClick={(e) => e.stopPropagation()}>
        <button className="panel-close"
                style={{ left: (571 / PW * 100) + '%', top: (5 / PH * 100) + '%', width: '6.4%', backgroundImage: `url(${UI}button_x.png)` }}
                onClick={close} />
        <div className="char-title" style={{ left: '50%', top: (24 / PH * 100) + '%', transform: 'translate(-50%,-50%)', position: 'absolute' }}>{t('waypoints_title')}</div>

        <div className="wp-body">
          <div className="wp-hint">{t('waypoints_hint')}</div>
          {others.length === 0 && <div className="wp-empty">{t('wp_none')}</div>}
          <div className="wp-list">
            {rows.map((r) => (
              <button key={r.zone} className={'wp-row' + (r.current ? ' current' : '')}
                      disabled={r.current} onClick={() => requestWaypoint(r.zone)}>
                <span className="wp-rune">🌀</span>
                <span className="wp-name">{t.zone(r.zone) || r.label}</span>
                <span className="wp-tag">{r.current ? t('wp_here') : ''}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
