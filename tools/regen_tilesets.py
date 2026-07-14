#!/usr/bin/env python3
# Regenera SOLO los tilesets (atlas PNG + rects + animaciones) y parcha assets.json, sin tocar
# avatares/enemigos/NPCs. Añade los tiles animados de Flare (agua, lava, etc.) que el extractor
# original ignoraba. Triston queda afuera (se extrae aparte, con su propia escala).
#
#   python tools/regen_tilesets.py --flare vendor/flare-game --out public/assets --scale 0.5
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_flare as E


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    ap.add_argument("--scale", type=float, default=0.5)
    a = ap.parse_args()

    roots = [os.path.join(a.flare, "mods", m)
             for m in ("empyrean_campaign", "fantasycore", "alpha_demo", "minicore_alpha")]
    roots = [r for r in roots if os.path.isdir(r)]
    if not roots:
        sys.exit(f"No encuentro los mods de Flare en {a.flare}. Cloná flare-game primero.")

    path = os.path.join(a.out, "assets.json")
    man = json.load(open(path))

    for t in E.TILESETS:
        r = E.extract_tileset(t, roots, a.out, a.scale)
        if not r:
            print("  (falta tileset)", t)
            continue
        man["tilesets"][t] = r
        na = len(r.get("anim", {}))
        print(f"  {t}: {len(r['tiles'])} tiles, {na} animados")

    with open(path, "w") as fh:
        json.dump(man, fh, indent=1)
    print("assets.json actualizado.")


if __name__ == "__main__":
    main()
