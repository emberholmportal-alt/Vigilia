#!/usr/bin/env python3
# Le pone a Triston el AGUA ANIMADA de Flare. Heresy dejó el canal con agua quieta (0 animación);
# tomamos un tile de agua animada real de Flare (snowplains 163, 2 frames, el más parecido al
# teal del canal), lo escalamos a la huella de los tiles de agua de Triston y se lo asignamos como
# animación a las baldosas de agua abierta del canal (48-53). Nada procedural: son frames de Flare.
import json
import os
from PIL import Image

OUT = "public/assets"
SRC_TS = "tileset_snowplains"      # de dónde sale el agua animada de Flare
SRC_TILE = "163"                   # tile de agua animada más cercano al teal de Triston
DST_TS = "tileset_triston"
WATER_TILES = ["48", "49", "50", "51", "52", "53"]   # agua abierta del canal (teal, frac ~1.0)
FRAME_MS = 260


def main():
    man = json.load(open(os.path.join(OUT, "assets.json")))
    src = man["tilesets"][SRC_TS]
    dst = man["tilesets"][DST_TS]

    src_atlas = Image.open(os.path.join(OUT, src["src"])).convert("RGBA")
    dst_atlas = Image.open(os.path.join(OUT, dst["src"])).convert("RGBA")

    anim = src["anim"].get(SRC_TILE)
    if not anim:
        raise SystemExit(f"{SRC_TS} no tiene animación para {SRC_TILE}")

    # Huella de los tiles de agua de Triston (todos iguales: 64x64, ancla 32,16; el rombo de
    # agua ocupa la mitad inferior). Tomamos la del primero.
    fx, fy, fw, fh, fox, foy = dst["tiles"][WATER_TILES[0]]
    # El rombo de agua de Triston ocupa la mitad de abajo (bbox y: fh/2..fh).
    dw, dh = fw, fh // 2

    # Escalar cada frame de Flare a la huella del rombo y pegarlo en un crop del tamaño del tile,
    # abajo (para alinear con el tile estático).
    frames_img = []
    for f in anim["frames"]:
        c = src_atlas.crop((f[0], f[1], f[0] + f[2], f[1] + f[3])).resize((dw, dh), Image.LANCZOS)
        cell = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        cell.alpha_composite(c, (0, fh - dh))
        frames_img.append(cell)

    # Anexar los frames debajo del atlas de Triston (no toca lo existente: sólo agranda el alto).
    pad = 2
    strip_w = len(frames_img) * (fw + pad)
    new_atlas = Image.new("RGBA", (max(dst_atlas.width, strip_w), dst_atlas.height + fh + pad), (0, 0, 0, 0))
    new_atlas.alpha_composite(dst_atlas, (0, 0))
    frame_rects = []
    x = 0
    y0 = dst_atlas.height + pad
    for img in frames_img:
        new_atlas.alpha_composite(img, (x, y0))
        frame_rects.append([x, y0, fw, fh, fox, foy])
        x += fw + pad
    new_atlas.save(os.path.join(OUT, dst["src"]), optimize=True)

    # Asignar la animación a cada tile de agua abierta del canal.
    dst.setdefault("anim", {})
    durs = [FRAME_MS] * len(frame_rects)
    for tid in WATER_TILES:
        if tid in dst["tiles"]:
            dst["anim"][tid] = {"frames": frame_rects, "durs": durs}

    json.dump(man, open(os.path.join(OUT, "assets.json"), "w"), indent=1)
    print(f"OK: agua animada de Flare ({SRC_TS}/{SRC_TILE}) -> Triston tiles {WATER_TILES} "
          f"({len(frame_rects)} frames). Atlas: {new_atlas.size}")


if __name__ == "__main__":
    main()
