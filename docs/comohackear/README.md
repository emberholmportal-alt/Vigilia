# CÓMO HACKEAR

> No sabés programar. Nadie sabe ya. **Le pagás a una IA para que hackee por vos.**
> Ella escribe el código, vos ni lo leés, y le pagás por token. El problema es que la IA
> barata **miente con total seguridad** — y cada mentira te acerca a que te agarren.

3D low-poly, primera persona, empezás en tu pieza a las 3 de la mañana. Sátira total sobre
la IA. Mezcla de **Schedule I** (el negocio y el calor), **Plague Inc** (el virus que se
propaga y el reloj de la cura) y **How to Fish** (te enseña de a poco y todo escala hasta
lo ridículo).

| Documento | Qué hay |
|---|---|
| [`GDD.md`](GDD.md) | El juego entero: vibe hacking, tokens, la alucinación, los modelos, el pánico, el honeypot, el virus, la extorsión, los finales |
| [`PERSONAJE.md`](PERSONAJE.md) | El Pibe y su diseño, NIMBO la IA, los enemigos, los marcos y los seis lugares |
| [`REFERENTES.md`](REFERENTES.md) | La investigación de los tres juegos + vibe coding + el look low-poly |
| [`prototipo-3d.html`](prototipo-3d.html) | **Prototipo jugable en 3D.** Ver abajo cómo compilarlo |

## Los tres pilares fusionados

- **VIBE HACKING (el motor).** No hackeás: le hablás a una IA que hackea por vos y te cobra
  por token. Comprás modelos mejores (GRATIS 1.0 → NIMBO-mini → … → EL MODELO). Los baratos
  **alucinan**: hacen cualquier cosa con total seguridad. Ese es el caos.
- **LOS HACKEOS (la escalada, de How to Fish).** Wifi del vecino → **honeypot** (router
  trucho, cae gente, extorsionás a los hipócritas con poder) → **virus** (se propaga como
  Plague Inc, la cura son los antivirus) → redes, bancos, la nube.
- **EL PÁNICO (el reloj, de Schedule I + Plague Inc).** Es tu lista de precios *y* tu
  sentencia: más pánico = más te pagan y más gente te busca.

## El prototipo

`prototipo-3d.html` es el cuerpo del juego **sin three.js adentro** (para no commitear 670 KB).
Para armar el archivo jugable:

```bash
curl -sSL -o /tmp/three.min.js https://unpkg.com/three@0.160.0/build/three.min.js
python3 - <<'PYEOF'
three = open('/tmp/three.min.js').read()
body  = open('docs/comohackear/prototipo-3d.html').read()
mk    = '<div id="stage"></div>'
open('/tmp/jugable.html','w').write(
  '<!doctype html><html><head><meta charset="utf-8"></head><body>'
  + body.replace(mk, mk + '\n<script>' + three + '</script>', 1)
  + '</body></html>')
PYEOF
# abrí /tmp/jugable.html en el navegador
```

**Estado:** concepto cerrado; prototipo con la pieza, el Pibe detallado y el bucle de vibe
hacking (promptear → quemar tokens → éxito o alucinación) andando.

**Relación con Velgrim:** comparte repo y stack, nada más. Sin servidor, sin base de datos,
sin un solo asset licenciado.
