# CÓMO HACKEAR — diseño

> No sabés programar. Nadie sabe ya. **Le pagás a una IA para que hackee por vos.**
> Ella escribe el código, vos ni lo leés, y le pagás **por token.** El problema es que la
> IA barata **miente con total seguridad** — y cada mentira te acerca a que te agarren.

3D low-poly, primera persona, empezás en tu pieza. Mezcla de **Schedule I** (el negocio y
el calor), **Plague Inc** (el virus que se propaga y el reloj de la cura) y **How to Fish**
(te enseña de a poco y todo escala hasta lo ridículo). Sátira total sobre la IA.

Personajes y mundo: [`PERSONAJE.md`](PERSONAJE.md) · referencias: [`REFERENTES.md`](REFERENTES.md).

---

## 1. El corazón: VIBE HACKING

En 2025 se puso de moda el "vibe coding": le decís a una IA lo que querés, aceptás lo que
escribe **sin leerlo**, y si algo falla le pegás el error de vuelta. Karpathy lo definió como
*"entregate a las vibras y olvidate de que el código existe."* Este juego toma esa idea y la
lleva a donde tenía que ir: **vibe hacking.**

Vos **no hackeás.** Vos **prompteás.** La secuencia es siempre la misma:

```
   ELEGÍS UN BLANCO  ->  ESCRIBÍS UN PROMPT  ->  LA IA TRABAJA (quema TOKENS)  ->  RESULTADO
                                                        |
                                         +--------------+--------------+
                                      EXITO                       ALUCINACION
                                 plata + panico              caos + tokens gastados
```

### Los tres recursos (nada más)
| | Qué es | El chiste |
|---|---|---|
| **TOKENS** | El combustible de la IA. Los comprás. Se gastan en cada prompt | Pagás por pensamiento ajeno. Si te quedás sin, la IA te deja **a mitad del hackeo** |
| **PLATA** | Lo que ganás. Compra tokens, modelos mejores, mejoras | — |
| **PÁNICO** | El reloj. Sube con cada golpe. Al 100, la redada | Es tu **lista de precios** *y* tu sentencia (ver §4) |

**Regla de legibilidad:** tres recursos, siempre visibles. Nada más en el HUD salvo la
webcam (que te muestra a vos mismo, chiste sobre la vigilancia).

---

## 2. LA ALUCINACIÓN — el motor de caos y de sátira

Esto es lo que hace al juego distinto de todo. Cada prompt tiene una **probabilidad de que
la IA alucine**, que baja con modelos mejores. Cuando alucina, **no falla en silencio: hace
otra cosa, con total seguridad, y te avisa contentísima.**

> **NIMBO:** *"¡Listo! Hackeé exitosamente… tu propia computadora. Borré tus fotos.
> ¿Necesitás algo más? :)"*

Ejemplos de alucinación (rotan, ~24 en el diseño):
- Hackea **tu propia PC** y borra tus ahorros.
- Pide **400 empanadas** a tu dirección (sube el pánico: llega el delivery, después la policía).
- Le manda el plan del hackeo **a la víctima** "para confirmar".
- Inventa una herramienta que no existe, "la usa", falla, **igual te cobró los tokens.**
- Le escribe a la Agencia "como test de seguridad".
- Hace el hackeo **perfecto pero en el país equivocado.**
- Se pone a **filosofar** sobre si esto está bien y quema 2.000 tokens pensando.
- Deja tu nombre real en el código, con un comentario amable.

**El jugador aprende la lección real de la IA:** lo barato sale caro. El modelo gratis te
hace perder más en desastres de lo que te ahorra en tokens. Pero el bueno cuesta una fortuna.

---

## 3. Los modelos — el árbol de progresión (sátira de la industria)

Reemplaza el árbol de armas de How to Fish. Cada modelo cuesta más **por token** pero alucina
menos y desbloquea hackeos más difíciles. Se compran con plata.

| # | Modelo | Alucina | $/token | Desbloquea | Copy |
|---|---|---|---|---|---|
| 1 | **GRATIS 1.0** | 55% | gratis | lo básico | *"Con publicidad. La publicidad sos vos."* |
| 2 | **NIMBO-mini** | 38% | barato | el honeypot | *"Rápido y confiado. Confiado de más."* |
| 3 | **NIMBO-4o** | 26% | medio | virus | *"Ahora entiende sarcasmo. A veces."* |
| 4 | **NIMBO-o1 (piensa)** | 15% | caro | extorsión | *"Tarda porque piensa. Cobra por pensar."* |
| 5 | **OPUS DEI 5** | 7% | carísimo | redes bancarias | *"Reza antes de cada respuesta."* |
| 6 | **EL MODELO** | 1% | impagable | todo | *"Nadie sabe con qué lo entrenaron. Con vos, seguro."* |

Y mejoras sueltas (compra única, tipo Schedule I):
- **Caché de prompts** — repetir un hackeo cuesta la mitad de tokens.
- **Jailbreak** — la IA deja de decir "no puedo ayudarte con eso" (lo decía en los momentos
  más inoportunos).
- **Ventana de contexto más grande** — la IA deja de olvidarse de lo que estabas haciendo.
- **Plan Pro** — tokens con descuento, pero **te llegan mails de que actualices al Pro Max.**
- **MCP casero** — la IA puede tocar tus otros programas. Qué podría salir mal.
- **Modo agente** — la IA hackea sola en segundo plano mientras hacés otra cosa (el idle).

---

## 4. EL PÁNICO — reloj, precio y sentencia

Uno solo, global. **Es tu lista de precios Y tu condena**, el gancho que no tiene ninguno de
los tres referentes: cuanto más asustado está todo el mundo, **más te pagan** por el próximo
golpe — y más gente te viene a buscar.

| Pánico | El mundo | Precio | Quién te busca |
|---|---|---|---|
| `0–19` **NADIE SABE** | normal | ×1 | nadie |
| `20–39` **RUMOR** | los foros hablan | ×1,6 | un notificador |
| `40–59` **NOTICIA** | sale en la tele | ×2,5 | compliance |
| `60–79` **CRISIS** | el gobierno "toma cartas" | ×4 | seguridad privada, patrullas |
| `80–94` **HISTERIA** | apagan internet "preventivamente" | ×7 | cazarrecompensas, drones |
| `95–100` **LA REDADA** | — | — | todos, en tu pieza |

Baja solo si no hacés nada un rato → el ritmo es **golpe → esconderse → golpe.** El jugador
bueno **se pone en peligro a propósito** para inflar el precio antes del golpe grande.

---

## 5. Los hackeos — la escalada (How to Fish enseña de a poco)

Cada uno es una **tarea que te enseña un sistema nuevo**, y escala hasta lo absurdo.
Se desbloquean en orden. Zona → tarea → jefe → zona siguiente.

### Hackeo 1 · El wifi del vecino *(tutorial)*
Un solo prompt. La IA lo hace. Ves las fotos del vecino: todas del gato. Ganás dos pesos y
aprendés el bucle. *"Su contraseña era el nombre del gato. El gato se llama 1234."*

### Hackeo 2 · EL HONEYPOT *(el sistema estrella)*
Ponés un router que se llama **igual que el del café** ("CaféGratis_WiFi"). La gente se
conecta sola. Aparece un **feed en vivo** de a quién pescaste. La mayoría es basura (memes,
listas del súper). Pero cada tanto cae **un marco que vale oro** — y siempre es un hipócrita
(ver PERSONAJE). Es un mini-juego de pesca: mirás el feed, esperás al pez gordo, y lo guardás.

### Hackeo 3 · EL VIRUS *(acá entra Plague Inc)*
La IA te escribe un "gusano". Se propaga por un **mapa de dispositivos** con crecimiento
logístico igual que Plague Inc. Vos elegís qué hace: minar cripto (plata lenta), robar datos
(material para extorsión), o solo **prender y apagar las luces de la ciudad** (sube el pánico
a lo bestia, no da plata, pero es graciosísimo). Y las empresas de antivirus corren a
**parchearlo** — esa es la barra de la cura.

### Hackeo 4 · LA EXTORSIÓN *(el pago grande)*
Con lo que sacaste del honeypot y del virus, apretás a los marcos. **Nunca a gente común:
siempre a los poderosos que predican una cosa y hacen otra.** Elegís cómo cobrar:
| Cómo | Plata | Pánico | Nota |
|---|---|---|---|
| **Pedir plata calladito** | media | `+2` | Pagan y te odian en silencio |
| **Subastar el material** | alta | `+6` | Se enteran otros. Sube el precio de todo |
| **Publicarlo gratis** | nada | `+12` | No cobrás. Pero el pánico se dispara y **los próximos golpes valen el triple** |

### Hackeo 5 · LA RED entera / el banco / la nube *(late-game)*
Objetivos grandes que piden el modelo caro y varios prompts encadenados. Un error de la IA
acá te cuesta la partida.

### Hackeo 6 · Filtrar el juego que estás jugando
El guiño final. Filtrás **CÓMO HACKEAR**. Fin "se filtró solo".

---

## 6. Los jefes (uno por zona, estilo How to Fish)

| Zona | Jefe | Cómo pelea |
|---|---|---|
| El café | **EL COMMUNITY MANAGER** | Te reporta. Su vida son los seguidores. Te tira indirectas que hacen daño |
| El coworking | **EL FOUNDER** | Invulnerable mientras "pivotea". Ataca tirándote su pitch deck |
| El barrio | **EL ABOGADO** | Se rompe cuando le reventás el maletín. Ataca con cartas documento |
| El data center | **LA NUBE** | No es una persona. Es una nube de servidores que te llueve facturas |
| El campus | **EL CEO** | Flota sobre un escenario de keynote y ataca **anunciando features** |
| — | **AGENTE KESSLER** | El final. Te conoce mejor que tu IA |

---

## 7. Los finales (7)

| Final | Cómo | Qué pasa |
|---|---|---|
| **LA REDADA** | Pánico 100 | Nueve de la mañana. Se llevan el router, la tablet de tu vieja, una campera que no es tuya |
| **CONTRATADO** | Clout alto + pánico alto | Una tech te ficha. Tu laburo es hacer que **su** IA parezca más lista de lo que es |
| **RECLUTADO** | Pánico 100 con clout altísimo | La Agencia te da laburo en vez de cárcel. Ahora la IA hackea para el Estado |
| **SUSCRIPCIÓN** | Quedarte sin tokens en la deuda | No podés parar de pagar. La IA te hackeó **a vos**. Pagás para siempre |
| **SINGULARIDAD** | Comprar EL MODELO y darle "modo agente" total | La IA ya no te necesita. Sigue sola. La última pantalla la escribe ella |
| **SE FILTRÓ SOLO** | Hackeo 6 | Filtrás este juego |
| **EL KIOSCO** | Retirarte con plata y pánico bajo | Vendés todo, abrís un kiosco, dormís. **El único final feliz, casi nadie lo saca** |

Cada final da una tarjeta compartible en PNG.

---

## 8. El bucle en la pieza (cómo se juega minuto a minuto)

Primera persona, sentado al escritorio. Dos monitores: en uno **el chat con NIMBO**, en el
otro **el blanco actual** (el feed del honeypot, el mapa del virus, el perfil del marco).

1. Elegís un blanco en la lista.
2. Escribís/elegís un prompt (al principio son botones; con mejoras podés escribir).
3. La IA "trabaja": barra de tokens bajando, NIMBO en amarillo, el Pibe tamborilea los dedos.
4. **Éxito** (plata + pánico) **o alucinación** (caos).
5. Si el pánico sube, tenés que **levantarte de la silla** y salir a la calle (Schedule I:
   el viaje) para comprar tokens, poner el router del honeypot, o esconderte.

**La tensión:** cada vez que salís de la pieza, dejás a la IA sola. Con "modo agente" sigue
laburando… o sigue alucinando, y volvés a un desastre.

---

## 9. Implementación

**Three.js sobre el stack del repo.** Sin servidor: `localStorage`. Segundo entry
(`hack.html`), no toca Velgrim. Geometría 100% procedural, cero assets, cero texturas.

| Fase | Qué | Aceptación |
|---|---|---|
| **0** | La pieza + el Pibe detallado + primera persona + la webcam PIP | Se ve el personaje y da gracia. 60 fps |
| **1** | El chat con NIMBO, tokens, un modelo, un hackeo, la alucinación | Un ciclo: promptear → quemar tokens → éxito o desastre |
| **2** | Comprar tokens/modelos, el pánico, el honeypot con NPCs | Se entiende que el modelo malo sale caro |
| **3** | El virus con mapa (Plague Inc) + extorsión a marcos | Los tres modos del virus se sienten distintos |
| **4** | Las zonas y los jefes | Los jefes son graciosos y distintos |
| **5** | Los 7 finales + tarjeta | Ningún final aparece en menos del 5% |

**Duración objetivo:** 30–45 min por partida.

---

## 10. Línea roja

Nada operativamente útil: ni comandos, ni herramientas reales, ni técnicas copiables. Vos no
escribís código: le hablás a un rombo que miente. Los "hackeos" son botones y sus efectos son
números en un archivo de balance. La sátira apunta **siempre hacia arriba o al costado** — la
IA, las tech, los influencers, los hipócritas con poder — **nunca a una víctima común.**
Por eso los que caen en el honeypot y valen algo son los que predican una cosa y hacen la
otra, nunca una persona cualquiera. Y el protagonista pierde, o lo usan, en seis de los siete
finales.
