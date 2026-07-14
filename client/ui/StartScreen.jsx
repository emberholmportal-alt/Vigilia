// Pantalla de inicio. La atribución a Flare (CC-BY-SA 3.0) es OBLIGATORIA acá
// además del CREDITS.md (ver CLAUDE.md).
//
// En online mostramos la conexión de billetera (Solana): la cuenta es la wallet. Por ahora NO
// se exige tener ninguna moneda ($VEL todavía no existe; el gate del server está apagado).
import { useState } from 'react'
import { useT } from './useT.js'
import { net, ONLINE } from '../net/net.js'
import { walletSignIn, loadSession, clearSession } from '../net/wallet.js'

const LOGO = (import.meta.env.BASE_URL || '/') + 'velgrinlogo.png'
const short = (a) => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '')

export default function StartScreen({ onEnter, onContinue, canContinue, loading }) {
  const t = useT()
  const [wallet, setWallet] = useState(loadSession()?.pubkey || null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function connect() {
    setBusy(true); setErr(null)
    try {
      await net.connect()
      const r = await walletSignIn(net)
      if (r.ok) setWallet(r.pubkey)
      else setErr(r.error === 'no-wallet' ? t('wallet_none') : t('wallet_fail'))
    } catch { setErr(t('wallet_fail')) }
    setBusy(false)
  }
  function disconnect() { clearSession(); setWallet(null) }

  return (
    <div className="start">
      <div className="start-inner">
        <img className="start-logo" src={LOGO} alt="Velgrim" />
        <p className="tagline">{t('start_tag')}</p>

        {ONLINE && (
          <div className="wallet-box">
            {wallet ? (
              <div className="wallet-on">
                <span>🟢 {t('wallet_connected')}: <b>{short(wallet)}</b></span>
                <button className="wallet-x" onClick={disconnect} title={t('wallet_disconnect')}>✕</button>
              </div>
            ) : (
              <button className="wallet-btn" onClick={connect} disabled={busy}>
                {busy ? t('wallet_connecting') : '🔗 ' + t('wallet_connect')}
              </button>
            )}
            {err && <p className="wallet-err">{err}</p>}
          </div>
        )}

        {canContinue && (
          <button className="enter" onClick={onContinue} disabled={loading}>
            {loading ? t('loading') : t('start_continue')}
          </button>
        )}
        <button className={canContinue ? 'enter secondary' : 'enter'} onClick={onEnter} disabled={loading}>
          {canContinue ? t('start_new') : (loading ? t('loading') : t('start_begin'))}
        </button>

        <p className="attribution">
          Arte, sprites, tilesets y mapas: <b>Flare — Empyrean Campaign</b>,
          © Flare Team, bajo licencia CC-BY-SA 3.0.
          <br />
          <a href="https://github.com/flareteam/flare-game" target="_blank" rel="noreferrer">
            github.com/flareteam/flare-game
          </a>
        </p>
      </div>
    </div>
  )
}
