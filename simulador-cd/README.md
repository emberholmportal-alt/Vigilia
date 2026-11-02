# Simulador CD — Operario de depósito (prototipo three.js)

Prototipo de entrenamiento para personal de **centros de distribución** en Argentina.
Es independiente de Velgrim: un único `index.html` **autocontenido** (incluye
**three.js 0.160** y **cannon-es 0.20**, ambos MIT). No descarga nada: se abre con doble
clic y funciona sin internet.

## Cómo correrlo

Abrí `index.html` con doble clic. Para probarlo en el celular desde la PC:

```bash
cd simulador-cd && python3 -m http.server 8080   # http://<ip-de-la-pc>:8080
```

## Código fuente y rebuild

El código legible está en `src/main.js`. Para regenerar el bundle que va dentro de `index.html`:

```bash
npm i three@0.160.0 cannon-es@0.20.0 esbuild
npx esbuild src/main.js --bundle --minify --format=iife --target=es2020 --outfile=out.js
# reemplazar el contenido del <script> de index.html por out.js
```

Mobile-first: joystick virtual + botón de acción. En PC: `WASD`/flechas, `E`/`Espacio`,
`Esc`, `R` (rotar cámara), `V` (primera persona on/off), rueda = zoom.

## Cámara

- **Caminando**: vista general en tercera persona, para orientarse en el depósito.
- **Al hacer una acción** (tomar una caja, apoyarla en el pallet, levantar una caída,
  enfilmar): la cámara pasa a **primera persona**, desde los ojos del operario, con
  manos (guantes) y caja a la vista. Al terminar vuelve sola a la vista general.
  Se puede desactivar con 👁 / `V`.

## Qué se practica (flujo de un pedido)

1. **Picking por pedido con terminal RF.** La terminal lista las líneas con ubicación
   (`Fila-Columna-Nivel`, ej. `A-03-0`), producto, peso y si es frágil o químico.
   La terminal valida producto y cantidad (como el escaneo de EAN-13/DUN-14).
2. **Reposición desde pulmón (FEFO).** Una línea siempre queda sin stock en picking.
   Se pide reposición y se elige qué pallet del pulmón (nivel 1 o 2) baja el
   autoelevadorista, según el vencimiento. Elegir el que vence después penaliza.
   El autoelevador está animado (traslado, giro, elevación del mástil, horquillas) y tiene
   una **zona de seguridad**: si el operario entra, es una falta.
3. **Armado del pallet ARLOG 1000×1200.** Cada caja se apoya en una grilla 3×3. Reglas:
   - pesado/resistente abajo, liviano/frágil arriba;
   - resistencia a la compresión por producto ("apilar máx. X kg"): si se supera, la caja
     se **aplasta** (se deforma y se marca en rojo);
   - nunca químicos (lavandina, detergente) **sobre** alimentos/bebidas;
   - altura máxima 1,60 m con pallet; centro de gravedad centrado; sin torres.
   En modo entrenamiento, las posiciones se pintan verde/amarillo/rojo antes de apoyar.
4. **Traslado con zorra (transpaleta).** El pallet va a remolque del operario con física
   real: la zorra tiene inercia (≈3 m/s²) y la carga suelta se cae si se maneja brusco.
5. **Enfilmado en envolvedora.** La carga gira con la mesa; el operario sube y baja el
   carro del film. Hace falta **≥3 vueltas en la base** (amarre carga-pallet) y **≥2 en toda la
   altura**. Solo las cajas bien cubiertas quedan unitizadas; el resto sigue suelto. Muchas
   vueltas de más cuentan como desperdicio de film.
6. **Despacho por andén** con remito y COT, e **informe** con puntaje, tiempo,
   bultos/hora y observaciones.

## Base de prácticas argentinas (resumen)

| Tema | Qué se tomó |
|---|---|
| Pallet | Estándar ARLOG 1000×1200 mm (pallet "universal"/argentino), ~1.000 kg de carga dinámica. La altura del armado la define el cliente o el transporte (referencias habituales: 1,15 / 1,45 / 2,00 m con pallet). En el simulador: 1,60 m. |
| Ubicaciones | Nivel 0 = picking manual; niveles superiores = pulmón/reserva, operados con autoelevador. |
| Rotación | FEFO en alimentos y bebidas (vence primero, sale primero); FIFO para el resto. |
| Segregación | No apoyar productos de limpieza/químicos sobre alimentos (Código Alimentario Argentino, BPM). |
| Ergonomía | Res. MTEySS 295/03, Anexo I (levantamiento manual de cargas); Ley 19.587 y Dto. 351/79. |
| EPP | Calzado de seguridad, chaleco reflectivo y guantes (el operario los tiene puestos). |
| Despacho | Remito y COT (ARBA) para el traslado en provincia de Buenos Aires. |

Los valores son **didácticos y simplificados**. Cada empresa tiene sus procedimientos.

## Notas técnicas

- Paso fijo de física a 60 Hz; el pallet es un cuerpo cinemático controlado por velocidad,
  así la fricción arrastra la carga de verdad.
- Las cajas enfilmadas pasan a cinemáticas y siguen al pallet de forma rígida (unitización).
- El film es una malla dinámica que se va generando en coordenadas del pallet.
- `window.__sim` y `S.autoIn` existen para pruebas automatizadas (Playwright).

## Próximos pasos posibles

- Picking por voz o por zonas/olas, pallets mixtos con capas trabadas (cruzado).
- Recepción y control ciego, ubicación de mercadería y conteos cíclicos.
- Puesto de autoelevadorista jugable.
- Multiusuario e indicadores por operario (bultos/hora, errores, faltantes).
