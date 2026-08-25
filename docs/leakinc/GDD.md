# CÓMO HACKEAR — diseño

> Un pibe, un garaje, y una industria entera que se está cagando de miedo.
> **Hackeás estudios, filtrás sus juegos, y cuanto más pánico causás, más te pagan
> y más gente te viene a buscar.**

3D low-poly, ojos saltones, primera persona. Cinco zonas, cinco jefes, y armas hechas
de basura informática.

Referencias y por qué: [`REFERENTES.md`](REFERENTES.md).

---

## 1. La idea en una frase

*How to Fish* te engaña: parece pesca tranquila y termina con francotiradores y peces-jefe.
**Acá el engaño es al revés:** parece un juego de hackear y a los cuatro minutos hay un
notificador judicial corriéndote por el jardín mientras vos le pegás con un teclado mecánico.

---

## 2. EL NIVEL DE PÁNICO — el sistema central

No es tu nivel de búsqueda. Es **cuánto miedo tiene la industria**. Uno solo, global,
gigante en pantalla.

**Y acá está el truco que no tiene ninguno de los tres referentes:**

> ### El pánico es tu lista de precios Y tu sentencia.
> Cuanto más asustados están, **más pagan por lo que filtrás**. Y más gente hay
> buscándote. Un solo número que es la recompensa y el castigo.

| Pánico | Cómo se ve el mundo | Multiplicador de precio | Quién te busca |
|---|---|---|---|
| `0–19` **CALMA** | Vecinos regando el pasto | ×1 | Nadie |
| `20–39` **RUMOR** | Los foros hablan. Aparecen insiders truchos | ×1,6 | Un notificador judicial |
| `40–59` **COMUNICADO** | Los estudios postergan anuncios | ×2,5 | Pasantes de compliance |
| `60–79` **EMBARGO** | No se anuncia nada. Los tráilers son gameplay falso | ×4 | Seguridad privada. **Patrullas en el barrio** |
| `80–94` **HISTERIA** | Cancelan el E3. Hay drones | ×7 | Cazarrecompensas armados |
| `95–100` **LA REDADA** | — | — | Todos, a la vez, en tu casa |

**Baja solo** si no filtrás nada por un rato. Eso genera el ritmo del juego:
**ráfaga → esconderse → ráfaga.** Igual que el toque de queda de Schedule I, pero al revés:
acá el peligro no viene de la hora, viene de vos.

**Se sube el pánico a propósito.** Antes de una filtración grande conviene hacer tres
chiquitas para inflar el precio. El jugador bueno **se pone en peligro a propósito**, que es
exactamente lo que hace divertido a Plague Inc.

---

## 3. El bucle, en tres lugares físicos

Todo pasa caminando, en primera persona. Nada de menús.

```
   ┌─────────────────┐        ┌──────────────────┐        ┌────────────────┐
   │   EL GARAJE     │  ───►  │    LA CALLE      │  ───►  │  EL COMPRADOR  │
   │ las torres      │        │ con el pendrive  │        │ el que paga    │
   │ ripean solas    │        │ encima, de noche │        │                │
   └────────▲────────┘        └──────────────────┘        └───────┬────────┘
            │                    ▲ acá está TODA                  │
            │                      la tensión                     │
            └──────────── plata, y el pánico sube ────────────────┘
```

**La lección grande de Schedule I:** el juego no es producir, **el juego es el viaje**.
Vas con el pendrive encima, de noche, y hay un tipo parado en la esquina que no sabés si
es un vecino o es de compliance.

### 3.1 En el garaje — RIPEAR
Comprás **torres** y las enchufás donde quieras. Cada torre ripea sola. Más torres = más
producción, más calor, **más ruido**. El ruido es literal: los vecinos se quejan, y una queja
de vecino es un renglón en el expediente.

Un pendrive lleno = una filtración lista para llevar.

### 3.2 En la calle — LLEVARLO
Salís. De noche hay más gente buscándote (toque de queda de Schedule I). Con el pendrive
encima, **si te alcanzan lo perdés**. Podés correr, esconderte detrás de un auto, o pelear.

Los perseguidores tienen los tres estados de Schedule I, traducidos:
| Estado | Qué hacen |
|---|---|
| **NOTIFICANDO** | Te quieren entregar un papel. Si te tocan, perdés plata |
| **BUSCADO** | Te corren para sacarte el pendrive |
| **ORDEN DE CAPTURA** | Te corren armados |

### 3.3 En el comprador — FILTRARLO
Seis compradores, cada uno en un lugar distinto del mapa, **cada uno con preferencias**
(la mecánica de clientes de Schedule I):

| Comprador | Dónde | Quiere | Paga | Pánico |
|---|---|---|---|---|
| **El pibe del cyber** | a media cuadra | lo que sea | poco | `+1` |
| **El Discord** | tu propia pieza | video | poco, seguro | `+2` |
| **@fuentefiable** | en un banco de la plaza | texto | clout, no plata | `+3` |
| **El youtuber** | una camioneta con vidrios polarizados | video | mucho | `+8` |
| **La periodista** | un café que cierra a las 2 | correos, documentos | bien | `+5` |
| **El estudio rival** | un estacionamiento vacío | código, hardware | muchísimo | `+12` |

Si el tipo de archivo coincide con lo que ese comprador prefiere, **cobrás doble**.
Y **variar el punto de entrega baja el calor** — repetir el mismo comprador tres veces
seguidas lo duplica. Robado directo de Schedule I y funciona.

---

## 4. Las armas — basura informática (escalada de How to Fish)

`manos → puño americano → pistola → escopeta → SMG → rifle` se traduce así:

| # | Arma | Tipo | Qué hace | Copy |
|---|---|---|---|---|
| 1 | **Las manos** | — | Nada, básicamente | *"Tenés túnel carpiano."* |
| 2 | **El teclado mecánico** | melee | Duplica el golpe. Se compra apenas podés | *"Switches azules. Hace un ruido bárbaro al pegar."* |
| 3 | **La antena wifi** | melee largo | Alcance enorme, daño ridículo | *"Trescientos metros de alcance. Dos de daño."* |
| 4 | **El router** | granada | Pulso que apaga a todos tres segundos | *"Reiniciá y probá de nuevo."* |
| 5 | **La pistola de calor** | pistola | Es para desoldar. También sirve | *"Doscientos ochenta grados."* |
| 6 | **La sopladora de hojas** | escopeta de aire | No mata: **empuja**. Puro caos físico | *"Era de mi viejo."* |
| 7 | **La impresora 3D** | ametralladora | Escupe piezas sin terminar | *"Adherencia de la primera capa: mala."* |
| 8 | **El cañón de placas de video** | lanzacohetes | Área grande | *"Cada disparo sale ochocientos dólares."* |
| 9 | **El Fire TV Stick** | francotirador | Apuntás con el control. Alcance infinito | *"Preguntale a Arion."* |
| 10 | **El NDA** | definitiva | Se lo tirás a alguien y **deja de existir legalmente** | *"No podés hablar de esto."* |

**La sopladora es el arma más importante del juego** y no hace daño. Empuja gente por
el escenario. En cooperativo va a ser insoportable, que es el objetivo.

---

## 5. Enemigos

| Enemigo | Aparece con pánico | Qué hace |
|---|---|---|
| **El notificador** | 20 | Camina hacia vos con un papel. Si te toca, perdés plata |
| **El pasante de compliance** | 40 | Lento, con carpeta. Te marca en el mapa |
| **El consultor** | 40 | **Ataque de PowerPoint**: te habla y te baja la vida sin tocarte |
| **Seguridad privada** | 60 | Campera, walkie, garrote |
| **El moderador** | 60 | Te **banea**: no podés usar armas diez segundos |
| **El cazarrecompensas** | 80 | Armado. En serio |
| **Dron de la Agencia** | 80 | Vuela, te ilumina, sube el pánico solo con verte |

Todos con ojos saltones. Todos ligeramente ridículos al caminar. Cuando les pegás, salen
volando y quedan tirados con los brazos para arriba.

---

## 6. Las cinco zonas y los cinco jefes

Estructura de How to Fish, tal cual: **zona → tarea → jefe → se abre la siguiente**.

| # | Zona | La tarea | El jefe |
|---|---|---|---|
| 1 | **El garaje y tu cuadra** | Filtrar tu primer archivo | *(ninguno — es el tutorial)* |
| 2 | **El barrio** | Diez filtraciones sin que te agarren | **EL INFLUENCER** — te tira hilos que hacen daño. Su barra de vida son ocho millones de seguidores |
| 3 | **El parque de oficinas** | Entrar a tres estudios medianos | **EL ABOGADO** — invulnerable hasta que le rompés el maletín. Ataca con demandas que te frenan |
| 4 | **El data center** | Aguantar una noche entera con pánico arriba de 70 | **LA AUDITORÍA** — no es una persona. Es una nube de papeles que te persigue |
| 5 | **El campus de la editorial** | Filtrar el juego que todavía no anunciaron | **EL CEO** — flota sobre un escenario de keynote y ataca **anunciando cosas** |
| ★ | *(el final)* | — | **AGENTE KESSLER** — te conoce mejor que vos |

---

## 7. Los objetivos (la escalada absurda)

| # | Lo que filtrás | Tipo |
|---|---|---|
| 1 | El menú de opciones de un indie | texto |
| 2 | Un personaje sin texturas | video |
| 3 | La banda sonora entera en `.wav` | audio |
| 4 | El guion completo del DLC | texto |
| 5 | La build jugable con marca de agua | video |
| 6 | **La consola nueva entera** | hardware |
| 7 | El código fuente del motor | código |
| 8 | Los correos del CEO | texto |
| 9 | **El juego que nunca empezaron a hacer** | video |
| 10 | **CÓMO HACKEAR**, el juego que estás jugando | código |

---

## 8. Los finales

| Final | Cómo | Qué pasa |
|---|---|---|
| **ALLANAMIENTO** | Pánico 100 | Nueve y diez de la mañana. Se llevan el router, la tablet de tu vieja y una campera que no es tuya |
| **CONTRATADO** | Mucho clout con mucho pánico | El estudio que más filtraste te ficha como **Jefe de Seguridad**. Tu primer día lo pasás borrando la filtración de otro pibe |
| **RECLUTADO** | Pánico 100 con clout altísimo | La Agencia te ofrece laburo en vez de cárcel. Ahora armás expedientes vos |
| **ADQUIRIDO** | Aceptar tres sobornos | Compran tu foro y lo ponen tras un muro de pago de 4,99 |
| **SE FILTRÓ SOLO** | Objetivo 10 | Filtrás este juego. La partida termina con tu propio nombre en el expediente |
| **EL E3** | Pánico en 100 durante cinco minutos sin que te agarren | La industria deja de anunciar cosas **para siempre**. Ganaste y arruinaste todo |
| **EL KIOSCO** | Retirarte con plata y pánico bajo | Vendés todo y abrís un kiosco. **El único final feliz, y casi nadie lo saca** |

Cada final da una tarjeta compartible en PNG.

---

## 9. Cómo se ve — la biblia visual

Todo sale de la investigación de `REFERENTES.md` §4.

### Los personajes
- **Cabeza:** una esfera. Sin boca, sin nariz, sin cejas.
- **Ojos saltones:** dos esferas blancas grandes, pupilas negras chicas, **con inercia** —
  se siguen moviendo un toque después de que el tipo frena. Toda la actuación está ahí.
- **Cuerpo:** una cápsula. **Brazos:** dos tubos. **Manos:** ninguna, un tubo redondeado.
- Proporciones mal a propósito: cabeza grande, piernas cortas.
- Caminan tiesos. Cuando les pegás, salen volando.

### El render
- **Flat shading, cero texturas.** Cada cara un color plano. Es lo que hace que se vea
  *cristalino* en vez de barroso.
- **Luz de color fuerte y contrastada.** Es lo que salva a un low-poly de verse barato:
  el violeta de una lámpara contra el crema de una pared.
- **Niebla** para dar profundidad y para no dibujar lo que está lejos.
- Siluetas gordas y legibles. Todo se reconoce por su forma, no por su detalle.

### Paleta
| | |
|---|---|
| Noche | `#1a1428` violeta sucio |
| Asfalto | `#2a2438` |
| Pared del garaje | `#e8dcc0` crema |
| Luz de las torres | `#c86bff` violeta · `#31e6ff` cyan |
| Faroles | `#ffb020` naranja sodio |
| Piel | `#c89a72` |
| **Pánico** | `#ff3b30` |

### Tipografía
- **Título:** manuscrita blanca, con temblor, sobre el 3D. Igual que la portada de
  How to Fish.
- **HUD:** una redonda gorda. Números grandes. Nada elegante.

---

## 10. Implementación

**Three.js sobre el stack del repo.** Vite ya está; three.js es la única dependencia nueva.
Sin servidor: `localStorage`. Segundo entry (`hack.html`), no toca nada de Velgrim.

| | |
|---|---|
| **Geometría** | Toda procedural, desde primitivas. Cero modelos, cero archivos |
| **Materiales** | `MeshLambertMaterial` con `flatShading: true` |
| **Personajes** | Una función `hacerTipo(colores)` que devuelve un `Group` |
| **Física** | Ninguna librería. Colisión de círculos contra paredes, gravedad a mano |
| **Disparo** | Raycast desde la cámara contra esferas de colisión |
| **Presupuesto** | 60 fps con 20 tipos en pantalla en un Samsung de gama media |
| **Controles** | WASD + mouse con pointer lock. Joystick táctil en celular |

### Fases

| Fase | Qué | Aceptación |
|---|---|---|
| **0** | Garaje + primera persona + un tipo con ojos saltones + el arma en pantalla | Camina y dispara a 60 fps. Los ojos saltones se ven graciosos |
| **1** | Torres, pendrive, un comprador, el medidor de pánico | Un ciclo completo: ripear → llevar → cobrar |
| **2** | La calle, la noche, tres tipos de enemigo, cuatro armas | El viaje con el pendrive encima da miedo |
| **3** | Los seis compradores, preferencias, calor por repetir | Se nota que conviene variar |
| **4** | Zonas 2 y 3 con sus jefes | Los jefes son distintos entre sí y son graciosos |
| **5** | Zonas 4 y 5, los siete finales, tarjeta compartible | Ningún final aparece en menos del 5% de las partidas |

**Duración objetivo:** 25–40 minutos por partida.

---

## 11. Línea roja

Nada operativamente útil: ni comandos, ni herramientas reales, ni técnicas copiables.
"Ripear" es enchufar un pendrive en una torre que hace ruido. Los estudios son inventados.
Toda la gracia está en los NDA, los embargos, los consultores y los influencers —
**nunca en enseñar a hacerlo.** Y el protagonista pierde, o lo compran, en cinco de los
siete finales.
