// Bestiario: re-export del módulo COMPARTIDO (shared/bestiary.js). Las reglas de enemigos
// (stats, spawn, habilidades, nombres) las usan el cliente Y el servidor autoritativo, así que
// viven en shared/ y acá sólo se re-exportan para no tocar los imports existentes del cliente.
export * from '../../shared/bestiary.js'
