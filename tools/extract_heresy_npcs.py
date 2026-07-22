#!/usr/bin/env python3
# Extrae los NPCs ANIMADOS del mod HERESY (aldeanos con animación de idle real: 7-16 frames en
# bucle) y los agrega a assets.json. Triston (ciudad de HERESY) puede usarlos para que la plaza
# tenga vida — a diferencia de los NPCs de fantasycore, estos "respiran", gesticulan, trabajan.
# Son de UNA sola dirección (fila 0): se renderizan con dir=0.
#
#   python3 tools/extract_heresy_npcs.py [--flare vendor/flare-game] [--scale 0.5]
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_flare as E

# NOTA: los HUMANOS de HERESY (peasants, nobles, viejos) están dibujados a una escala mucho más
# chica que los NPCs de fantasycore (el personaje ocupa ~1/3 del cuadro) y su idle es casi
# imperceptible a nuestro zoom, así que NO los usamos (los aldeanos del pueblo van con los sprites
# de fantasycore, que son del tamaño correcto y animan visible). De HERESY sólo aprovechamos los
# ANIMALES (cerdos), que no existen en fantasycore. Dejamos la lista completa por si algún día se
# reescalan, pero por defecto extraemos sólo lo que se usa.
HERESY_NPCS = ["PigSE", "PigSW"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    ap.add_argument("--scale", type=float, default=0.5)
    a = ap.parse_args()

    heresy = os.path.join(a.flare, "mods", "heresy")
    if not os.path.isdir(heresy):
        sys.exit(f"falta {heresy} (bajá HERESY del release y copialo)")
    # heresy primero; fantasycore de fallback (p. ej. el dog usa images/enemies/Wolf.png).
    roots = [heresy] + [os.path.join(a.flare, "mods", m)
                        for m in ("fantasycore", "minicore") if os.path.isdir(os.path.join(a.flare, "mods", m))]

    path = os.path.join(a.out, "assets.json")
    man = json.load(open(path))
    ok = 0
    for n in HERESY_NPCS:
        r = E.repack(E.resolve(roots, f"animations/npcs/{n}.txt"), roots,
                     f"{a.out}/npcs/{n}.png", a.scale)
        if not r:
            print("  (falta)", n)
            continue
        r["src"] = "npcs/" + os.path.basename(r["src"])
        man["npcs"][n] = r
        st = r["anims"].get("stance", {})
        print(f"  {n}: {st.get('frames', 0)} frames idle")
        ok += 1

    with open(path, "w") as fh:
        json.dump(man, fh, indent=1)
    print(f"OK: {ok}/{len(HERESY_NPCS)} NPCs animados de HERESY -> assets.json")


if __name__ == "__main__":
    main()
