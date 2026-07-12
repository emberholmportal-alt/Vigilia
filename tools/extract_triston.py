#!/usr/bin/env python3
"""
extract_triston.py — Extrae el tileset de Triston (ciudad del mod HERESY) y lo agrega a
public/assets/assets.json. Triston usa un tileset multi-imagen propio (edificios iso de
OpenGameArt: catedral, taberna, granero, casas) que NO está en fantasycore.

Requiere el mod HERESY en vendor/flare-game/mods/heresy/ (gitignored, como el resto de
vendor). Bajarlo del release y copiar:
  mods/heresy/tilesetdefs/tileset_triston.txt
  mods/heresy/images/tilesets/*.png
  mods/heresy/maps/Act1_triston.txt   (-> tools/maps_extra/triston.txt para convert_maps)

Uso:
    python3 tools/extract_triston.py [--flare vendor/flare-game] [--scale 0.5]
"""
import argparse, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
import extract_flare as ef


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    ap.add_argument("--scale", type=float, default=0.5)
    a = ap.parse_args()

    heresy = os.path.join(a.flare, "mods", "heresy")
    if not os.path.isdir(heresy):
        sys.exit(f"falta {heresy} (bajá HERESY del release y copialo, ver docstring)")

    # HERESY mezcla piso chico (nativo 64px) con edificios enormes (250-1250px). Para que
    # quede proporcionado con nuestros personajes (calibrados a un piso de 96px), escalamos
    # el PISO a 96px (×1.5) y los EDIFICIOS a un tamaño tipo fantasycore (×0.8).
    def scale_fn(w, h):
        return 1.5 if max(w, h) <= 150 else 0.8

    res = ef.extract_tileset("tileset_triston", [heresy], a.out, scale=a.scale,
                             atlas_w=4096, scale_fn=scale_fn)
    if not res:
        sys.exit("no se pudo extraer tileset_triston")

    aj = os.path.join(a.out, "assets.json")
    data = json.load(open(aj))
    data["tilesets"]["tileset_triston"] = res
    json.dump(data, open(aj, "w"))
    print(f"OK: tileset_triston con {len(res['tiles'])} tiles -> {res['src']}")


if __name__ == "__main__":
    main()
