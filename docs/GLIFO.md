# GLIFO.md — Velgrim escrito con letras

Diseño de una variante ASCII de Velgrim inspirada en el MMORPG de **Ansenjeo** (@Ansenje21,
también "Senje"), pero llevada más lejos. Prototipo jugable: `docs/glifo/prototipo.html`
(abrilo directo en el navegador, anda en el celu).

---

## 1. Qué sabemos de Ansenjeo (y qué no)

Ansenjeo es un dev indie que trabaja solo en un MMORPG de fantasía oscura dibujado entero con
caracteres. Muestra el avance en reels de Instagram, X y YouTube, y anunció una página de Steam.

**El código no es público** y los videos están en reels que no pudimos ver. Lo que sigue sale de
la descripción del proyecto y de un fan-prototipo ([Cripta ASCII](https://github.com/oalanicolas/games-cripta-ascii),
Three.js, hecho a partir de tres de sus videos):

| Lo que hace | Por qué funciona |
|---|---|
| Pasto con física, agua que refleja en tiempo real, tormentas, fuego | El ASCII deja de ser un mapa estático: **cada letra está viva**. |
| Las criaturas se desarman en símbolos sueltos para atacar | El arte **es** la mecánica. El enemigo no tira un proyectil: se tira a sí mismo. |
| Jefes enormes con ataques marcados en el suelo | Las letras sirven para comunicar zonas de peligro sin UI extra. |
| Online persistente | Lo hace MMO y no un roguelike de terminal. |

Lo que **no** sabemos: si su render es una grilla 2D o 3D con un shader ASCII encima (el
fan-prototipo usa 3D), cómo hace el netcode y cuál es su progresión. No copiamos nada de eso:
tomamos la idea estética y la resolvemos a nuestra manera.

---

## 2. Qué hacemos mejor

Seis apuestas. Cada una tiene que hacer que el mundo se sienta **más habitado**, no más lleno de botones.

1. **El mundo recuerda.** El pasto pisado queda aplastado (`_ .`), el pasto quemado queda como
   ceniza y tarda 45 s en volver a crecer (`, '`), un árbol alcanzado por un rayo queda muerto (`Ψ`).
   En el MMO esto vive en el servidor: si alguien incendió la colina hace diez minutos, vos
   llegás y ves la cicatriz. Las huellas de otro jugador te dicen que alguien pasó por ahí.
2. **Los sistemas se cruzan.** La lluvia apaga el fuego y achica la fogata. El viento empuja las
   llamas y la dirección en que se propaga el incendio. Un rayo prende un árbol. La Brasa prende el
   pasto alto, pero no el que cortaste con el Tajo. Los aparecidos se lastiman si flotan sobre brasas.
   Nada de esto es un efecto suelto: cada cosa tiene consecuencias.
3. **La luz es real.** Luces de color con sombras proyectadas (las paredes tapan, los árboles
   tapan a medias) y un halo suave debajo de las letras. En la oscuridad las letras directamente
   no existen: lo que no ilumina tu farol no se dibuja.
4. **Las letras se mueven libres.** La grilla es para el terreno. Criaturas, partículas,
   proyectiles y lluvia se mueven en posiciones continuas, con cámara suave subpíxel. Nada salta
   de celda en celda.
5. **Contraataque tipográfico.** Cuando un aparecido te tira sus letras, las podés **cortar en el
   aire** con el Tajo. Leer la letra que viene es parte del combate.
6. **Mobile-first de verdad.** Joystick que aparece donde apoyás el dedo, botones grandes,
   cuerpo de letra calculado según la pantalla y un presupuesto de ~3.000 glifos.

---

## 3. Gramática visual

Las letras tienen que leerse siempre igual. Si un símbolo significa algo, significa siempre lo mismo.

| Glifo | Qué es | Color |
|---|---|---|
| `@` | vos | hueso cálido |
| `\| / \` | pasto alto; se inclina con el viento y cuando pasa alguien | verde, brilla al doblarse |
| `,` `'` `"` | pasto corto | verde apagado |
| `_ .` | pasto pisado o cortado | verde gris |
| `♣ ♠` | árbol | verde profundo |
| `Ψ` | árbol muerto (quemado) | ceniza |
| `~ - ·` | agua; refleja lo que hay en la orilla, invertido (`/`↔`\`, `^`↔`v`) | azul |
| `#  ▓` | muro / ruina | piedra |
| `†` | tumba | hueso frío |
| `^ * : & #` | fuego, según el calor | rojo → naranja → amarillo |
| `( o o )` | aparecido; los ojos `o` son rojos y emiten luz | gris azulado |
| letras violetas en vuelo | letras de un aparecido que te atacan | violeta |
| `\| / \` diagonal fina | lluvia; la inclinación sale del viento | azul pálido |

Reglas:
- **Rojo = te lastima.** Ojos, telegrafía de ataque, brasas.
- **Violeta = cortable.** Todo lo violeta se puede cortar con el Tajo.
- **Emisivo = no depende de la luz.** El fuego y los ojos se ven en la oscuridad total.

---

## 4. Sistemas

### Render
- **Atlas de glifos**: cada combinación (carácter, color cuantizado a 12 bits) se rasteriza una
  vez y después se copia. En el prototipo es un canvas 2D; en el juego es un `BitmapFont` /
  textura de Pixi y un `ParticleContainer`: **un solo draw call**.
- Por frame: glifo base de cada celda → luz → color final → agua → niebla → dibujar.
- **Halo**: una imagen de baja resolución (una celda = un píxel) con la luz extra, escalada con
  suavizado debajo de las letras. Da resplandor sin costo.
- La región de cálculo tiene 12 filas extra arriba de la pantalla: es de donde el agua saca el reflejo.

### Luz
- Ambiente según el clima. Luces puntuales: fogata, farol del jugador, ojos, Brasa, destellos.
- Sombras: raycast de cada luz a cada celda de su radio (muro = 1, árbol = 0,55, roca = 0,3).
- El rayo levanta el ambiente entero por un instante.

### Pasto
- Cada celda tiene un ángulo y una velocidad (resorte amortiguado).
- Objetivo = viento (ruido que viaja en la dirección del viento → **olas** que cruzan el campo)
  + empuje de criaturas cercanas (se aparta para el lado contrario).
- Solo se simula lo que está en pantalla.

### Agua
- Para cada celda de agua se guarda la distancia a la orilla de arriba (`d`). El reflejo es la
  celda de tierra a `2d−1` filas hacia arriba, con el glifo invertido, oscurecido y teñido de azul.
- Ondas: corrimiento horizontal senoidal; con lluvia, más fuerte y con ruido. Las olas altas
  rompen el reflejo. Las gotas que caen al agua dejan anillos `o`.
- Las criaturas y el jugador también se reflejan si están a menos de 3 celdas de la orilla.

### Fuego
- **Fogata**: autómata de calor de 9×7; el calor sube, se enfría y se inclina con el viento.
- **Incendio**: cada celda que arde intenta prender a sus vecinas (más en la dirección del
  viento, mucho menos con lluvia). Pasto alto > pasto corto > árbol. Tope de 380 celdas ardiendo.
- Deja ceniza que se regenera. En el MMO, el incendio corre en el servidor con tick de 10 Hz.

### Clima
- Despejado, Lluvia, Tormenta, Niebla. Las transiciones son graduales (lluvia, viento, niebla y
  luz ambiente se interpolan).
- Tormenta: rayos cada 4–10 s que caen en un punto visible, prenden lo que tocan y lastiman.
  El trueno sacude la pantalla un rato después del destello.
- Niebla: ruido que se mueve y más densidad cuanto más lejos del jugador.

### Criaturas de glifos
- Una criatura es un **arte ASCII** donde cada carácter es una partícula con posición propia y
  una posición de reposo relativa al cuerpo.
- Estados de cada letra: `unida` → `en vuelo` (ataque) → `dispersa` (golpe) → `volviendo` → `unida`.
- Ataque: telegrafía de 0,75 s (las letras se ponen rojas y tiemblan), después 6 letras salen
  escalonadas hacia vos. Si las cortás, se dispersan.
- Muerte: todas las letras salen volando y se desvanecen. Para reaparecer, las letras vuelven
  volando desde lejos y se rearman.

### Jefes masivos (siguiente paso, no está en el prototipo)
- Un jefe es un arte de 20×12 o más. Los ataques **son partes de su cuerpo**: un brazo de `|||`
  que barre el suelo, una boca `VVV` que escupe letras, una cola que se desarma en un anillo.
- Las zonas de peligro se marcan en el suelo con glifos (`x x x` que se van llenando) y no con
  círculos de UI.
- Romper partes: cortar suficientes letras de un brazo lo deja sin ese ataque. La forma del
  jefe muestra cuánto daño lleva; no hace falta barra de vida.

---

## 5. Cómo encaja con Velgrim

- **El servidor manda, igual que hoy.** El servidor sabe dónde está cada criatura, qué letras
  lanzó (son proyectiles normales con id, origen, dirección y velocidad), qué celdas arden y
  qué celdas quedaron con ceniza. El cliente solo anima: el pasto, las ondas, la lluvia y el
  temblor de las letras son cosméticos y se calculan con semillas, así que no ocupan red.
- **Mapas de Flare.** `convert_maps.py` ya saca `background`/`object`/`collision`. Una tabla
  `tile Flare → glifo` convierte esos mapas a letras. Siguen siendo CC-BY-SA: la atribución en
  `CREDITS.md` se mantiene.
- **Los glifos son nuestros.** La fuente (JetBrains Mono) es OFL, libre para usar y empaquetar.
  No hay arte de Flare en este modo, así que no hay copyleft sobre el render.
- **Ítems, misiones, gremios y economía no cambian.** Es otra forma de dibujar el mismo mundo.

### Decisión pendiente
Hay dos caminos y es tu decisión:
- **A. Modo de render** dentro de Velgrim (un toggle en Ajustes). Barato, reusa todo, y el modo
  glifo anda mejor en celus de gama baja que los sprites.
- **B. Juego hermano** ("Velgrim: Glifo") con su propio arranque, mismo servidor y misma cuenta.
  Más identidad propia, más trabajo de UI.

Recomiendo **A primero**: se valida la estética con jugadores reales sin bifurcar el proyecto.

---

## 6. Rendimiento

- Medido en Chromium headless **sin GPU** (412×860, dpr 2): la lógica entera (luz, pasto, fuego,
  IA) cuesta **< 1 ms por frame**. Todo el resto es dibujar ~2.500 glifos, que sin GPU da
  25–45 fps según el clima. Falta medir en el Samsung; con Pixi y un solo draw call debería sobrar margen.
- Límites: ~3.000 celdas visibles, 700 partículas, 380 celdas ardiendo, raycast de luz solo en
  radios cortos.

---

## 7. Fases

| Fase | Qué | Aceptación |
|---|---|---|
| G0 ✅ | Prototipo de estética (`docs/glifo/prototipo.html`) | Pasto, agua, fuego, clima y aparecidos andando en el celu sin errores. |
| G1 | Renderer de glifos en Pixi (`client/engine/GlyphRenderer.js`) + mapas Flare → glifos | Triston recorrible en modo glifo a 60 fps en el Samsung. |
| G2 | Incendio, ceniza y huellas en el servidor | Dos clientes ven la misma cicatriz de incendio. |
| G3 | Criaturas de glifos con letras-proyectil autoritativas | Cortar letras en el aire funciona online sin desync. |
| G4 | Primer jefe de glifos con partes rompibles | Un grupo de 3 lo mata y la forma muestra el daño. |
