// Borra TODOS los usuarios y sus datos (fresh start para el lanzamiento). Corre UNA vez contra la
// base de PRODUCCIÓN. Es IRREVERSIBLE.
//
// Cómo correrlo (recomendado): Render -> servicio `velgrim-static` -> pestaña Shell:
//     node tools/wipe_users.js --yes
// (usa la DATABASE_URL que ya está en el entorno del server; no hay que copiar credenciales).
//
// Requiere --yes para no ejecutarse por accidente. Sin --yes sólo muestra qué borraría.

const TABLES = [
  'accounts', 'characters', 'guilds', 'guild_members', 'guild_deposit',
  'market_listings', 'player_stash', 'gold_orders', 'gold_order_sigs',
]

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL. Corré esto en el server (Shell de Render), no en local.')
  process.exit(1)
}
if (!process.argv.includes('--yes')) {
  console.error('⚠️  Esto BORRA TODO: usuarios, personajes, gremios, mercado, alijos. Es IRREVERSIBLE.')
  console.error('Tablas: ' + TABLES.join(', '))
  console.error('Confirmá con:  node tools/wipe_users.js --yes')
  process.exit(1)
}

const { default: pkg } = await import('pg')
const pool = new pkg.Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } })
try {
  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`)
  console.log('✅ Base limpia. Truncadas (IDs reiniciados): ' + TABLES.join(', '))
} catch (e) {
  console.error('❌ Error: ' + e.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
