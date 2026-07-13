# Servidor de Velgrim

Servidor **autoritativo**: cuentas, persistencia del personaje y presencia multijugador por
mapa. Node + `ws` (WebSocket) + PostgreSQL (con fallback a archivo local para desarrollo).

## Correr

```bash
npm run server              # sin DATABASE_URL -> usa server/.data/db.json (no commiteado)
PORT=8790 npm run server    # puerto explícito
DATABASE_URL=postgres://... npm run server   # con PostgreSQL (producción)
```

- `GET /health` → `{ ok, players, db }`
- WebSocket en la misma URL/puerto.

## Variables de entorno

| Var | Default | Qué hace |
|---|---|---|
| `PORT` | `8787` | Puerto HTTP + WebSocket |
| `DATABASE_URL` | — | Si está, usa PostgreSQL; si no, archivo local |

## Cliente

- El cliente vive en `client/net/net.js`. El online es **opt-in**: `?online=1` en la URL
  (con `?ws=ws://host:port` para apuntar al server) o `VITE_WS_URL` en el build.
- Sin conexión, el juego sigue andando single-player (localStorage).

## Deploy en Render

- **Web service** (este server): build `npm install`, start `npm run server`. Setear
  `DATABASE_URL` (Render PostgreSQL) y dejar `PORT` que Render inyecta.
- **Static site** (el cliente): build `npm run build`, publicar `dist/`. Setear
  `VITE_WS_URL=wss://<tu-web-service>.onrender.com` para que el cliente hable con el server.

## Protocolo (JSON sobre WS)

Cliente → servidor: `register`, `login`, `resume`, `save`, `join`, `move`, `chat`, `ping`.
Servidor → cliente: `auth`, `saved`, `present`, `join`, `move`, `leave`, `chat`, `pong`, `error`.

## Estructura

```
server/
├── index.js          # HTTP (health) + WebSocket + ruteo del protocolo
├── db/db.js          # PostgreSQL o archivo local (misma API)
├── systems/auth.js   # registro/login (scrypt) + tokens de sesión
└── world/rooms.js    # presencia por mapa (join/move/leave/chat)
```
