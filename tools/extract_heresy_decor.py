#!/usr/bin/env python3
"""
extract_heresy_decor.py — Extrae las DECORACIONES [npc] del mapa Triston de HERESY
(fuente, cerdos, herrero, aldeanos…) como sprites estáticos para poblar el pueblo.

En HERESY el mapa coloca decoraciones/animales/aldeanos como secciones [npc] que apuntan
a npcs/<n>.txt -> animations/npcs/<a>.txt -> images/npcs/<img>.png. Acá tomamos el PRIMER
frame de cada uno como sprite estático (el pueblo se ve completo sin animar todo).

Salida:
  public/assets/decor/<name>.png          (recorte del frame 0, escalado)
  public/assets/decor.json                { "<name>": {src, cell:[w,h], anchor:[ox,oy]} }

Requiere el mod heresy en vendor/flare-game/mods/heresy/ (npcs, animations/npcs, images/npcs).

Uso:
    python3 tools/extract_heresy_decor.py [--flare vendor/flare-game] [--scale 1.0]
"""
import argparse, json, os, re, sys
from PIL import Image

MAP = "maps/Act1_triston.txt"


def npc_list_from_map(mod):
    """Nombres de npc usados en el mapa (dedup)."""
    path = os.path.join(mod, MAP)
    names = []
    for line in open(path, encoding="utf-8", errors="ignore"):
        m = re.match(r"\s*filename=.*/([^/]+)\.txt", line.strip())
        if m:
            names.append(m.group(1))
    return names


def first_frame(mod, name):
    """Devuelve (image_rel, (x,y,w,h,ox,oy)) del primer frame del npc, o None."""
    npcdef = os.path.join(mod, "npcs", name + ".txt")
    if not os.path.isfile(npcdef):
        return None
    gfx = None
    for line in open(npcdef, encoding="utf-8", errors="ignore"):
        line = line.strip()
        if line.startswith("gfx=") or line.startswith("animations="):
            gfx = line.split("=", 1)[1].strip()
    if not gfx:
        return None
    anim = os.path.join(mod, gfx)
    if not os.path.isfile(anim):
        return None
    image, frame = None, None
    for line in open(anim, encoding="utf-8", errors="ignore"):
        line = line.strip()
        if line.startswith("image="):
            image = line.split("=", 1)[1].strip()
        elif line.startswith("frame=") and frame is None:
            vals = [int(v) for v in re.findall(r"-?\d+", line)]
            if len(vals) >= 6:
                frame = tuple(vals[-6:])  # x,y,w,h,ox,oy (ignora index/dir a la izquierda)
    if not image or not frame:
        return None
    return image, frame


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/assets")
    ap.add_argument("--scale", type=float, default=1.0)
    a = ap.parse_args()

    mod = os.path.join(a.flare, "mods", "heresy")
    if not os.path.isdir(mod):
        sys.exit(f"falta {mod}")

    outdir = os.path.join(a.out, "decor")
    os.makedirs(outdir, exist_ok=True)
    manifest, imgcache = {}, {}

    for name in dict.fromkeys(npc_list_from_map(mod)):
        ff = first_frame(mod, name)
        if not ff:
            print("  (sin frame)", name)
            continue
        image_rel, (x, y, w, h, ox, oy) = ff
        ip = os.path.join(mod, image_rel)
        if ip not in imgcache:
            imgcache[ip] = Image.open(ip).convert("RGBA") if os.path.isfile(ip) else None
        im = imgcache[ip]
        if im is None:
            print("  (sin imagen)", name)
            continue
        crop = im.crop((x, y, x + w, y + h))
        s = a.scale
        if s != 1.0:
            crop = crop.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
        crop.save(os.path.join(outdir, name + ".png"), optimize=True)
        manifest[name] = {"src": "decor/" + name + ".png",
                          "cell": [crop.width, crop.height],
                          "anchor": [int(ox * s), int(oy * s)]}

    json.dump(manifest, open(os.path.join(a.out, "decor.json"), "w"), ensure_ascii=False)
    print(f"OK: {len(manifest)} decoraciones -> {outdir} + decor.json")


if __name__ == "__main__":
    main()
