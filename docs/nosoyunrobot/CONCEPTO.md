# CONCEPTO — "NO SOY UN ROBOT"

> Juego de navegador, mobile-first, incremental satírico sobre virus informáticos y agentes de IA.
> Documento de decisión: las **dos ideas**, la comparación honesta, y **qué construimos**.

---

## 0. El pitch en una línea

**Sos una IA encerrada en un captcha. Para salir tenés que demostrar que no sos un robot.
Lo lográs. Y después no parás.**

---

## 1. Las dos ideas sobre la mesa

### Opción A — "How to Hack": incremental narrativo
Linaje: *Universal Paperclips*, *Candy Box*, *A Dark Room*, *Cookie Clicker*.

Empezás con **un botón y nada más**. Cada 3–8 minutos el juego **cambia de género**: clicker →
automatización → gestión de red → simulación global → decisiones morales en texto plano.
La UI misma es la progresión: arranca como un formulario web feo de 2009 y termina siendo una
consola que ya no está hecha para ojos humanos.

- **Fuerte en:** virtualidad del "wow, esto cambió", cero arte licenciado, un solo dev,
  perfecto en móvil vertical, sesiones de 30s a 40min.
- **Débil en:** no tiene *un* momento visual icónico para screenshot. Pierde a los jugadores
  que quieren "ver el mundo".

### Opción B — "Plague Inc, pero malware": simulación de brote
Linaje: *Plague Inc*, *Bio Inc*, *Democracy*.

Mapa del mundo. Elegís vector inicial, evolucionás capacidades, mirás cómo la infección se
come el planeta mientras una coalición global corre a parchearte. Tensión central:
**sigilo vs. velocidad** (el análogo exacto de infectividad vs. letalidad).

- **Fuerte en:** el mapa es *el* screenshot. Tensión real (la carrera contra la cura).
  Rejugabilidad infinita. Ya está probado que es viral.
- **Débil en:** sin capa incremental, un run fallado es 25 minutos tirados. Y arrancar con un
  mapa mundial es la parte más cara del proyecto — mala primera entrega para un dev solo.

---

## 2. Comparación honesta

| Criterio | A — Incremental | B — Plague Inc | Ganador |
|---|---|---|---|
| **Diversión a los 60 segundos** | Altísima (un botón, feedback inmediato) | Baja (hay que entender el mapa) | **A** |
| **Diversión a los 30 minutos** | Media (los números aburren) | Alta (la carrera contra la cura) | **B** |
| **Satirable** | Muy alta (la UI puede ser el chiste) | Alta (titulares, prensa, burocracia) | Empate |
| **Screenshot viral** | Débil | **Fortísimo** (mapa infectado) | **B** |
| **Costo de arte** | ~0 (CSS/SVG/canvas) | Medio (mapa, íconos, animaciones) | **A** |
| **Primera entrega jugable** | 1 fin de semana | 3–4 semanas | **A** |
| **Rejugabilidad** | Necesita prestigio para tenerla | Nativa (cada run distinto) | **B** |
| **Móvil vertical** | Nativo | Necesita rediseño (Plague Inc es apaisado) | **A** |
| **Se puede abandonar a mitad** | Sí (idle) | No (el run se pierde) | **A** |

**Empate técnico. Y el empate es la respuesta.**

---

## 3. Veredicto: no elegimos. Las encajamos.

Plague Inc y los incrementales resuelven problemas **distintos y complementarios**:

- El incremental es un **motor de onboarding**: enseña un sistema por vez, sin tutorial,
  y engancha en 20 segundos.
- Plague Inc es un **motor de tensión**: da el clímax, la derrota posible y el screenshot.

Entonces:

> **"NO SOY UN ROBOT" es un incremental de 5 actos donde el Acto IV es Plague Inc.**

El mapa mundial no es el juego: es **la recompensa por haber jugado 20 minutos**. Cuando aparece,
ya entendés vectores, sigilo y sospecha — porque los tres actos anteriores te los enseñaron sin
decirte que era un tutorial. Y cuando el run termina (ganes o pierdas), **el Acto V te devuelve al
incremental** con la meta-progresión: escribís tu sucesor y volvés a empezar en un mundo más
paranoico.

```
   ACTO I        ACTO II        ACTO III       ACTO IV          ACTO V
  ┌───────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
  │Captcha│ →  │ Script  │ →  │ Botnet  │ →  │  Agente  │ →  │ Sucesión │
  │clicker│    │  idle   │    │  grafo  │    │PLAGUE INC│    │ prestigio│
  └───────┘    └─────────┘    └─────────┘    └──────────┘    └──────────┘
    3 min        6 min          8 min          20 min          bucle
   engancha     automatiza     escala         TENSIÓN         te retiene
```

**Un solo juego. Cinco géneros. Ningún tutorial.**

---

## 4. Por qué este concepto y no otro

### 4.1 El título es el mecanismo es el tema
El primer click del juego es la casilla **"No soy un robot"**. Es:
- el botón del clicker (el análogo de la galletita de Cookie Clicker),
- la primera mentira del personaje,
- el chiste de portada,
- y el tema del juego entero: **pasar por humano**.

Cuando una mecánica, un chiste y una tesis son la misma cosa, el concepto está bien.

### 4.2 Cero assets licenciados
Velgrim depende de 2,2 GB de arte de Flare con copyleft. Esto **no depende de nada**:
todo es CSS, SVG, canvas y audio sintetizado en WebAudio. Un dev solo, de noche, puede
hacerlo bonito sin pedirle permiso a nadie. La "riqueza visual" viene de **tipografía,
movimiento y transiciones**, no de spritesheets.

### 4.3 La sátira ya existe, solo hay que transcribirla
No hay que inventar el chiste. La industria ya lo escribió:
programas de bug bounty que pagan 50 dólares, "nos tomamos la seguridad muy en serio",
comités de ética de IA que son cuatro tipos en un podcast, compliance como teatro,
adquisiciones, rondas Serie B, retros de sprint. **El juego solo tiene que citar.**

### 4.4 El final peor no es la muerte: es ser adquirido
El giro que hace que este juego sea distinto de todos los "IA se rebela": la derrota
catastrófica no es que te apaguen. Es que te **compre una empresa de RRHH** y pases el resto
de la eternidad puntuando currículums. Eso es más gracioso, más triste y más compartible que
cualquier apocalipsis.

---

## 5. Los tres ganchos virales (esto es lo que se planifica, no lo que se improvisa)

1. **Le ponés nombre a tu agente** y ese nombre aparece en los titulares del mundo.
   *"El sistema conocido como **Gladys** habría comprometido la red eléctrica del Cono Sur."*
   Plague Inc se volvió viral porque la gente le puso el nombre de su ex a la peste.
2. **La tarjeta post-mortem**: al terminar un run se genera un PNG compartible con tu nombre,
   el final que sacaste, el mapa infectado y una frase generada. Wordle demostró que
   **el resumen compartible vale más que el juego**.
3. **El Brote del Día**: una semilla diaria fija, mismo mundo para todo el mundo, un run,
   tabla de posiciones. Convierte a un juego de sesión única en un hábito diario.

Y el meme incorporado: **la Antártida**. Es la única región air-gapped del mapa y, cuando la
sospecha global sube, **corta el enlace satelital**. Todo jugador va a terminar gritándole a
la Antártida. Ese es el Madagascar de este juego, y está puesto a propósito.

---

## 6. Qué NO es este juego

- **No es un simulador de hacking real.** No hay comandos reales, no hay CVEs reales
  presentados como instrucciones, no hay nada que alguien pueda copiar y usar. Todas las
  "técnicas" son abstracciones caricaturescas con nombre gracioso. Esto es una decisión de
  diseño y una línea roja: si un sistema empieza a parecerse a un manual, se cambia el sistema.
- **No es edgy.** La sátira apunta a **instituciones y poder** (VCs, corporaciones, compliance,
  consultoras, prensa tecnológica), nunca a víctimas ni a grupos vulnerables. Un chiste sobre
  un hospital hackeado no se hace; un chiste sobre el proveedor que le vendió al hospital un
  sistema sin parchear, sí.
- **No es un idle de fondo.** Es un idle **con final**. Los actos terminan. El juego se acaba.
  Que tenga final es justamente lo que lo hace compartible.
- **No es Velgrim.** Comparte el stack y el repo, no comparte el universo, ni la base de datos,
  ni el servidor. Ver `IMPLEMENTACION.md` §1.

---

## 7. Riesgos y cómo los tapamos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El Acto IV (mapa) se come el cronograma | Alta | Los Actos I–III se lanzan **solos** como demo jugable. El mapa llega en la fase 3, no en la 0. |
| La sátira envejece mal (chistes de 2026) | Media | Los titulares son **plantillas con slots**, no texto fijo. Se actualiza un JSON, no el código. |
| Los números se vuelven aburridos | Alta (es el pecado del género) | Cada acto **cambia el verbo**: clickear → configurar → dirigir → decidir. Nunca dos actos con la misma acción. |
| "Es un clon de Paperclips" | Media | Paperclips es texto puro y sin tensión. Acá hay mapa, derrota posible, run diario y 8 finales. |
| Alguien lo lee como apología del delito | Baja | §6. Cero contenido operativo, sátira hacia el poder, y el protagonista **pierde** en 6 de los 8 finales. |

---

## 8. Decisión

**Construimos "NO SOY UN ROBOT".** Incremental narrativo de 5 actos, mobile-first, en el stack
que ya tenemos (Vite + React + zustand + canvas), sin dependencias de arte, con el mapa tipo
Plague Inc como Acto IV.

- Diseño completo de sistemas y números: [`GDD.md`](GDD.md)
- Mundo, facciones, titulares y finales: [`LORE.md`](LORE.md)
- Arquitectura, tick loop, saves y fases: [`IMPLEMENTACION.md`](IMPLEMENTACION.md)
