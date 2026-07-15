#!/usr/bin/env python3
# Extrae las TUMBAS MALDITAS animadas de Flare (cursed_grave) como decoración para el
# cementerio de Triston. En Flare son enemigos; acá las usamos como adorno animado: la lápida
# tiembla y un espectro asoma en bucle (animación [stance], 8 frames).
#
# Dos particularidades que este script resuelve (y por eso NO reusa extract_decor_anims.py):
#   1) El atlas es un sprite-packer NO uniforme: cada frame tiene w/h y offset (ox,oy) propios.
#      Hay que alinearlos por el pivote (ox,oy) para que la lápida no "salte" entre frames.
#   2) Las variantes fire/ice de empyrean sólo aplican un `color_mod` (tinte multiplicativo)
#      sobre el mismo sprite base de fantasycore. Lo replicamos multiplicando por canal.
import argparse
import json
import os
from PIL import Image

# (nombre en decor.json, color_mod RGB del .txt de empyrean)
VARIANTS = [
    ("cursed_grave_fire", (255, 207, 207)),   # rojizo
    ("cursed_grave_ice",  (207, 207, 255)),   # azulado
]
ANIM_TXT = "mods/fantasycore/animations/enemies/cursed_grave.txt"
IMG_REL  = "mods/fantasycore/images/enemies/cursed_grave.png"
SCALE = 0.5   # los sprites de Flare son 1080p; a 0.5 la lápida queda a la altura de un NPC


def parse_stance_dir0(txt):
    """Lee el bloque [stance] y devuelve los frames de la dirección 0: (x,y,w,h,ox,oy)."""
    frames = []
    in_stance = False
    for line in open(txt, encoding="utf-8", errors="ignore"):
        s = line.strip()
        if s.startswith("["):
            in_stance = (s == "[stance]")
            continue
        if in_stance and s.startswith("frame="):
            v = [int(x) for x in s.split("=", 1)[1].split(",")]
            # frame=idx,dir,x,y,w,h,ox,oy
            if v[1] == 0:
                frames.append(tuple(v[2:8]))
    return frames


def tint(im, mod):
    """color_mod multiplicativo de Flare: canal * mod / 255, preservando alpha."""
    r, g, b, a = im.split()
    lut_r = [min(255, i * mod[0] // 255) for i in range(256)]
    lut_g = [min(255, i * mod[1] // 255) for i in range(256)]
    lut_b = [min(255, i * mod[2] // 255) for i in range(256)]
    r = r.point(lut_r); g = g.point(lut_g); b = b.point(lut_b)
    return Image.merge("RGBA", (r, g, b, a))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    a = ap.parse_args()

    txt = os.path.join(a.flare, ANIM_TXT)
    src = os.path.join(a.flare, IMG_REL)
    if not (os.path.exists(txt) and os.path.exists(src)):
        print("  (faltan fuentes)", txt, src); return
    atlas = Image.open(src).convert("RGBA")
    frames = parse_stance_dir0(txt)
    if not frames:
        print("  (sin frames dir0)"); return

    # Canvas uniforme alineado por el pivote (ox,oy).
    max_left  = max(ox for (_, _, _, _, ox, oy) in frames)
    max_right = max(w - ox for (_, _, w, _, ox, _) in frames)
    max_up    = max(oy for (_, _, _, _, _, oy) in frames)
    max_down  = max(h - oy for (_, _, _, h, _, oy) in frames)
    CW, CH = max_left + max_right, max_up + max_down
    piv = (max_left, max_up)

    # Strip base (sin tinte): recorto cada frame y lo pego alineando el pivote.
    base_cells = []
    for (x, y, w, h, ox, oy) in frames:
        cell = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        crop = atlas.crop((x, y, x + w, y + h))
        cell.alpha_composite(crop, (piv[0] - ox, piv[1] - oy))
        base_cells.append(cell)

    sw, sh = int(CW * SCALE), int(CH * SCALE)
    apiv = (int(piv[0] * SCALE), int(piv[1] * SCALE))

    decor = json.load(open(os.path.join(a.out, "decor.json")))
    os.makedirs(os.path.join(a.out, "decor"), exist_ok=True)
    for name, mod in VARIANTS:
        strip = Image.new("RGBA", (sw * len(base_cells), sh), (0, 0, 0, 0))
        for i, cell in enumerate(base_cells):
            c = tint(cell, mod)
            if SCALE != 1.0:
                c = c.resize((sw, sh), Image.LANCZOS)
            strip.alpha_composite(c, (i * sw, 0))
        anim_png = f"decor/{name}_anim.png"
        strip.save(os.path.join(a.out, anim_png), optimize=True)
        # Estático de respaldo (primer frame) por si falla la carga del strip.
        stat = tint(base_cells[0], mod)
        if SCALE != 1.0:
            stat = stat.resize((sw, sh), Image.LANCZOS)
        stat_png = f"decor/{name}.png"
        stat.save(os.path.join(a.out, stat_png), optimize=True)

        decor[name] = {
            "src": stat_png, "cell": [sw, sh], "anchor": [apiv[0], apiv[1]],
            "anim": {"src": anim_png, "frames": len(base_cells),
                     "cell": [sw, sh], "anchor": [apiv[0], apiv[1]], "ms": 1066},
        }
        print(f"  {name}: {len(base_cells)} frames, {sw}x{sh}, pivot {apiv} -> {anim_png}")

    json.dump(decor, open(os.path.join(a.out, "decor.json"), "w"), indent=1)
    print("decor.json actualizado.")


if __name__ == "__main__":
    main()
