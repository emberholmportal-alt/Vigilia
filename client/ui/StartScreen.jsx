// Pantalla de inicio. La atribución a Flare (CC-BY-SA 3.0) es OBLIGATORIA acá
// además del CREDITS.md (ver CLAUDE.md).
import { useT } from './useT.js'

export default function StartScreen({ onEnter, onContinue, canContinue, loading }) {
  const t = useT()
  return (
    <div className="start">
      <div className="start-inner">
        <h1>Vigilia</h1>
        <p className="tagline">{t('start_tag')}</p>
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
