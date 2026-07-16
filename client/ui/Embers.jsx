// Brasas flotantes para la ambientación de los menús (puro CSS, sin coste real).
// Cada brasa sube con deriva, duración y demora aleatorias. Decorativo (aria-hidden).
export default function Embers({ count = 20 }) {
  const bits = []
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100
    const dur = 7 + Math.random() * 9
    const delay = -Math.random() * 16
    const size = 2 + Math.random() * 3
    const drift = Math.random() * 60 - 30
    bits.push(
      <i
        key={i}
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${dur}s`,
          animationDelay: `${delay}s`,
          '--drift': `${drift}px`,
        }}
      />
    )
  }
  return <div className="embers" aria-hidden="true">{bits}</div>
}
