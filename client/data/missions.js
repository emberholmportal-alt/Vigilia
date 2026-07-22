// Misiones diarias: la lógica (POOL + selección determinística por fecha) vive en shared/ para
// que la use el cliente Y el servidor (el server necesita el contrato del día para su élite).
export { dailyMissions, POOL, todayContract, todayStr } from '../../shared/missions.js'
