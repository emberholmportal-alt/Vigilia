# LEEK INC. — diseño

> Sos el **pasante** (no remunerado) de LEEK INC., un estudio de videojuegos.
> Hacés las tareas que nadie quiere: llevás café, repartís sobres, borrás spam, matás
> virus, regás las plantas (de plástico) y **evitás que se filtre el juego** que la
> empresa viene retrasando hace seis años. Te pagan en "experiencia".
>
> Es un **incremental**: mejorás tu PC, automatizás, ascendés, y los números no paran
> de subir. El chiste está en el nombre: LEEK INC. es una empresa que se dedica, sin
> querer, a **filtrarse a sí misma** (leek = leak = puerro; el logo es un puerro).

Incremental 2D, mobile-first. Referencias y por qué: [`REFERENTES.md`](REFERENTES.md).

---

## 1. La fantasía y por qué engancha

El incremental engancha por **dopamina de bucle corto**: hacés algo, sube un número,
comprás algo, el número sube más rápido. Nosotros le sumamos la **sátira de la oficina
tóxica** — el pasante explotado que igual se emociona porque le dieron un monitor nuevo.

**La tensión que lo hace un juego y no una planilla:** no alcanzás a hacer todo. Las
tareas caen más rápido de lo que podés. Si dejás que se acumulen las **filtraciones**,
el juego que la empresa esconde se escapa a internet y te echan. Entonces automatizás
para liberarte las manos, y volvés a tapar agujeros más arriba. Es *Cookie Clicker* con
un medidor de pánico arriba de la cabeza.

---

## 2. El bucle central (dopamina)

```
   CAEN TAREAS  ->  LAS RESOLVÉS (click)  ->  $ + COMBO  ->  MEJORÁS PC / BOTS  ->  caen más
        ^                                                              |
        |                                                     los BOTS resuelven
        +--------------------- solo, mientras no estás <---------------+
```

Los siete ingredientes de dopamina, todos presentes:
1. **Feedback inmediato** en cada click: pop, número que vuela, sonido visual.
2. **El número siempre sube**, cada vez más rápido.
3. **Compras baratas al principio**: una mejora cada pocos segundos.
4. **Automatización** que hace subir el número mientras mirás.
5. **Desbloqueos** que cambian la pantalla (nuevas tareas, nuevas responsabilidades).
6. **Ascensos** (prestige) con multiplicador permanente.
7. **Eventos random** y **combos** que dan picos de recompensa.

---

## 3. Recursos

| | Qué es | Nota |
|---|---|---|
| **$ Guita** | La moneda. Cada tarea resuelta da guita | Al principio te la dan como "experiencia". El primer ascenso la vuelve real |
| **COMBO** | Multiplicador por clickear seguido | Se enfría si parás. Con la silla gamer dura más |
| **FUGA (0–100)** | El medidor de pánico | Sube cuando una filtración se te escapa. Al 100 te echan (= ascenso forzado) |
| **★ LinkedIn** | Meta-moneda del ascenso | Sube tu multiplicador permanente entre partidas |

Tres cosas en pantalla siempre: **$**, **FUGA**, **COMBO**. Nada más.

---

## 4. Las tareas (cada una un chorrito de dopamina)

Caen en su estación. Tenés unos segundos para clickearlas antes de que "venzan".
Cada una vencida tiene su castigo.

| Tarea | Dónde | Vale | Si se vence… | Se desbloquea |
|---|---|---|---|---|
| **Borrar spam** 🗑️ | tu monitor | $ chico, muy seguido | se llena la pantalla | desde el inicio |
| **Llevar café** ☕ | escritorios | $ medio | el colega se enoja, −$ | desde el inicio |
| **Repartir sobres** ✉️ | tu bandeja | $ medio | se apilan, −$ | a los $50 |
| **Regar plantas** 🪴 | rincones | $ chico | la planta se seca, −$ (y es de plástico igual) | a los $150 |
| **Matar virus** 🐛 | tu monitor | $ alto | llega al server, +FUGA | a los $400 |
| **Tapar filtración** 🔴 | el server | $ muy alto | **el juego se filtra, +FUGA fuerte** | a los $1.000 |

La escalada es de How to Fish: empezás con café y spam, y terminás **conteniendo la
filtración del GTA VII mientras regás una planta de plástico.**

---

## 5. Las mejoras de PC (cambian CÓMO hacés las tareas)

Este es el corazón que pediste: **los componentes afectan el juego.** No son solo
multiplicadores abstractos, cada uno cambia una mecánica.

| Componente | Qué cambia de verdad |
|---|---|
| **Teclado mecánico** | Cada click vale más. Y hace un ruido delicioso |
| **CPU** | Combo más alto y las tareas se resuelven al toque |
| **RAM** | Más tareas simultáneas manejables (sube el techo antes de saturarte) |
| **SSD** | Las tareas **tardan más en vencerse** (te da tiempo) |
| **GPU** | Renderiza el juego de la empresa = **ingreso pasivo $/s** |
| **Segundo / tercer monitor** | Ves más lejos: las tareas aparecen marcadas antes |
| **Fibra óptica** | Los bots trabajan más rápido |
| **Silla gamer** | El combo se enfría más lento (aguantás la racha) |
| **Cooler** | Clickear rápido ya no te "recalienta" (sin cooler, spamear clicks te frena) |

Cada uno tiene niveles, con el costo clásico `×1,15`.

---

## 6. La automatización (el idle, la sátira del "equipo")

Delegás cada tarea a un bot o a otro pasante. Es lo que te libera las manos para las
tareas caras, y lo que hace subir el número mientras no jugás.

| Bot | Automatiza | Chiste |
|---|---|---|
| **Filtro de spam** | borrar spam | "Marca como importante los que importan. A veces." |
| **Robot barista** | llevar café | "Hace un café horrible, pero puntual." |
| **Cadete** | repartir sobres | "Otro pasante. Tampoco le pagan." |
| **Roomba regadora** | regar plantas | "Riega el piso. Las plantas son de plástico igual." |
| **Antivirus** | matar virus | "Detecta el 60%. El resto sos vos." |
| **Equipo de Legales** | tapar filtraciones | "No las tapan. Amenazan al que las mira." |

Cada bot tiene niveles (más rápido / cubre más). El chiste final: cuando tenés todo
automatizado, **la oficina funciona sin vos** — y ahí te ascienden a manejarla.

---

## 7. El ascenso (prestige — dopamina de reinicio)

Cuando la FUGA llega a 100 **te echan**… pero como sabés demasiado, te **ascienden para
que no hables.** O te vas vos cuando querés. Reiniciás tareas y mejoras, y ganás
**★ LinkedIn** (según la guita total de la corrida), que da un **multiplicador
permanente.**

`Pasante → Junior → Semi-Senior → Senior → Lead → Manager → Director → CEO`

Cada rango sube la dificultad **y** la sátira: de Lead para arriba ya no hacés tareas,
**las repartís** (el juego cambia: tu click ahora asigna tareas a los pasantes de
abajo, que sos vos mismo en la vida anterior). Al llegar a CEO, tu única tarea es
**anunciar que el juego sale el año que viene.**

---

## 8. Eventos random (picos de dopamina)

Aparecen solos, banner arriba, duran poco:
- **HORA FELIZ** — ×3 la guita 15 segundos.
- **CRUNCH** — todo cae al doble. Más guita, la FUGA sube más rápido.
- **EL CEO PASA POR TU ESCRITORIO** — clickealo para un bono; si lo ignorás, te deja tareas.
- **PIZZA GRATIS** — resetea el recalentamiento y llena el combo.
- **SE CAYÓ EL WIFI** — los bots se frenan 10 segundos. Todo tuyo.
- **"SOMOS UNA FAMILIA"** — mail del CEO. Sin efecto. Puro daño psíquico.

---

## 9. Estilo visual

Chunky, colorido, cero grises corporativos salvo para el chiste. Emoji para las tareas
(legibles, universales, gratis), UI con bordes gordos negros y sombra dura, números
que **saltan** (no se deslizan). Toda la pantalla responde: brillo en la estación,
flash en un combo grande, temblor cuando se te escapa una filtración.

- **La oficina:** vista frontal recortada. Tu escritorio adelante (monitor grande donde
  caen spam y virus), atrás la oficina abierta (escritorios de colegas, cafetera,
  plantas, el rack del server con la lucecita de la FUGA).
- **Vos:** un muñeco con ojos saltones, ojeras y una remera de la empresa.
- **Paleta:** crema oficina `#f4ecd8`, alfombra `#3a7d6a`, acento lima `#c8ff2e`,
  alarma `#ff3b30`, y el violeta de la pantalla en la cara.

---

## 10. Implementación

Stack del repo: **Vite + JS**, `localStorage`, sin servidor. Segundo entry (`leek.html`),
no toca Velgrim. Cero assets: emoji + CSS + un canvas chico para partículas.

| Fase | Qué | Aceptación |
|---|---|---|
| **0** | Oficina + caen spam/café + click + $ + combo + números que vuelan | 60 s y no querés soltarlo |
| **1** | Mejoras de PC (las 9) + los desbloqueos de tareas por hito | Comprás algo cada pocos segundos |
| **2** | Bots (idle) + FUGA + eventos | Cerrar y volver se siente premio |
| **3** | Ascensos + ★ LinkedIn + el cambio de "hacés" a "repartís" | Rejugar da algo nuevo |
| **4** | Balance, tarjeta compartible del rango final | Ningún muro muerto |

**Duración objetivo:** primera corrida 20–30 min hasta el primer ascenso; después,
corridas más rápidas y más locas.

---

## 11. Línea roja

La sátira apunta **al empleador**, no al trabajador: pasantías no pagas, "somos una
familia", crunch, el CEO que promete y no cumple, la industria que se filtra sola.
Nada operativamente útil: "matar un virus" es clickear un bichito. Los estudios son
inventados. El pasante es el héroe explotado, no el villano.
