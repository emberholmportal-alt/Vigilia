# CÓMO HACKEAR

> Un pibe, un garaje, y una industria entera que se está cagando de miedo.
> **Hackeás estudios, filtrás sus juegos, y cuanto más pánico causás más te pagan
> — y más gente te viene a buscar.**

3D low-poly con ojos saltones, primera persona, cinco zonas, cinco jefes, y armas hechas
de basura informática. Mezcla de **How to Fish** (un verbo, escalada absurda, zona→jefe→zona),
**Schedule I** (el viaje con la mercadería encima, el calor, los empleados) y
**Plague Inc** (el reloj que te corre de atrás).

| Documento | Qué hay |
|---|---|
| [`REFERENTES.md`](REFERENTES.md) | La investigación de los tres juegos con datos, y la biblia del look low-poly |
| [`GDD.md`](GDD.md) | El juego entero: el nivel de pánico, el bucle en tres lugares, 10 armas, 5 zonas, 5 jefes, 7 finales |
| [`prototipo-3d.html`](prototipo-3d.html) | **Prototipo jugable en 3D.** Ver abajo cómo compilarlo |

## El prototipo

`prototipo-3d.html` es el cuerpo del juego **sin three.js adentro** (para no commitear 670 KB
minificados). Para armar el archivo jugable:

```bash
curl -sSL -o /tmp/three.min.js https://unpkg.com/three@0.160.0/build/three.min.js
python3 - <<'PY'
three = open('/tmp/three.min.js').read()
body  = open('docs/leakinc/prototipo-3d.html').read()
mk    = '<div id="stage"></div>'
open('/tmp/jugable.html','w').write(
  '<!doctype html><html><head><meta charset="utf-8"></head><body>'
  + body.replace(mk, mk + '\n<script>' + three + '</script>', 1)
  + '</body></html>')
PY
# abrí /tmp/jugable.html en el navegador
```

**Qué hay adentro:** el garaje con tres torres que ripean, el pendrive, la calle de noche
con casas y faroles, la camioneta del youtuber, el nivel de pánico con sus seis estados,
enemigos que aparecen según el pánico, dos armas (teclado mecánico y pistola de calor),
y dos finales. Todo con geometría procedural: **cero modelos, cero texturas, cero assets**.

**Estado:** concepto cerrado, fase 0–1 del GDD §10 andando.

**Relación con Velgrim:** comparte repo y stack, nada más. Sin servidor, sin base de datos,
sin un solo asset licenciado.
