// Ventajas de gremio por nivel (WORLD.md). Vive en shared/ porque las usan el cliente
// (computeStats: aplicar +oro/+def/+XP y mostrarlas) y el server (recompensa de contrato
// autoritativa). Única fuente de verdad de la curva: no la dupliques.
//
// Base (n1..n5): n1 +5% oro de botín · n2 +4 defensa · n3 +5% XP · n4 Depósito · n5 estandarte.
// Prestigio (n6..n10, pasado el último nivel con ventaja nueva de la base — el nivel de gremio en
// sí no tiene tope): n6 +10% oro · n7 contrato ×1.5 · n8 +10% XP · n9 +8 defensa · n10 contrato ×2.
// Los mejoradores de oro/XP/defensa se quedan dentro de los clamps del server (goldMul ≤1.10).
export function guildPerks(guildLevel = 0) {
  const L = Math.max(0, guildLevel | 0)
  return {
    goldMul: L >= 6 ? 1.10 : L >= 1 ? 1.05 : 1,   // +oro de botín (n1 +5% → n6 +10%)
    defense: L >= 9 ? 8 : L >= 2 ? 4 : 0,         // +defensa a todos (n2 +4 → n9 +8)
    xpMul:   L >= 8 ? 1.10 : L >= 3 ? 1.05 : 1,   // +XP compartida (n3 +5% → n8 +10%)
    deposit: L >= 4,                              // acceso al Depósito del Gremio
    banner:  L >= 5,                              // estandarte visible en ciudad
  }
}

// Multiplicador de la recompensa del contrato semanal por nivel (prestigio n7/n10). Se aplica
// server-side sobre el pozo del gremio (autoritativo): n7 ×1.5, n10 ×2.
export function guildContractMul(guildLevel = 0) {
  const L = Math.max(0, guildLevel | 0)
  return L >= 10 ? 2 : L >= 7 ? 1.5 : 1
}
