// Configuración: sonido + idioma. Panel chico, no usa el marco 640×832.
import { useGameStore } from '../store.js'
import { useT } from './useT.js'

export default function Settings() {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const lang = useGameStore((s) => s.lang)
  const setLang = useGameStore((s) => s.setLang)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()

  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <b>{t('config')}</b>
          <button className="settings-x" onClick={() => setPanel(null)}>✕</button>
        </div>
        <div className="settings-row">
          <span>{t('sound')}</span>
          <button className={'settings-toggle' + (muted ? '' : ' on')} onClick={toggleMute}>
            {muted ? t('sound_off') : t('sound_on')}
          </button>
        </div>
        <div className="settings-row">
          <span>{t('language')}</span>
          <div className="lang-switch">
            <button className={'lang-opt' + (lang === 'es' ? ' on' : '')} onClick={() => setLang('es')}>Español</button>
            <button className={'lang-opt' + (lang === 'en' ? ' on' : '')} onClick={() => setLang('en')}>English</button>
          </div>
        </div>
      </div>
    </div>
  )
}
