// Pantalla de inicio. La atribución a Flare (CC-BY-SA 3.0) es OBLIGATORIA acá
// además del CREDITS.md (ver CLAUDE.md).
export default function StartScreen({ onEnter, loading }) {
  return (
    <div className="start">
      <div className="start-inner">
        <h1>Vigilia</h1>
        <p className="tagline">Black Oak City es lo último que queda en pie.</p>
        <button className="enter" onClick={onEnter} disabled={loading}>
          {loading ? 'Cargando…' : 'Entrar a la ciudad'}
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
