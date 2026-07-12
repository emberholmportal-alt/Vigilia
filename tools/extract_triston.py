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

    res = ef.extract_tileset("tileset_triston", [heresy], a.out, scale=a.scale, atlas_w=4096)
    if not res:
        sys.exit("no se pudo extraer tileset_triston")

    aj = os.path.join(a.out, "assets.json")
    data = json.load(open(aj))
    data["tilesets"]["tileset_triston"] = res
    json.dump(data, open(aj, "w"))
    print(f"OK: tileset_triston con {len(res['tiles'])} tiles -> {res['src']}")


if __name__ == "__main__":
    main()
