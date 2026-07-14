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

# Aldeanos + viejos + nobles + animales. (Los que existan; los que falten se saltan.)
HERESY_NPCS = [
    "MalePeasant1", "MalePeasant2", "MalePeasant3", "MalePeasant4",
    "FemalePeasant1", "FemalePeasant2", "FemalePeasant3", "FemalePeasant4",
    "OldManBrown", "OldManGrey", "OldWitch", "FemaleOld",
    "NobleWomanFat1", "NobleWomanFat2", "NobleWoman1", "NobleWoman2",
    "NoblemanBlue", "NoblemanFatBlue", "NoblemanFatGreen", "NoblemanFatRed",
    "PigSE", "PigSW", "Guard_dog",
]


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
