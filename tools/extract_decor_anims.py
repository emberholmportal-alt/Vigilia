#!/usr/bin/env python3
# Extrae animaciones de DECORACIÓN de HERESY (frames de un [stance] en bucle) a un strip
# horizontal y las registra en decor.json con su `anim`. Así las decoraciones del mapa cobran
# vida: la fuente corre agua y los cerdos de la granja se mueven. _buildDecorations lee `anim`
# y cicla los frames.
#
# La fuente se extrae a TAMAÑO COMPLETO (200x200) para que no quede chica.
import argparse
import json
import os
from PIL import Image

DECORS = [
    # (nombre en decor.json, .txt de anim, scale)
    ("stone_fountain", "animations/npcs/stone_fountain.txt", 1.0),   # 200x200 completo
    ("PigSE", "animations/npcs/PigSE.txt", 1.0),
    ("PigSW", "animations/npcs/PigSW.txt", 1.0),
]


def parse_anim(txt):
    image = None
    frames = []
    ms = 1000
    for line in open(txt, encoding="utf-8", errors="ignore"):
        line = line.strip()
        if line.startswith("image="):
            image = line.split("=", 1)[1].strip()
        elif line.startswith("duration="):
            ms = int("".join(c for c in line.split("=", 1)[1] if c.isdigit()) or "1000")
        elif line.startswith("frame="):
            v = [int(x) for x in line.split("=", 1)[1].split(",")]
            # frame=idx,dir,x,y,w,h,ox,oy ; sólo dir 0
            if v[1] == 0:
                frames.append(v[2:8])   # x,y,w,h,ox,oy
    return image, frames, ms


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    a = ap.parse_args()
    heresy = os.path.join(a.flare, "mods", "heresy")

    decor = json.load(open(os.path.join(a.out, "decor.json")))
    for name, rel, scale in DECORS:
        txt = os.path.join(heresy, rel)
        if not os.path.exists(txt):
            print("  (falta)", name); continue
        image, frames, ms = parse_anim(txt)
        src = os.path.join(heresy, image)
        if not os.path.exists(src):
            print("  (falta img)", name, image); continue
        im = Image.open(src).convert("RGBA")
        cw = int(frames[0][2] * scale); ch = int(frames[0][3] * scale)
        ox = int(frames[0][4] * scale); oy = int(frames[0][5] * scale)
        strip = Image.new("RGBA", (cw * len(frames), ch), (0, 0, 0, 0))
        for i, (x, y, w, h, fox, foy) in enumerate(frames):
            c = im.crop((x, y, x + w, y + h))
            if scale != 1.0:
                c = c.resize((cw, ch), Image.LANCZOS)
            strip.alpha_composite(c, (i * cw, 0))
        out_png = f"decor/{name}_anim.png"
        strip.save(os.path.join(a.out, out_png), optimize=True)
        if name not in decor:
            decor[name] = {}
        decor[name]["anim"] = {"src": out_png, "frames": len(frames),
                               "cell": [cw, ch], "anchor": [ox, oy], "ms": ms}
        print(f"  {name}: {len(frames)} frames, {cw}x{ch}, {ms}ms -> {out_png}")

    json.dump(decor, open(os.path.join(a.out, "decor.json"), "w"), indent=1)
    print("decor.json actualizado.")


if __name__ == "__main__":
    main()
