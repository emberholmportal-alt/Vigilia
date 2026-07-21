// Configuración: sonido + idioma + billetera. Panel chico, no usa el marco 640×832.
import { useState } from 'react'
import { useGameStore } from '../store.js'
import { useT } from './useT.js'
import { ONLINE } from '../net/net.js'
import { loadSession, clearSession } from '../net/wallet.js'
import { Sound, Mute, Plug } from './Icon.jsx'

const short = (a) => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '')

export default function Settings({ onLogout }) {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const lang = useGameStore((s) => s.lang)
  const setLang = useGameStore((s) => s.setLang)
  const setPanel = useGameStore((s) => s.setPanel)
  const t = useT()
  const [wallet, setWallet] = useState(loadSession()?.pubkey || null)

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
            {muted ? <><Mute /> {t('sound_off')}</> : <><Sound /> {t('sound_on')}</>}
          </button>
        </div>
        <div className="settings-row">
          <span>{t('language')}</span>
          <div className="lang-switch">
            <button className={'lang-opt' + (lang === 'es' ? ' on' : '')} onClick={() => setLang('es')}>Español</button>
            <button className={'lang-opt' + (lang === 'en' ? ' on' : '')} onClick={() => setLang('en')}>English</button>
          </div>
        </div>
        {ONLINE && wallet && (
          <div className="settings-row">
            <span>{t('wallet_connected')} <b className="wallet-addr">{short(wallet)}</b></span>
            <button className="wallet-disc" onClick={() => { clearSession(); setWallet(null); onLogout && onLogout() }}>
              <Plug /> {t('wallet_disconnect')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
