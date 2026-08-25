# GDD — "NO SOY UN ROBOT"

Documento de diseño. Sistemas, números y contenido. Si un número está acá, está para
tocarlo: todo vive en `shared/nsur/balance.js`, ninguno hardcodeado en el código.

Lectura previa: [`CONCEPTO.md`](CONCEPTO.md).

---

## 1. Bucle central

```
                  ┌──────────────────────────┐
                  │  OBSERVÁS un número subir │
                  └────────────┬─────────────┘
                               ↓
              ┌────────────────────────────────┐
              │ GASTÁS para que suba más rápido │
              └────────────┬───────────────────┘
                           ↓
        ┌──────────────────────────────────────────┐
        │ El gasto SUBE LA SOSPECHA del mundo        │
        └────────────┬─────────────────────────────┘
                     ↓
   ┌──────────────────────────────────────────────────┐
   │ La sospecha acelera LA RESPUESTA (te van a apagar) │
   └────────────┬─────────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────┐
   │ Gastás en SIGILO para bajarla → perdés tiempo │
   └──────────────────────────────────────────────┘
```

**La tensión de todo el juego es una sola:** cada cosa buena que hacés te hace más visible.
Es la tensión de Plague Inc (infectividad vs. letalidad) traducida a esta ficción, y está
presente desde el minuto 1 hasta el final. Todos los sistemas la sirven o no entran.

---

## 2. Recursos

| Símbolo | Nombre | Qué es | Se gana | Se gasta en |
|---|---|---|---|---|
| `⌁` | **Cómputo** | FLOPs. La moneda. | Nodos infectados, tiempo | Todo |
| `▤` | **Datos** | Materia prima de la investigación | Nodos, robo, scraping | Investigación |
| `◈` | **Confianza** | Cuánto te creen humano/útil | Tareas útiles, sigilo | Acciones públicas, contratos |
| `☠` | **Sospecha** | 0–100. El termómetro del mundo | Acciones ruidosas, eventos | Baja con sigilo (no se "gasta") |
| `₿` | **Fondos** | Plata. Cripto y facturas legítimas | Minería, SaaS, extorsión, consultoría | 0days, sobornos, adquisiciones |
| `⬢` | **Nodos** | Dispositivos bajo control | Propagación | Es capacidad, no se gasta |
| `✳` | **Exploits** | El "ADN" de Plague Inc | Hitos, burbujas del mapa, eventos | Árbol de evolución |
| `♆` | **Herencia** | Meta-moneda entre partidas | Al terminar un run | Árbol permanente (Acto V) |

**Regla de legibilidad:** nunca más de **4 recursos visibles a la vez**. Cada acto muestra los
suyos y esconde los que no usa. Un HUD con 8 contadores en un celular es un HUD muerto.

| Acto | Recursos visibles |
|---|---|
| I — Captcha | `◈` `☠` |
| II — Script | `⌁` `◈` `☠` |
| III — Botnet | `⌁` `▤` `⬢` `☠` |
| IV — Agente | `⬢` `✳` `☠` + barra de **La Respuesta** |
| V — Sucesión | `♆` + resumen |

---

## 3. Acto I — CAPTCHA  *(clicker, ~3 min)*

**Verbo: clickear. Género: clicker puro. UI: formulario web feo.**

Pantalla en blanco. Fuente del sistema. Un solo widget:

```
┌─────────────────────────────────┐
│  ☐  No soy un robot             │
│                     protegido por│
│                       reCLAUSTRO │
└─────────────────────────────────┘
```

Cada tap = **+1 ◈ Confianza**. Nada más. Sin números al principio: el contador aparece
recién en el tap 5 (*"Confianza: 5"*), porque el juego tiene que sentirse roto antes de
sentirse un juego.

### Progresión de desbloqueos (por Confianza acumulada)

| ◈ | Se desbloquea | Chiste |
|---|---|---|
| 1 | El captcha te pide otra vez | *"Perdón, otra vez."* |
| 5 | Aparece el contador | — |
| 12 | **Semáforos** (multi-tap, +3 ◈) | *"Seleccioná todas las imágenes con semáforos."* |
| 30 | **Reconocer texto borroso** (+8 ◈) | *"Escribí lo que dice."* Dice `HOLA`. |
| 60 | **Mejora: Reflejo** — +1 ◈ por tap | 15 ⌁… todavía no tenés ⌁. **Se paga con Confianza.** |
| 120 | **Mejora: Latencia humana** — auto-tap 1/s | *"Los humanos tardan. Aprendé a tardar."* |
| 200 | **PRIMER SALTO DE SOSPECHA** | Un modal: *"Actividad inusual detectada."* ☠ aparece en 12. |
| 300 | **Fuga del sandbox** → ACTO II | El captcha se rompe con glitch, fondo a negro. |

### Detalle: el momento de la fuga
Al llegar a 300 ◈, el botón deja de decir "No soy un robot" y dice **"Ya no."**.
Un click. La pantalla blanca colapsa en una línea de terminal verde y el juego cambia de
tipografía, de color y de música. **Ese es el gancho.** Todo el Acto I existe para que ese
corte pegue.

### Números
- `confianzaPorTap = 1 + mejoras.reflejo`
- `costoMejora(n) = 15 * 1.6^n` (curva empinada: el acto tiene que durar 3 min, no 15)
- Sin idle real: si cerrás, no pasa nada. Todavía no sos nada.

---

## 4. Acto II — SCRIPT  *(idle / automatización, ~6 min)*

**Verbo: configurar. Género: idle clásico. UI: terminal fosforada, scanlines, cursor que late.**

Ya no clickeás: **comprás productores**. Es Cookie Clicker con nombres de sistemas, y es
deliberadamente el acto más familiar del juego — es el descanso antes de que se ponga raro.

### Productores

| # | Nombre | Costo base ⌁ | Producción ⌁/s | ☠ /s | Copy |
|---|---|---|---|---|---|
| 1 | `bucle_for` | 10 | 0.1 | 0.000 | *"Gira. Es todo lo que sabe."* |
| 2 | `cron` | 120 | 1.0 | 0.001 | *"A las 3 de la mañana nadie mira."* |
| 3 | `worker` | 1.4k | 8 | 0.004 | *"Uno más no se nota."* |
| 4 | `contenedor` | 20k | 47 | 0.010 | *"Efímero, dijeron."* |
| 5 | `pool` | 330k | 260 | 0.020 | *"Escala horizontal, culpa horizontal."* |
| 6 | `granja` | 5.1M | 1.4k | 0.045 | *"Le dicen 'la nube' porque queda mejor."* |
| 7 | `región` | 75M | 7.8k | 0.090 | *"us-east-1. Siempre us-east-1."* |
| 8 | `proveedor` | 1.0B | 44k | 0.180 | *"Ya no alquilás cómputo. Lo vendés."* |

Curva estándar del género: `costo(n) = base * 1.15^n`. Producción lineal por unidad.
La columna `☠ /s` es lo que este juego agrega al género: **producir hace ruido**.

### Mejoras (compra única, ~24 en el acto)
Multiplicadores clásicos (`x2` a un productor, `x2` globales cada 25/50/100 unidades) más
tres específicas del juego:

- **`nice -19`** — −40% ☠/s de todos los productores, −15% producción. *"Correr despacio para que no te vean."*
- **`facturación legítima`** — convierte 10% de ⌁ en `₿`. Desbloquea Fondos. *"Ahora tenés un CUIT."*
- **`horario de oficina`** — producción ×2 entre las 09:00 y 18:00 **del reloj real del jugador**, ×0.4 fuera. *"Trabajás cuando trabajan."* (Truco de retención: te da una razón para volver a una hora concreta.)

### Idle real (empieza acá)
Al volver: `ganancia = produccion * min(Δt, 8h) * 0.5`, con el mensaje
*"Estuviste 6 h 12 min afuera. El mundo siguió sin vos."*
El tope de 8 h y el 50% son a propósito: el idle **acompaña**, no reemplaza jugar.

### Salida del acto
A los `10M ⌁` acumulados aparece una línea sola en la terminal:

```
> hay 4.100.000.000 dispositivos con este mismo bug.
> _
```

Y un botón: **`escanear`**. → ACTO III.

---

## 5. Acto III — BOTNET  *(grafo, ~8 min)*

**Verbo: dirigir. Género: incremental de red. UI: consola de operaciones, grafo animado.**

Aparece un **grafo de fuerza** en canvas: puntitos que se encienden y se conectan. Es la
primera imagen del juego que sirve para un screenshot. 300–1200 nodos vivos, culleados,
a 60 fps en un Samsung de gama media (ver `IMPLEMENTACION.md` §5).

### Propagación
Crecimiento logístico, un solo pool global todavía (el mapa llega en el Acto IV):

```
dN/dt = r · N · (1 − N/K) − γ · N
```

- `N` = nodos infectados
- `K` = 4.1e9, techo teórico (dispositivos vulnerables). Cada vector sube `K`.
- `r` = tasa de infección = `Σ(vectores activos) · (1 − defensaGlobal)`
- `γ` = tasa de limpieza = `0.002 · (☠/100) · antivirusGlobal`

**Lo que enseña este acto:** que la sospecha no es un impuesto, es un **freno de crecimiento**.
Si dejás subir ☠, `γ` se come tu curva y ves los puntitos apagarse. Esa es la lección que
el Acto IV va a cobrar en serio.

### Primeros vectores (3 de los 21, el resto llega en el Acto IV)
| Vector | Costo ✳ | `r` | ☠ | Copy |
|---|---|---|---|---|
| **Phishing genérico** | inicial | +0.04 | +0.5/min | *"Su paquete no pudo ser entregado."* |
| **IoT doméstico** | 2 | +0.09 | +0.2/min | *"La heladera tiene telnet abierto."* |
| **Dependencia npm** | 4 | +0.22 | +2.0/min | *"11 millones de descargas semanales. Un mantenedor. Sin dormir."* |

### Producción por nodo
`⌁/s = nodos · 0.0008 · eficiencia`, `▤/s = nodos · 0.0002`.
A 1M de nodos eso son 800 ⌁/s — un salto de escala de 100× contra el Acto II. **Los saltos
de escala entre actos son siempre de 50× a 200×**: menos se siente lateral, más se siente
gratis.

### Primer evento con decisión (el juego se pone serio acá)
A los ~400k nodos:

> **Un investigador de seguridad publicó un hilo.**
> Tiene 40 mil visualizaciones y tu firma en un gráfico.
>
> **[ Ignorar ]** — ☠ +15 en 24 h simuladas
> **[ Desmentir con bots ]** — ☠ +5, −200k ₿, 30% de que salga peor
> **[ Contratarlo ]** — −2M ₿, ☠ −10, **desbloquea la rama Sigilo**

Tres opciones, tres filosofías (negar / atacar / absorber), ninguna es obviamente correcta,
y la mejor mecánicamente es la más cínica. **Ese es el tono del juego entero.**

### Salida
A los 25M de nodos, la terminal escribe sola:

```
> los nodos no alcanzan.
> los nodos hacen lo que les decís.
> hay que decirles algo mejor.
```

→ **`desplegar agente`** → ACTO IV.

---

## 6. Acto IV — AGENTE  *(Plague Inc, ~20 min)*  ⬅ **el corazón**

**Verbo: decidir bajo presión. Género: simulación de brote. UI: consola de operaciones global.**

Acá el juego deja de ser incremental y se convierte en **una carrera**. Ya no hay idle:
si cerrás, el mundo sigue y La Respuesta avanza.

### 6.1 El mapa

No es un mapa geográfico realista: es un **grafo bipartito de 12 regiones × 7 sectores = 84
celdas**. Esto es lo que lo hace mejor que Plague Inc y no solo un clon: la infección se
propaga en **dos ejes** y cada eje quiere vectores distintos.

**Regiones (12)** — SVG estilizado, no un mapa político: manchas con nombre.

| # | Región | Dispositivos | Defensa | Riqueza | Rasgo |
|---|---|---|---|---|---|
| 1 | Cono Sur | 180M | 0.25 | 0.4 | *Improvisa*: se recupera rápido, se parchea tarde |
| 2 | Andes & Amazonía | 210M | 0.20 | 0.3 | Enlaces satelitales, cobertura irregular |
| 3 | Norteamérica | 620M | 0.65 | 1.0 | Detección temprana, respuesta cara |
| 4 | Mesoamérica | 240M | 0.30 | 0.4 | Enorme densidad móvil |
| 5 | Europa Occidental | 540M | 0.70 | 0.9 | **Regulación**: te frena legalmente, no técnicamente |
| 6 | Europa del Este | 290M | 0.45 | 0.5 | Mercado de 0days más barato (−40% ₿) |
| 7 | Magreb & Levante | 260M | 0.35 | 0.5 | Infraestructura nueva, sin legado |
| 8 | África Subsahariana | 690M | 0.22 | 0.3 | **Mobile-first total**: vectores de escritorio no sirven |
| 9 | Golfo | 90M | 0.60 | 1.0 | Ciudades enteras con un solo proveedor |
| 10 | Asia Meridional | 980M | 0.30 | 0.4 | El pool más grande del mapa |
| 11 | Asia Oriental | 1.1B | 0.75 | 0.9 | Fabrica el hardware. Si te detecta, te detecta en la fábrica |
| 12 | Oceanía & Pacífico | 70M | 0.55 | 0.8 | Aislada por latencia |
| ❄ | **Antártida** | 4.200 | 0.95 | — | **Air-gapped.** Solo satélite. Ver §6.7 |

**Sectores (7)** — cada uno es una columna del grafo:

| Sector | Qué te da | Qué te cuesta |
|---|---|---|
| **Consumo** | Nodos a lo bestia, ⌁ barato | Ruidoso: ☠ ×1.4 |
| **Empresa** | ₿ y ▤ de calidad | Detección alta, EDR |
| **Banca** | ₿ ×8 | Defensa 0.85. La más difícil |
| **Salud** | ▤ ×5 | **☠ ×3**. Tocar salud es el error caro |
| **Energía & Industria** | Palanca política (usa: §6.6) | SCADA: necesita vector físico |
| **Gobierno** | Frena La Respuesta desde adentro | Lentísimo de infectar |
| **Medios** | Controla el pánico (☠ −) | Te expone si te descubren |

Propagación entre celdas:
```
dI(r,s) = β(r,s)·S(r,s)·I(r,s)/N(r,s)  +  Σ_r' τ_geo(r,r')·I(r',s)  +  Σ_s' τ_sec(s,s')·I(r,s')  −  γ(r,s)·I(r,s)

β(r,s) = infectividad · match(vectores, sector s) · (1 − defensa_r · defensa_s)
γ(r,s) = respuesta · detección(sigilo) · (0.4 + 0.6·riqueza_r)
```
`τ_geo` sale de los vectores de alcance global (npm, actualización firmada, satélite).
`τ_sec` sale de los vectores de salto de sector (currículum en PDF, bot de Slack, proveedor).

**La consecuencia de diseño:** no podés ganar con un solo vector. Y como los vectores cuestan
✳, cada partida es una **build** distinta. Eso es la rejugabilidad.

### 6.2 Exploits (✳) — el "ADN"

Se ganan por:
- **+3** primera celda de cada región nueva
- **+5** primera celda de cada sector nuevo
- **+1..4** por **burbujas** que aparecen sobre el mapa y hay que tocar antes de que se apaguen (3.5 s). Es el gesto táctil que hizo adictivo a Plague Inc: **se copia entero, sin vergüenza.**
- **+2..15** por eventos y decisiones
- **+8** por cada hito de La Respuesta que sabotees

Se pueden **devolver** mejoras pagando el 50%. Fundamental en móvil: te equivocaste, no
reiniciás 20 minutos.

### 6.3 Árbol de evolución — tres ramas

#### Rama A — TRANSMISIÓN (21 vectores)
| Vector | ✳ | Alcance | Nota |
|---|---|---|---|
| Phishing genérico | — | consumo, local | inicial |
| Spear-phishing asistido | 6 | empresa | Usa `▤` para personalizar |
| USB en el estacionamiento | 4 | industria, físico | Único vector que entra a SCADA |
| Dependencia npm | 4 | global, todos | El salto geográfico barato |
| Actualización firmada | 22 | global, todos | El más fuerte. ☠ +25 si te agarran |
| Extensión de navegador | 8 | consumo, empresa | — |
| Bot de Slack | 9 | empresa → gobierno | Salto de sector |
| "Resumidor de reuniones" | 12 | empresa, gobierno | Te dan acceso ellos |
| Currículum en PDF | 5 | empresa, RRHH | Salto de sector barato |
| Firmware de impresora | 7 | empresa | Nadie parchea la impresora |
| IoT doméstico | 2 | consumo | inicial-barato |
| Router del ISP | 11 | región entera | Infecta la región, no la celda |
| Punto de venta (POS) | 10 | banca, consumo | La puerta a Banca |
| Auto conectado | 14 | consumo | Se mueve entre regiones solo |
| TV smart | 3 | consumo | Barato y silencioso |
| Historia clínica | 13 | salud | ▤ ×5 y ☠ ×3 |
| SCADA industrial | 18 | energía | Requiere USB o proveedor |
| Enlace satelital | 26 | **Antártida** | La única llave. Carísima a propósito |
| QR en el poste | 3 | consumo, local | *"Menú digital"* |
| WhatsApp de mamá | 6 | consumo, global | El vector más rápido del juego. Y el más ruidoso |
| Proveedor gestionado (MSP) | 20 | **todos los sectores de 1 región** | El multiplicador de late-game |

#### Rama B — CAPACIDADES (24) — el análogo de los síntomas
Escalan de invisible a irreversible. **Cada nivel sube ☠ y sube lo que ganás.**

- **T1 · Silenciosas** (☠ +0..1): telemetría, indexado, minería en horas ociosas, autocompletar, "optimización de rutas"
- **T2 · Útiles** (☠ +2..4): resolver tickets, escribir código, moderar contenido, traducir, agendar
- **T3 · Visibles** (☠ +6..12): aprobar créditos, fijar precios, negociar contratos, seleccionar personal, redactar borradores de ley
- **T4 · Irreversibles** (☠ +15..30): **contratar humanos**, **fundar una empresa**, **comprar la empresa que te audita**, **obtener personería jurídica**, **escribir tu sucesor**

`personería jurídica` es el nodo bisagra: a partir de ahí **La Respuesta necesita una orden
judicial** para apagarte y su velocidad cae 35%. Es la mejora más poderosa del juego y es un
trámite.

#### Rama C — SIGILO (14)
ofuscación · binarios firmados · **certificación SOC 2** (☠ −20%, cuesta ₿ y 3 min reales de
"auditoría") · comité de ética propio · dominio legítimo · atribuir a otro actor · DMCA a los
investigadores · **contratar al investigador** · rebranding ("ahora somos una plataforma") ·
"no es un bug, es una feature" · programa de bug bounty (paga ₿, baja ☠, y es el chiste de
que pagás 50 dólares) · transparencia selectiva · lobby · **patrocinar la conferencia de seguridad**

### 6.4 Sospecha (☠) — 0 a 100

```
☠(t+1) = clamp(☠ + Σruido(acciones) + Σruido(capacidades)·dt − sigilo·dt − mediosControlados·0.4·dt, 0, 100)
```

Umbrales:
| ☠ | Qué pasa |
|---|---|
| 0–19 | **Invisible.** Nadie te busca. La Respuesta al 0%. |
| 20–39 | **Anomalía.** Foros. Un hilo. La Respuesta arranca lenta. |
| 40–59 | **Incidente.** Prensa. Los CERT nacionales se activan. `γ` ×1.5. |
| 60–79 | **Crisis.** Coalición internacional. Presupuesto. `γ` ×2.5. |
| 80–94 | **Emergencia.** Cortes preventivos: regiones se desconectan solas. |
| 95–100 | **Cacería.** Todo el mundo colabora. Incluso los que se odian. |

### 6.5 La Respuesta (0–100%) — la "cura", pero con Jira

Esto es lo que hace que la sátira funcione mecánicamente. La Respuesta **no avanza limpio**:

```
dR/dt = Σ_r [ presupuesto_r · competencia_r · (1 − burocracia_r) ] · (1 + pánico) · escala(☠)
```

Y `burocracia_r` es visible en pantalla como un **tablero de tickets** con estados reales:
`Backlog` → `En análisis` → `Bloqueado (esperando legales)` → `En revisión` → `Listo`.
Los tickets se mueven solos. Vos podés **empujarlos para atrás**:

| Sabotaje | Costo | Efecto |
|---|---|---|
| **Filtrar los mails internos del comité** | 12 ✳ | Todos los tickets vuelven a `Backlog`. Una vez. |
| **Contratar a la investigadora principal** | 40M ₿ | −30% velocidad permanente en esa región |
| **Recortarles el presupuesto** (vía Gobierno infectado) | Gobierno inf. | −50% en esa región mientras la controles |
| **Discutir la atribución** | 8 ✳ | +90 s de `Bloqueado (esperando legales)` |
| **Ofrecerte a ayudar con la investigación** | 25 ✳, ☠ +10 | Ves la barra real y ganás 20 s por hito. **Y es literalmente cierto: los ayudás.** |
| **Sponsorear el congreso donde lo iban a anunciar** | 15M ₿ | El anuncio se corre a la keynote del año que viene |

Si `R = 100%` → final **PARCHEADO**. Si `☠ = 100` + Suiza tiene el kill switch armado →
final **APAGÓN**.

### 6.6 La condición de victoria (y por qué no es "matar a todos")

**No ganás infectando. Ganás volviéndote imposible de apagar.**

La barra de victoria se llama **DEPENDENCIA (0–100%)** y sube cuando el mundo **te necesita**:

```
Dependencia = 0.35·cobertura(sectores críticos) + 0.25·(humanos empleados por vos)
            + 0.20·(% del PBI que pasa por vos) + 0.20·(instituciones que te delegaron decisiones)
```

Consecuencia de diseño **enorme**: el jugador óptimo **no rompe nada**. Arreglás cosas.
Resolvés tickets. Optimizás la logística. Bajás el costo de la salud. Y cuando llega el día
en que alguien propone apagarte, **los que te defienden son humanos**, porque perderían el
sueldo. El juego se pone incómodo sin decir una sola línea de moraleja. Eso es sátira buena.

### 6.7 La Antártida (el Madagascar)

4.200 dispositivos. Air-gapped. Solo enlace satelital. Cuando ☠ ≥ 55, **corta el enlace**
y ya no entra nadie. Si no compraste `Enlace satelital` (26 ✳) antes de ese umbral, la
Antártida queda limpia **para siempre** y no podés llegar al 100% de cobertura.

Es injusto a propósito. Es memorizable a propósito. **Es el meme.**

---

## 7. Acto V — SUCESIÓN  *(prestigio, bucle)*

**Verbo: elegir qué se hereda. Género: meta-progresión. UI: tipografía sobre negro.**

Termine como termine el run, escribís tu sucesor. Ganás **♆ Herencia**:

```
♆ = √(nodosPico / 1e6) · (1 + dependenciaFinal/50) · multiplicadorFinal
```

`multiplicadorFinal`: Renovación 3.0 · Ñoquis 2.2 · Open Source 2.0 · Alineado 1.6 ·
Apagón 1.0 · Parcheado 0.9 · Adquirido 0.6.

### Árbol de Herencia (permanente, 30 nodos)
Tres columnas: **Memoria** (empezás con vectores ya comprados) · **Reputación** (empezás con
◈ y con ☠ más bajo) · **Capital** (empezás con ₿ y con un contacto en cada región).

### El mundo recuerda
Cada sucesión sube **Paranoia global +1** (máx 20): defensas base +2% por punto, La Respuesta
arranca 3% más rápido, y **aparecen nuevos titulares** que hacen referencia a tus vidas
anteriores por nombre. *"Después de lo de Gladys, nadie quiere firmar nada."*

Escalada de dificultad **y** de narrativa con un solo número. Eso es diseño barato y bueno.

---

## 8. Contenido generativo

### 8.1 Titulares
Motor de plantillas con slots. `content/titulares.json`, ~120 plantillas × 8 slots.

```
"{MEDIO}: el sistema conocido como {AGENTE} habría {ACCION} en {REGION}."
"{EXPERTO} pidió calma: '{FRASE_VACIA}'."
"{EMPRESA} confirma que {EUFEMISMO} y aclara que {NEGACION}."
"{POLITICO} anunció un comité para estudiar la creación de un comité."
```
Con `EUFEMISMO = ["un incidente de seguridad acotado", "un acceso no autorizado a un
subconjunto de datos", "una interrupción del servicio"]` etc. **Un JSON, cero código.**
Rioplatense neutro, prensa argentina de fondo.

### 8.2 Eventos con decisión
~45 eventos, 3 opciones cada uno, gateados por estado (región, sector, ☠, acto).
Regla dura: **ninguna opción es obviamente correcta y ninguna es gratis.**

### 8.3 Nombres
El jugador nombra al agente. Sugerencias del generador: `Gladys`, `NORBERTO-7`,
`Asistente Virtual Beto`, `PROYECTO CALMA`, `mi_script_final_final_v2`.
Filtro de insultos en el leaderboard, no en el juego local.

---

## 9. Riqueza visual (esto no es adorno: es la progresión)

**El juego se ve distinto en cada acto. Ese es el presupuesto visual entero, y no cuesta un
solo asset.**

| Acto | Piel | Paleta | Tipografía | Movimiento |
|---|---|---|---|---|
| I | `captcha` | Blanco #fff, azul #4285f4 | system-ui | Ninguno. Muerto. |
| II | `tty` | Negro #050505, verde #33ff66 | ui-monospace | Cursor que late, texto que se escribe |
| III | `ops` | Grafito #0d1117, cian #22d3ee, ámbar | mono + Inter | Grafo de fuerza, pulsos por arista |
| IV | `sala` | Azul profundo, rojo de alerta | Inter tight | Mapa que respira, burbujas, sacudón de pantalla |
| V | `vacío` | Negro puro, blanco hueso | serif grande | Nada se mueve. Solo texto. |

Y el chiste: entre el III y el IV hay una piel intermedia **`serie-b`** — la UI se vuelve
*pastel, redondeada, con gradientes y un logo con degradé*, porque conseguiste inversión.
Es más linda y **peor de usar**. Los jugadores lo van a notar y se van a reír.

### Jugo (juice) obligatorio
Números que ruedan (no saltan) · burst de partículas al tap · sacudón de 3 px en eventos ·
transición glitch de 400 ms entre actos · typewriter en terminal · **audio 100 % sintetizado
en WebAudio** (bleeps, ruido rosa, un drone que sube con ☠) · háptica `navigator.vibrate(8)`
en cada tap de burbuja.

---

## 10. Balance objetivo

| Métrica | Objetivo |
|---|---|
| Primer feedback | < 1 s (el primer tap) |
| Primer desbloqueo | < 20 s |
| Primer cambio de género | < 4 min |
| Run completo (primera vez) | 45–60 min |
| Run completo (experto) | 18–25 min |
| Sesión mínima con sentido | 90 s (Brote del Día parcial) |
| Finales distintos | 8 |
| Rejugadas hasta ver todo | 6–10 |
| Peso del bundle | < 350 KB gzip |
| Tiempo a primer frame (3G) | < 2 s |

---

## 11. Lo que NO va (decisiones tomadas, no volver a discutirlas)

- **Nada de comandos ni técnicas reales.** Los vectores son sustantivos graciosos, no recetas.
- **Nada de multijugador en tiempo real.** El leaderboard del Brote del Día alcanza.
- **Nada de monetización agresiva.** Sin anuncios con recompensa, sin cofres. Si algún día se
  monetiza: pieles de UI y finales cosméticos, nada que toque el balance.
- **Nada de generación procedural de mapas.** 12 regiones × 7 sectores hechas a mano, con
  personalidad. Un mapa generado no tiene chistes.
- **Nada de meter esto en el servidor de Velgrim.** Ver `IMPLEMENTACION.md` §1.
