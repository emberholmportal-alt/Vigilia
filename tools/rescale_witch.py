#!/usr/bin/env python3
# La bruja (witch_adriana) sale del sprite OldWitch de HERESY, que dibuja un cuerpo de ~55px
# dentro de una celda de 128px: en pantalla se ve MÁS CHICA que los NPCs de fantasycore (~84px
# de cuerpo en celda 85x87). Acá la re-extraemos del sprite ORIGINAL de Flare (idempotente),
# reescalamos su cuerpo a ~78px y la recentramos en una celda 85x87 con el ancla en los pies
# [42,80], igual que el resto de los NPCs.
import argparse
import json
import os
from PIL import Image

# frame [stance] dir 0, frame 0 de OldWitch: (x,y,w,h)=(0,640,128,128)
FRAME = (0, 640, 128, 128)
CELL = (85, 87)          # misma celda que los NPCs fantasycore
ANCHOR = [42, 80]        # pies
BODY_H = 78              # alto objetivo del cuerpo (un poco menos que 84: va encorvada)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    a = ap.parse_args()

    src = os.path.join(a.flare, "mods/heresy/images/npcs/OldWitch.png")
    im = Image.open(src).convert("RGBA")
    x, y, w, h = FRAME
    frame = im.crop((x, y, x + w, y + h))
    bbox = frame.getbbox()                    # contenido real dentro del frame
    body = frame.crop(bbox)
    bw, bh = body.size
    scale = BODY_H / bh
    nw, nh = max(1, round(bw * scale)), round(bh * scale)
    body = body.resize((nw, nh), Image.LANCZOS)

    canvas = Image.new("RGBA", CELL, (0, 0, 0, 0))
    canvas.alpha_composite(body, (ANCHOR[0] - nw // 2, ANCHOR[1] - nh))
    out_png = os.path.join(a.out, "decor/Act1_witch_adriana.png")
    canvas.save(out_png, optimize=True)

    assets = json.load(open(os.path.join(a.out, "assets.json")))
    assets["npcs"]["witch_adriana"] = {
        "src": "decor/Act1_witch_adriana.png", "cell": list(CELL), "anchor": ANCHOR,
        "cols": 1, "anims": {"stance": {"start": 0, "frames": 1, "ms": 1000, "loop": True, "pingpong": False}},
    }
    json.dump(assets, open(os.path.join(a.out, "assets.json"), "w"))
    print(f"bruja: cuerpo {bw}x{bh} -> {nw}x{nh}, celda {CELL}, ancla {ANCHOR}")


if __name__ == "__main__":
    main()
