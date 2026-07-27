// Requisito de nivel para VIAJAR a ciertas zonas (gate de progresión). Es un gate de UX del
// cliente: el viaje entre mapas ya lo maneja el cliente, y loot/XP/vida siguen siendo autoritativos
// del servidor en cualquier mapa, así que un jugador que se saltee el gate no gana nada explotable.
//
// Black Oak City es la zona insignia de lv10 ("salto deliberado a lv10", ver docs/ESCENARIOS.md).
// Pedimos estar cerca del cap del arco Oeste/Duendes (1-8) antes de dar el salto.
export const ZONE_REQ = { black_oak_city: 8 }

export const zoneReq = (zone) => ZONE_REQ[zone] || 0
