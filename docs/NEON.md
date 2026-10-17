# NEON.md — Nueva Ceniza

Una ciudad cyberpunk escrita solo con caracteres. Es la versión densa del modo Glifo (ver
`GLIFO.md`), llevada al nivel de detalle del MMORPG ASCII de Ansenjeo y a otro mundo.
Prototipo jugable: `docs/glifo/neon.html`.

---

## Premisa

**Nueva Ceniza** es lo que quedó cuando la Corporación Velgrim compró la ciudad entera. Llueve
desde hace once días. El barrio 9 vive de noche: ramen, implantes de segunda mano, locutorios
convertidos en clínicas de memoria. Los drones de seguridad patrullan cada cuadra con un cono
rojo y responden a una sola red.

Vos sos alguien que la red todavía no tiene fichado.

> El nombre "Velgrim" queda como la corporación dueña de todo. Si este mundo pasa a ser un juego
> aparte, la marca sigue conectada sin compartir lore con la fantasía oscura.

---

## Lo que lo hace denso

| Capa | Qué se ve | Cómo está hecho |
|---|---|---|
| **Edificios 2.5D** | Fachada con ventanas, pisos, persianas, vidrieras; techo con aires acondicionados, antenas con luz roja, tanques | Proyección oblicua: un punto `(x, y, z)` se dibuja en `(x, y − z)`. Se pintan de atrás para adelante y cada celda guarda su profundidad. |
| **Neón** | Carteles horizontales y verticales en español (`LOCUTORIO`, `FERNET`, `OJOS NUEVOS`…) | Cada letra es emisiva. Algunos carteles tienen una letra rota que titila; otros zumban. Cada cartel ilumina la calle con su color. |
| **Pantallas** | Marquesinas gigantes en las torres (`SE BUSCA: SUJETO 7741…`) | Texto que se desplaza sobre una franja emisiva. |
| **Piso mojado** | Los carteles se reflejan invertidos en el asfalto (`MOTEL` → `WOTEL`) | El mismo espejo del lago del modo Glifo: cada celda de calle sabe a cuántas filas está la fachada de arriba. Charcos por ruido; con aguacero, toda la calle es espejo. |
| **Lluvia** | Gotas que toman el color del neón que atraviesan | Cada gota consulta la luz de su celda. |
| **Bloom** | Halo de color alrededor de cada neón | Mapa emisivo de 1 px por celda, desenfocado y sumado con `lighter`. |
| **Tráfico** | Autos con faros, luces traseras y reflejo en el piso; frenan si hay alguien en el carril y te tocan bocina | Simulación por carril, con distancia de frenado y seguimiento del auto de adelante. |
| **Autos voladores** | Cruzan por arriba de todo; las patrullas tienen sirena y un reflector que barre la calle | Si el reflector te toca, alerta a los drones cercanos. |
| **Multitud** | 150 peatones con paraguas LED, que caminan por veredas y pasajes, cruzan por la senda peatonal y hablan solos | Te esquivan, huyen cuando hay pelea y sueltan frases del barrio. |
| **Vapor** | Las alcantarillas largan vapor que se tiñe del neón que tiene cerca | Partículas iluminadas. |
| **Holograma** | Un toro 3D gigante girando sobre la plaza, con scanlines y glitch | Rasterizador de toro en caracteres (rampa `.,-~:;=!*#$@`) con z-buffer propio. |
| **Smog** | Niebla teñida por la luz: alrededor de los carteles es magenta o cian | La niebla mezcla hacia el color de la luz local, no hacia gris. |
| **Apagón** | Los carteles se apagan uno por uno, las ventanas también, y quedan velas y los conos rojos de los drones | Cada cartel tiene un umbral de energía propio, así que el corte se propaga. |

---

## Combate y sigilo

- **Drones de seguridad** (`╓─◉─╖`): patrullan entre dos puntos barriendo con un cono rojo.
  Si te ven más de 0,35 s, llaman a los drones de la zona.
- **La luz es exposición.** El alcance del cono depende de cuánta luz tenés encima. Bajo un
  neón te ven a 11 celdas; en un pasaje oscuro, a 4.
- **Ataque:** el dron se pone rojo, tiembla y dispara 5 de sus propias piezas, que dejan una
  estela de `0` y `1`.
- **Tajo monofilo:** corta las piezas en el aire y lastima drones.
- **Pulso EMP:** un anillo que, en 11 celdas, apaga carteles y faroles, deja los autos sin
  motor, aturde a los drones (caen y se les corrompen las letras) y asusta a la gente. Es ataque
  y sigilo a la vez: **apagar la cuadra te esconde.**
- **Muerte de un dron:** las piezas caen al piso, rebotan, se convierten en `0`/`1` verdes y se
  escurren. A los 12 s el dron se rearma bajando del cielo.
- La alerta se apaga si ningún dron te ve durante unos segundos.

---

## Rendimiento

El cuello de botella no era la lógica sino el atlas de glifos. Si se rasteriza un glifo nuevo y
enseguida se lo dibuja, el navegador vuelve a sincronizar el atlas entero, y la ciudad estrena
colores en cada frame (lluvia teñida, parpadeos, smog). Por eso los glifos **se encolan** y se
dibujan juntos al final: primero se rasteriza todo lo que falta y después se copia, con una sola
sincronización por frame.

Medido en Chromium headless **sin GPU**, 412×860:

| dpr | Llovizna | Aguacero | Smog | Apagón |
|---|---|---|---|---|
| 1 | 38 fps | 36 fps | 39 fps | 50 fps |
| 2 | 21 fps | 20 fps | 20 fps | 26 fps |

La lógica entera (luz, edificios, multitud, tráfico, drones) cuesta unos 6 ms por frame. El
resto es copiar ~2.500 glifos por software. Falta medir en el Samsung, que tiene GPU. En Pixi esto
sería un `ParticleContainer` con un solo draw call.

---

## Cómo encaja con el servidor

Igual que en `GLIFO.md`: el servidor manda.

- **Autoritativo:** posición del jugador, drones (estado, objetivo, piezas lanzadas como
  proyectiles con id), alerta por zona, energía por cuadra (si alguien hizo un EMP o hay apagón,
  todos lo ven), y la salud.
- **Solo cliente:** peatones de fondo, tráfico, autos voladores, lluvia, vapor, reflejos,
  holograma y parpadeo de carteles. Salen de semillas y no gastan red.
- **Un paso más:** el tráfico y los peatones pueden pasar al servidor más adelante, si chocar
  con un auto o empujar gente tiene que ser compartido.

---

## Qué sigue

| Fase | Qué | Aceptación |
|---|---|---|
| N0 ✅ | Prototipo de la ciudad (`docs/glifo/neon.html`) | Barrio recorrible con clima, apagón, multitud, tráfico y drones, sin errores. |
| N1 | Interiores: entrar a un local (`RAMEN`, `CLÍNICA`) con su propio mapa en caracteres | Entrar y salir de 3 locales sin cortes de carga. |
| N2 | Hackeo: apagar un cartel, abrir una persiana o cegar un dron desde una terminal | Un hackeo cambia el mundo para todos los jugadores de la zona. |
| N3 | Jefe: un **mecha de carga** de 30×16 caracteres que se desarma en piezas que atacan | Un grupo de 3 lo vence rompiendo partes. |
| N4 | Facciones y reputación por barrio | Los peatones y vendedores reaccionan distinto según tu reputación. |

### Decisión pendiente
Nueva Ceniza no entra en Velgrim como "modo de render": es otro mundo. Las opciones:
- **A.** Juego hermano con el mismo servidor y la misma cuenta (`velgrim.gg/ceniza`).
- **B.** Una zona de Velgrim a la que se llega por un portal (fantasía → futuro). Más raro, más trabajo de lore.

Recomiendo **A**.
