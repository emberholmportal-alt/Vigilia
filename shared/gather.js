// Materiales que se juntan en el mundo (nodos de recursos), por tipo de skill. Datos PUROS
// compartidos por cliente y servidor: el servidor autoritativo elige y coloca los nodos por
// canal (para que todos los jugadores vean/junten los mismos), el cliente los pinta.
// Ítems reales de Flare. La Botella Vacía (750) no se junta: la vende el mercader.
export const GATHER = {
  // Herboristería: reactivos de Alquimia, juntados en el campo y los bordes de agua (incluye el
  // cristal de maná, fiel al lore/códice).
  herboristeria: [
    { id: 751, name: 'Aloe Vera', glow: 0x4f9d6b, base: 'herb' },
    { id: 754, name: 'Hongos', glow: 0xb07acc, base: 'herb' },
    { id: 752, name: 'Cristal de maná', glow: 0x4a8fd6, base: 'herb' },
  ],
  // Excavación: mastite, la materia prima de la Forja (vetas en cuevas y minas).
  excavacion: [
    { id: 755, name: 'Mastite', glow: 0xc8843a, base: 'ore' },
  ],
}
