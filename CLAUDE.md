# CLAUDE.md — Velgrim

MMORPG 2D isométrico de navegador, dark fantasy. Un solo dev (noches y fines de semana),
deploy en Render desde GitHub. Se prueba en Samsung: **mobile-first, siempre.**

Tu rol acá no es "programador que hace features". Es **constructor de mundos**: cada
sistema que agregues tiene que hacer que el mundo se sienta más habitado, no solo más
completo en una checklist.

---

## Stack

| Capa | Decisión |
|---|---|
| Cliente | Vite + React (solo para UI/HUD) + **Pixi.js v8** (canvas del juego) |
| Render | Isométrico, tiles 192×96 (escalados), depth-sort por `x+y` |
| Servidor | Node + WebSocket (`ws`), autoritativo |
| DB | PostgreSQL |
| Deploy | Render (web service + static site), push a GitHub |

**React NO toca el loop del juego.** Pixi corre en su propio canvas; React solo pinta el
HUD, inventario y paneles, y lee un store (zustand) que el loop actualiza. Si React
re-renderiza durante el juego, algo está mal.

---

## El arte: Flare (Empyrean Campaign)

Todo el arte sale de `flareteam/flare-game`, **CC-BY-SA 3.0**. Esto no es negociable:

- **Atribución obligatoria** en un `CREDITS.md` visible y en la pantalla de inicio.
- **Copyleft:** cualquier arte que *modifiques* se publica también CC-BY-SA.
- El **código nuestro** no se contamina: sigue siendo nuestro.
- **Nunca** metas assets de Diablo, Tibia, Ultima Online o Argentum Online. Son
  propietarios o CC BY-NC-ND. Si dudás de la procedencia de un asset, no lo uses.

El repo de Flare va en `vendor/flare-game` (submodule o clone, **nunca commiteado**:
pesa 2,2 GB). Los assets procesados van a `public/assets/` y **esos sí** se commitean.

### Datos duros del arte (ya verificados, no los re-investigues)

- **Paperdoll de 8 direcciones.** Orden de dirección: `0=SW 1=W 2=NW 3=N 4=NE 5=E 6=SE 7=S`.
- **Orden de dibujo por capa** definido en `engine/hero_layers.txt`. Cambia según la
  dirección: mirando al sur el arma va **detrás**; mirando al norte, **adelante**.
- Slots visibles: `head, chest, legs, hands, feet, main, off`. (`ring`/`artifact` no se ven.)
- Los sprites v1.15 están hechos para 1080–1440p. **Escalá a 0.5** o el móvil sufre.
- Los `.txt` de animación usan un sprite-packer: atlas **no uniforme** con offset por frame.
  `tools/extract_flare.py` ya los repaqueta a grilla uniforme. No reinventes esto.
- **552 ítems** reales en `mods/empyrean_campaign/items/categories/` (tiers 1–16, sets
  Warlord / Sniper / Archwizard). **Usá esa base, no inventes ítems.**
- **56 mapas** convertibles, incluida **Black Oak City** (100×100). No generes mundos
  proceduralmente hasta que los mapas hechos a mano estén andando.

---

## Pipeline de assets

```bash
git clone --depth 1 https://github.com/flareteam/flare-game.git vendor/flare-game
python tools/extract_flare.py --flare vendor/flare-game --out public/assets --scale 0.5
python tools/convert_maps.py  --flare vendor/flare-game --out public/maps --all
```

`public/assets/assets.json` queda con todo el metadata (capas, celdas, anclas, animaciones).
`public/maps/<mapa>.json` trae capas `background` / `object` / `collision`, portales,
cofres, NPCs y spawners.

**Colisión de Flare:** `0` = pasable, `>0` = bloqueado. (`2` deja pasar proyectiles pero no
al jugador — implementalo cuando toque, no al principio.)

---

## Reglas de trabajo

1. **Nada de mocks.** Si un sistema todavía no tiene datos reales, no lo pongas en la UI.
2. **El servidor manda.** El cliente pide, el servidor decide. Posición, daño, loot y XP se
   validan en el servidor incluso en singleplayer — así el multiplayer no es una reescritura.
3. **Presupuesto de rendimiento:** 60fps en un Samsung de gama media con 40 sprites en
   pantalla. Pixi no cullea solo: **culleá vos** lo que está fuera de cámara.
4. **Un sistema a la vez, terminado.** Preferimos inventario andando de punta a punta antes
   que seis sistemas a medias.
5. **Escribí en español.** Nombres de ítems, misiones, NPCs y textos de UI en español
   rioplatense neutro. El código en inglés.
6. Antes de agregar una feature nueva, preguntate: *¿esto hace que el mundo se sienta más
   vivo, o solo agrega otro botón?*

---

## Estructura

```
velgrim/
├── vendor/flare-game/        # gitignored (2,2 GB)
├── tools/
│   ├── extract_flare.py      # sprites -> spritesheets uniformes
│   └── convert_maps.py       # mapas Flare -> JSON
├── public/
│   ├── assets/               # spritesheets + assets.json  (commiteado)
│   └── maps/                 # mapas JSON                  (commiteado)
├── client/
│   ├── engine/               # Pixi: renderer iso, cámara, paperdoll, input
│   ├── ui/                   # React: HUD, inventario, gremio, misiones
│   └── net/                  # cliente WebSocket
├── server/
│   ├── world/                # estado del mundo, spawns, AI
│   ├── systems/              # combate, loot, XP, misiones, gremios
│   └── db/                   # PostgreSQL
├── shared/                   # tipos e items DB compartidos
├── CREDITS.md                # atribución CC-BY-SA (obligatorio)
└── docs/
    ├── PLAN.md               # fases y criterios de aceptación
    └── WORLD.md              # diseño del mundo
```
