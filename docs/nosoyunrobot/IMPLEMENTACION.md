# IMPLEMENTACION — "NO SOY UN ROBOT"

Arquitectura, bucle de simulación, formato de guardado, presupuesto de rendimiento y fases
con criterio de aceptación. Mismo estilo que `docs/PLAN.md`: **una fase por vez, terminada.**

---

## 1. Convivencia con Velgrim (decisión de repo)

Son **dos juegos distintos que comparten un repo y un stack, y nada más**.

| | Velgrim | No Soy un Robot |
|---|---|---|
| Cliente | `client/` (Pixi iso + React HUD) | `nsur/client/` |
| Servidor | `server/` (ws + PostgreSQL, autoritativo) | **ninguno en v1** (todo local) |
| Estado | zustand + servidor | zustand + `localStorage` |
| Assets | 2,2 GB de Flare (CC-BY-SA) | **cero** |
| Entrada | `index.html` | `nsur.html` (segundo entry de Vite) |
| Build | `dist/` | `dist/nsur/` |

**No se mezclan:** ni store, ni tipos, ni base de datos, ni sesión. Si algún día el Brote del
Día necesita leaderboard, es un endpoint nuevo en `server/nsur/`, aislado, sin tocar el mundo
de Velgrim.

Vite multi-página:
```js
build: { rollupOptions: { input: { main: 'index.html', nsur: 'nsur.html' } } }
```
Render publica ambos desde el mismo static site: `/` y `/nsur/`.

**Salida alternativa (recomendada si el proyecto agarra vuelo):** sacarlo a su propio repo con
`git subtree split`. Se diseña desde el día 1 para que eso sea posible: **nada de `nsur/` importa
nada de `client/` ni de `shared/`.**

---

## 2. Estructura

```
nsur/
├── nsur.html
├── client/
│   ├── main.jsx
│   ├── store.js                # zustand, un solo store, con selectores
│   ├── sim/
│   │   ├── loop.js             # tick de paso fijo (autoridad del estado)
│   │   ├── acto1_captcha.js
│   │   ├── acto2_script.js
│   │   ├── acto3_botnet.js
│   │   ├── acto4_mapa.js       # SIR bipartito (regiones × sectores)
│   │   ├── respuesta.js        # la "cura" + tablero de tickets
│   │   ├── sospecha.js
│   │   ├── eventos.js
│   │   └── rng.js              # mulberry32 sembrado (runs deterministas)
│   ├── render/
│   │   ├── Grafo.js            # canvas 2D: grafo de fuerza del Acto III
│   │   ├── Mapa.js             # canvas 2D: mapa + burbujas del Acto IV
│   │   └── tarjeta.js          # OffscreenCanvas → PNG post-mortem
│   ├── ui/
│   │   ├── Acto1.jsx … Acto5.jsx
│   │   ├── Ticker.jsx  Evento.jsx  Arbol.jsx  Tickets.jsx  Final.jsx
│   │   └── Numero.jsx          # rueda de dígitos, formato corto (1,4 M)
│   ├── pieles/                 # 6 hojas de CSS custom-properties
│   │   ├── captcha.css  tty.css  ops.css  serie-b.css  sala.css  vacio.css
│   └── audio/sintetizador.js   # WebAudio puro. Cero archivos
├── content/                    # JSON. Se edita sin tocar código
│   ├── titulares.json  eventos.json  vectores.json  capacidades.json
│   ├── sigilo.json  regiones.json  sectores.json  finales.json
└── balance.js                  # TODOS los números del GDD, en un archivo
```

**Regla:** si un número aparece en `GDD.md`, vive en `balance.js`. Si un texto se lee en
pantalla, vive en `content/*.json`. El código no tiene literales de diseño.

---

## 3. El bucle de simulación

Tres relojes desacoplados. Es lo único de la arquitectura que hay que respetar sí o sí.

| Reloj | Frecuencia | Quién |
|---|---|---|
| **Simulación** | 10 Hz, paso fijo (100 ms) | `sim/loop.js`. Autoridad del estado |
| **Render de canvas** | rAF (60 Hz) | `render/*`. Interpola, **nunca** modifica estado |
| **Render de React** | ≤ 8 Hz | selectores throttleados sobre el store |

```js
// sim/loop.js — acumulador de paso fijo, inmune a pestañas en segundo plano
const PASO = 100 // ms
let acc = 0, ultimo = performance.now()

function frame(ahora) {
  acc += Math.min(ahora - ultimo, 1000)   // clamp: una pestaña dormida no dispara 4000 ticks
  ultimo = ahora
  while (acc >= PASO) { tick(PASO / 1000); acc -= PASO }
  requestAnimationFrame(frame)
}
```

**Por qué 10 Hz y no 60:** el mapa del Acto IV resuelve 84 celdas × 3 términos de propagación.
A 60 Hz eso es trabajo tirado (nadie ve la diferencia entre 10 y 60 actualizaciones por
segundo de una barra) y en un Samsung de gama media es la diferencia entre 60 fps y 30.

**React nunca re-renderiza por un número.** Los contadores se pintan con un componente
`<Numero>` que escribe en el DOM por `ref` desde el reloj de canvas. React solo re-renderiza
cuando cambia la **estructura** (se desbloqueó algo, cambió el acto, entró un evento).
Es exactamente la regla que ya tiene Velgrim en `CLAUDE.md`, aplicada a otro juego.

### Determinismo
Todo el azar sale de `rng.js` (mulberry32) sembrado con la semilla del run. Mismo seed +
mismas acciones = mismo resultado. Esto habilita:
- **El Brote del Día** (`seed = YYYYMMDD`)
- Reportes de bug reproducibles
- Tests de balance headless: correr 10.000 runs con un bot y ver la distribución de finales

```bash
node nsur/tools/simular.js --runs 10000 --seed 1 --estrategia agresiva
# → histograma de finales, duración media, ✳ gastados por rama
```
**Esa herramienta se construye en la fase 3, no al final.** Balancear un juego de 84 celdas a
ojo es imposible.

---

## 4. Guardado

`localStorage['nsur.save']`, JSON, versionado, autosave cada 5 s y en `visibilitychange`.

```json
{
  "v": 3,
  "seed": 20260825,
  "acto": 4,
  "t": 1482.6,
  "agente": "Gladys",
  "recursos": { "computo": 4.1e9, "datos": 220e6, "confianza": 91, "sospecha": 43.2, "fondos": 1.2e9 },
  "celdas": [[0.82, 0.11, 0.0], ...],
  "comprados": { "vectores": ["npm","iot","slack"], "capacidades": [...], "sigilo": [...] },
  "respuesta": { "pct": 31.4, "tickets": [...] },
  "meta": { "herencia": 14, "paranoia": 3, "finalesVistos": ["parcheado","adquirido"] }
}
```

- `meta` vive en **otra clave** (`nsur.meta`): un reset de partida no borra la meta-progresión.
- Migraciones: `migraciones[v](save)` en cadena. Si falla, se conserva `meta` y se descarta el run.
- Progreso offline: solo en Actos II y III. `min(Δt, 8h) · 0.5`. En el Acto IV **no hay offline**:
  es una carrera, y si te vas, La Respuesta avanza igual (se aplica al volver, con aviso).

---

## 5. Presupuesto de rendimiento

Mismo objetivo que Velgrim: **60 fps en un Samsung de gama media.**

| Ítem | Presupuesto |
|---|---|
| Bundle inicial | < 350 KB gzip (React + zustand + juego, sin Pixi) |
| Primer frame en 3G | < 2 s |
| Tick de simulación | < 4 ms a 10 Hz |
| Frame de canvas | < 8 ms |
| Nodos vivos en el grafo (Acto III) | ≤ 1.200 dibujados, culleados fuera de viewport |
| Partículas simultáneas | ≤ 300, pool preasignado, cero `new` en el frame |
| Re-renders de React por segundo | ≤ 8 |
| Memoria | < 120 MB |

**Nada de Pixi en v1.** El grafo y el mapa son canvas 2D con `Path2D` y batching por color.
Pixi entra solo si el mapa del Acto IV pide más de lo que canvas 2D aguanta, y eso se mide
antes de agregarlo, no se asume.

Trucos que sí se aplican desde el principio:
- El grafo del Acto III **no simula 25M de nodos**: simula 1.200 y el resto es un número.
  La ilusión es el juego. Nadie cuenta los puntitos.
- Dos capas de canvas: el mapa (se repinta a 10 Hz) y los efectos (rAF). El mapa quieto no
  se repinta.
- `content/*.json` se cargan por acto con `import()` dinámico. El Acto I pesa 40 KB.

---

## 6. Accesibilidad y móvil

- **Vertical primero.** Todo el HUD entra en 360 × 640. El mapa se navega con pan/zoom de un dedo.
- Target táctil mínimo **44 × 44 px**. Las burbujas del Acto IV son de 56 px.
- `prefers-reduced-motion`: apaga glitch, sacudones y partículas. El juego sigue siendo el juego.
- Contraste AA en las 6 pieles (sí, incluso en la piel `serie-b` con degradés — el chiste es
  que sea fea, no que sea ilegible).
- Todo el juego es jugable **sin audio**. El audio agrega, nunca informa.
- Textos escalables: la UI usa `rem` y respeta el tamaño de fuente del sistema.

---

## 7. Fases

Mismo contrato que `docs/PLAN.md`: **criterio de aceptación verificable, una fase por vez.**

### Fase 0 — Esqueleto y Acto I
- [ ] `nsur.html` como segundo entry de Vite. Build genera `dist/nsur/`.
- [ ] `sim/loop.js` con paso fijo + store zustand + autosave/carga.
- [ ] Acto I completo: captcha, 3 tipos de desafío, 2 mejoras, transición glitch al Acto II.
- [ ] Pieles `captcha` y `tty` con el corte visual funcionando.

**Aceptación:** en un celular real, desde cero, un desconocido llega al Acto II en menos de
4 minutos **sin tutorial y sin preguntar nada**. Se prueba con 3 personas. Si una se traba,
no está terminada.

### Fase 1 — Acto II (idle)
- [ ] 8 productores, ~24 mejoras, curva `1.15^n`, notación corta (1,4 M / 3,2 mM).
- [ ] Sospecha con sus 6 umbrales y efecto real sobre la producción.
- [ ] Progreso offline con el cartel de "el mundo siguió sin vos".

**Aceptación:** una sesión de 6 minutos llega a `10M ⌁` sin sentirse un muro, y cerrar y
volver a las 3 horas se siente una recompensa, no un castigo.

### Fase 2 — Acto III (grafo)
- [ ] Crecimiento logístico, 3 vectores, exploits ✳, grafo de fuerza en canvas.
- [ ] Primer evento con decisión de 3 opciones.
- [ ] Ticker de titulares con el motor de plantillas.

**Aceptación:** 1.200 nodos animados a 60 fps medidos en un Samsung de gama media, y el
screenshot del grafo se ve lo bastante bien como para publicarlo.

### Fase 3 — Acto IV (Plague Inc) ⬅ **la fase grande**
- [ ] 12 regiones × 7 sectores, propagación bipartita, mapa SVG/canvas con pan-zoom.
- [ ] Árbol completo: 21 vectores + 24 capacidades + 14 sigilo, con devolución al 50%.
- [ ] La Respuesta con el tablero de tickets y los 6 sabotajes.
- [ ] Barra de Dependencia (victoria) y la Antártida con su corte de enlace.
- [ ] `tools/simular.js` con 10.000 runs headless.

**Aceptación:** los 10.000 runs headless dan una distribución sana — ningún final por debajo
del 3% ni por encima del 40% — y un run humano promedio dura entre 18 y 35 minutos.

### Fase 4 — Finales y viralidad
- [ ] Los 8 finales, cada uno con su pantalla y su texto.
- [ ] Tarjeta post-mortem: PNG generado en canvas + Web Share API con fallback a descarga.
- [ ] Piel `serie-b` (el chiste de la UI que empeora) y piel `vacio`.

**Aceptación:** la tarjeta se comparte desde un celular en 2 taps y se entiende **sin
contexto** para alguien que nunca jugó.

### Fase 5 — Sucesión y Brote del Día
- [ ] Acto V: Herencia, árbol permanente de 30 nodos, Paranoia global.
- [ ] Brote del Día: `seed = YYYYMMDD`, modificadores del día, un run.
- [ ] Leaderboard: endpoint aislado en `server/nsur/`, sin cuentas (nombre + puntaje + hash del run).

**Aceptación:** dos personas distintas con la misma semilla ven exactamente el mismo mundo, y
el puntaje se valida en el servidor re-simulando el run desde la lista de acciones (el
determinismo de la §3 es lo que hace esto posible — y lo que hace imposible el ranking trucho).

---

## 8. Orden de trabajo sugerido (un dev solo, de noche)

| Semana | Qué |
|---|---|
| 1 | Fase 0. Al final de la semana hay **algo jugable y compartible** |
| 2–3 | Fase 1 |
| 4–5 | Fase 2 |
| 6–10 | Fase 3 (la grande — no acelerarla) |
| 11 | Fase 4 |
| 12–13 | Fase 5 |

**Lanzá al final de la semana 5.** Los Actos I–III solos ya son un juego completo de 15
minutos con un final ("te parchearon"). Publicarlo, mirar dónde abandona la gente, y **usar
esos datos para diseñar la Fase 3.** Construir el mapa entero a ciegas es el error caro.

---

## 9. Línea roja técnica

El juego **no puede contener nada operativamente útil**: ni comandos, ni payloads, ni CVEs
reales presentados como instrucciones, ni nombres de herramientas reales usadas como recetas.
Los vectores son sustantivos con chiste (`WhatsApp de mamá`, `USB en el estacionamiento`) y
sus efectos son números en `balance.js`. Si un sistema empieza a parecerse a un manual, **se
cambia el sistema, no se discute**. Es diseño, no solo prudencia: un juego que enseña sintaxis
real es menos gracioso y más aburrido que uno que se ríe de la burocracia.
