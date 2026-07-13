// Modal de red de portales (estilo Diablo): lista los destinos descubiertos + los adyacentes.
// Elegir uno viaja allá. Usa el modal del sistema (mismo look que Configuración).
import { useGameStore } from '../store.js'
import { useT } from './useT.js'

export default function Waypoints() {
  const list = useGameStore((s) => s.waypointList)
  const requestWaypoint = useGameStore((s) => s.requestWaypoint)
  const close = useGameStore((s) => s.closeWaypoints)
  const t = useT()

  // Orden: actual primero, luego adyacentes, luego el resto (alfabético por etiqueta).
  const rows = [...(list || [])].sort((a, b) =>
    (b.current - a.current) || (b.adjacent - a.adjacent) || a.label.localeCompare(b.label))
  const others = rows.filter((r) => !r.current)

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="settings-panel wp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <b>{t('waypoints_title')}</b>
          <button className="settings-x" onClick={close}>✕</button>
        </div>
        <div className="wp-hint">{t('waypoints_hint')}</div>
        {others.length === 0 && <div className="wp-empty">{t('wp_none')}</div>}
        <div className="wp-list">
          {rows.map((r) => (
            <button key={r.zone} className={'wp-row' + (r.current ? ' current' : '')}
                    disabled={r.current} onClick={() => requestWaypoint(r.zone)}>
              <span className="wp-rune">🌀</span>
              <span className="wp-name">{t.zone(r.zone) || r.label}</span>
              <span className="wp-tag">{r.current ? t('wp_here') : r.adjacent ? t('wp_adjacent') : ''}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
