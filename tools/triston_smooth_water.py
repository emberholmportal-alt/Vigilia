#!/usr/bin/env python3
# Alisa el agua abierta del canal de Triston: los tiles de agua tienen bordes con antialiasing
# que, al mosaiquear, dejan una grilla de rombos visible. Reemplazamos el relleno de los tiles de
# agua ABIERTA por un teal uniforme con borde DURO y dilatado 1px, así los rombos se funden entre
# sí y el agua se ve lisa (como en Flare). Las baldosas de orilla (transición a tierra) no se
# tocan. Post-proceso idempotente sobre el atlas de Triston.
import json
import os
from PIL import Image, ImageFilter

OUT = "public/assets"
# Agua abierta (frac >= 0.92); las de orilla quedan como están.
WATER_TILES = [33, 34, 37, 38, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]
TEAL = (52, 68, 76)          # color de agua uniforme (azul-teal, tipo agua profunda de Flare)
ALPHA_THRESHOLD = 40         # arriba de esto = agua (borde duro)


def main():
    man = json.load(open(os.path.join(OUT, "assets.json")))
    ts = man["tilesets"]["tileset_triston"]
    atlas = Image.open(os.path.join(OUT, ts["src"])).convert("RGBA")
    px = atlas.load()

    n = 0
    for tid in WATER_TILES:
        r = ts["tiles"].get(str(tid))
        if not r:
            continue
        x, y, w, h, ox, oy = r
        crop = atlas.crop((x, y, x + w, y + h))
        # Máscara dura del rombo, dilatada 1px para que los rombos vecinos se solapen (sin costura).
        mask = crop.split()[3].point(lambda a: 255 if a >= ALPHA_THRESHOLD else 0)
        mask = mask.filter(ImageFilter.MaxFilter(3))   # dilatar 1px
        flat = Image.new("RGBA", (w, h), TEAL + (255,))
        cell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        cell.paste(flat, (0, 0), mask)
        atlas.paste(cell, (x, y))
        n += 1

    atlas.save(os.path.join(OUT, ts["src"]), optimize=True)
    print(f"OK: {n} tiles de agua abierta alisados (teal {TEAL}, borde duro dilatado). Atlas {atlas.size}")


if __name__ == "__main__":
    main()
