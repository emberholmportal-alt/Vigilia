#!/usr/bin/env python3
# Cruces de piedra para el cementerio de Triston. En Flare el `cursed_grave` es un enemigo:
# una CRUZ DE PIEDRA sobre pedestal escalonado. Nosotros la usamos como decoración ESTÁTICA
# (una cruz que "respira" se ve mal) y con piedra NATURAL (el tinte fuego/hielo la volvía
# antinatural). Sacamos dos variantes para dar variedad: una clara y una envejecida/musgosa.
import argparse
import json
import os
from PIL import Image

ANIM_TXT = "mods/fantasycore/animations/enemies/cursed_grave.txt"
IMG_REL  = "mods/fantasycore/images/enemies/cursed_grave.png"
SCALE = 0.5   # los sprites de Flare son 1080p; a 0.5 la cruz queda a la altura de un NPC

# (nombre en decor.json, tinte multiplicativo por canal). Sin color: sólo aclarar/oscurecer y
# un toque verdoso para la "musgosa" — nada de rojo/azul.
VARIANTS = [
    ("grave_cross",  (255, 255, 255)),   # piedra natural
    ("grave_cross2", (206, 214, 196)),   # envejecida, apenas musgo verde
]


def first_stance_frame_dir0(txt):
    """Primer frame del [stance], dirección 0: (x,y,w,h,ox,oy)."""
    in_stance = False
    for line in open(txt, encoding="utf-8", errors="ignore"):
        s = line.strip()
        if s.startswith("["):
            in_stance = (s == "[stance]")
            continue
        if in_stance and s.startswith("frame="):
            v = [int(x) for x in s.split("=", 1)[1].split(",")]
            if v[1] == 0:            # dir 0, primer frame
                return tuple(v[2:8])
    return None


def tint(im, mod):
    if mod == (255, 255, 255):
        return im
    r, g, b, a = im.split()
    r = r.point([min(255, i * mod[0] // 255) for i in range(256)])
    g = g.point([min(255, i * mod[1] // 255) for i in range(256)])
    b = b.point([min(255, i * mod[2] // 255) for i in range(256)])
    return Image.merge("RGBA", (r, g, b, a))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    a = ap.parse_args()

    txt = os.path.join(a.flare, ANIM_TXT)
    src = os.path.join(a.flare, IMG_REL)
    if not (os.path.exists(txt) and os.path.exists(src)):
        print("  (faltan fuentes)"); return
    atlas = Image.open(src).convert("RGBA")
    fr = first_stance_frame_dir0(txt)
    if not fr:
        print("  (sin frame)"); return
    x, y, w, h, ox, oy = fr
    crop = atlas.crop((x, y, x + w, y + h))
    sw, sh = int(w * SCALE), int(h * SCALE)
    apiv = [int(ox * SCALE), int(oy * SCALE)]
    crop = crop.resize((sw, sh), Image.LANCZOS)

    decor = json.load(open(os.path.join(a.out, "decor.json")))
    os.makedirs(os.path.join(a.out, "decor"), exist_ok=True)
    for name, mod in VARIANTS:
        img = tint(crop, mod)
        out_png = f"decor/{name}.png"
        img.save(os.path.join(a.out, out_png), optimize=True)
        # Estático: sin bloque `anim` (una cruz no se anima).
        decor[name] = {"src": out_png, "cell": [sw, sh], "anchor": apiv}
        print(f"  {name}: {sw}x{sh}, pivot {apiv} -> {out_png}")

    # Limpiar las entradas viejas fire/ice (animadas y tintadas) si quedaron.
    for old in ("cursed_grave_fire", "cursed_grave_ice"):
        decor.pop(old, None)
    json.dump(decor, open(os.path.join(a.out, "decor.json"), "w"), indent=1)
    print("decor.json actualizado.")


if __name__ == "__main__":
    main()
