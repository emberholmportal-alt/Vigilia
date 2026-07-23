# Grabar los clips de gameplay del trailer (en tu PC, con GPU)

El trailer (`public/trailer.html`) toma las escenas de gameplay desde archivos externos en
**`public/trailer_clips/`**. Ahí están unos clips de placeholder grabados en el servidor sin GPU
(por eso se ven con pocos fps). Grabalos de nuevo en tu máquina —donde el juego corre a 60fps— y
reemplazá los archivos: el trailer los toma solos, sin reconstruir nada.

## Qué grabar

Cinco clips, ~5-6 segundos cada uno, **gameplay limpio** (sin texto encima: el trailer le pone la
etiqueta de ubicación y el subtítulo por arriba). Nombres de archivo esperados:

| Escena     | Archivo                          | Mapa               |
|------------|----------------------------------|--------------------|
| Multiplayer| `public/trailer_clips/town.webm`     | `triston` (online) |
| Minotauro  | `public/trailer_clips/minotaur.webm` | `black_oak_farm`   |
| Nieve      | `public/trailer_clips/snow.webm`     | `grot_lagoon`      |
| Mazmorra   | `public/trailer_clips/temple.webm`   | `temple_of_mez_1`  |
| Oasis      | `public/trailer_clips/oasis.webm`    | `oasis`            |

Formato: `.webm` (VP8/VP9) o `.mp4` (H.264). Si usás `.mp4`, renombralo a `.webm` **no** —
en su lugar editá el nombre en `public/trailer.html` (buscá `trailer_clips/` + `.webm`), o pedime
que lo cambie. Proporción **16:9**.

## Cómo grabar

1. Arrancá el cliente:
   ```bash
   npm install      # sólo la primera vez
   npm run dev
   ```
2. Abrí la página de grabación (encuadra el juego a 16:9, igual que el trailer):
   ```
   http://localhost:5173/record.html?scene=temple
   ```
   Elegí la escena con los botones de arriba. Cada escena carga el juego en el mapa correcto.
3. Entrá al juego (PLAY NOW → raza → nombre). La primera vez se crea el personaje; después queda
   guardado y entra directo.
4. Escondé la barra de ayuda con la tecla **H** y grabá el recuadro 16:9 ~6 segundos con tu
   grabador (OBS, Xbox Game Bar, QuickTime, etc.). Movete poco y con suavidad: menos paneo de
   cámara se ve mejor.
5. Guardá el archivo con el nombre de la tabla en `public/trailer_clips/`.
6. Recargá `public/trailer.html` — el clip nuevo ya aparece.

Teclas en `record.html`: **H** ocultar barra · **G** borde guía (para alinear el recorte) · **?** ayuda.

## Escenas con setup extra

### Multiplayer (`town`)
Necesita el servidor y jugadores de relleno. En terminales separadas:
```bash
npm run server                 # servidor autoritativo (usa archivo local, no requiere Postgres)
node tools/record/bots.mjs     # conecta 10 jugadores con razas y armaduras distintas
```
Después abrí `record.html?scene=town`, entrá (elegí Elfo) y grabá cuando veas la multitud alrededor
de la fuente. Ctrl+C corta los bots.

### Minotauro (`minotaur`)
El minotauro está lejos del spawn (tile 69,81). Para acercarlo:
```bash
node tools/record/minotaur_near.mjs on      # lo mueve a (64,66), nivel 4
# ... grabás la pelea ...
node tools/record/minotaur_near.mjs off     # REVERTÍ: deja el mapa como estaba
```
Elegí Enano (más resistente), caminá hasta el minotauro y hacé click encima para atacarlo.
Si a esa distancia no aparece (el juego suprime spawns muy pegados al jugador), probá una posición
un poco más lejos (`node tools/record/minotaur_near.mjs on 66 72 4`) o caminá hasta (69,81) con el
mapa original.

## Notas

- Los clips van a `public/trailer_clips/` (versionado). Pesan poco si son cortos.
- El trailer ya no embebe los videos: por eso `public/trailer.html` pesa ~3 MB en vez de ~6 MB.
- Si querés que el trailer vuelva a ser un **único archivo autocontenido** (para publicarlo como
  Artifact, por ejemplo), pasame los clips y los vuelvo a embeber como data URI.
