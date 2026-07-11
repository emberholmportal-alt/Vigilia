#!/usr/bin/env python3
"""
extract_flare.py — Pipeline de assets de Flare -> bundle web.

Uso:
    git clone --depth 1 https://github.com/flareteam/flare-game.git vendor/flare-game
    python tools/extract_flare.py --scale 0.5 --out public/assets

Qué hace:
  1. Lee los .txt de animación de Flare (formato del sprite packer: atlas no uniforme
     con offsets por frame) y los REPAQUETA en spritesheets de grilla uniforme
     (columnas = frames, filas = 8 direcciones). Esto es lo que hace que el
     paperdoll se pueda dibujar con un simple drawImage por capa.
  2. Extrae tilesets isométricos con sus rects y offsets.
  3. Extrae el atlas de íconos.
  4. Escribe assets.json con todo el metadata que necesita el cliente.

IMPORTANTE — direcciones de Flare (orden de engine/hero_layers.txt):
    0=SW  1=W  2=NW  3=N  4=NE  5=E  6=SE  7=S

Licencia del arte: CC-BY-SA 3.0 — Flare "Empyrean Campaign", flareteam/flare-game.
Este script NO redistribuye arte: lo procesa desde tu copia local del repo.
"""
import os, re, json, argparse, sys
from PIL import Image

# ---------------------------------------------------------------- config
# Capas del paperdoll. La clave es el nombre lógico; el valor, el archivo de Flare.
AVATAR_LAYERS = [
    # base (siempre visible debajo del equipo)
    "default_chest", "default_legs", "default_hands", "default_feet",
    "head_bald", "head_short",
    # cloth
    "cloth_shirt", "cloth_pants", "cloth_gloves", "cloth_sandals",
    # leather
    "leather_chest", "leather_pants", "leather_gloves", "leather_boots", "leather_hood",
    # chain
    "chain_cuirass", "chain_greaves", "chain_gloves", "chain_boots", "chain_coif",
    # plate
    "plate_cuirass", "plate_greaves", "plate_gauntlets", "plate_boots", "plate_helm",
    # mage (3 variantes de color c/u)
    "mage_vest", "mage_skirt", "mage_sleeves", "mage_boots", "mage_hood",
    "mage_vest_alt1", "mage_skirt_alt1", "mage_sleeves_alt1", "mage_boots_alt1", "mage_hood_alt1",
    "mage_vest_alt2", "mage_skirt_alt2", "mage_sleeves_alt2", "mage_boots_alt2", "mage_hood_alt2",
    # armas cuerpo a cuerpo
    "dagger", "shortsword", "longsword", "greatsword", "zweihander",
    "club", "reinforced_club", "mace", "maul", "war_hammer", "smith_hammer",
    "hand_axe", "infantry_axe", "battle_axe",
    # a distancia / mágicas
    "shortbow", "longbow", "greatbow", "slingshot",
    "wand", "rod", "staff", "greatstaff",
    # escudos
    "buckler", "iron_buckler", "shield", "kite_shield",
]

ENEMIES = [
    "goblin", "goblin_elite", "hobgoblin", "hobgoblin_archer",
    "skeleton", "skeleton_weak", "skeleton_archer", "skeleton_mage",
    "zombie", "zombie_dark", "necromancer",
    "antlion", "antlion_small", "antlion_armored", "fire_ant", "ice_ant",
    "wyvern", "wyvern_fire", "wyvern_water", "wyvern_air",
    "grisbon", "cursed_grave",
    # jefes
    "skeleton_knight_boss", "skeleton_mage_boss", "minotaur", "vesuvvio", "scathelocke",
]

NPCS = [
    "wandering_trader", "peddler_goblin", "guild_man", "knight",
    "peasant_man1", "peasant_man2", "peasant_woman1", "peasant_woman2",
    "return_obelisk1", "statue_guardian_fire", "statue_guardian_ice", "statue_guardian_wind",
]

TILESETS = [
    "tileset_grassland", "tileset_grassland_water", "tileset_dungeon",
    "tileset_cave", "tileset_ruins", "tileset_snowplains",
]

# Animaciones que exportamos. Sacá las que no uses para achicar el bundle.
ANIMS = ["stance", "run", "swing", "cast", "shoot", "block", "hit", "die"]

# Celda de destino ANTES de escalar. Los sprites de Flare v1.15 llegan a ~125px de
# ancho y ~145px de alto por encima del punto de anclaje.
CELL_W, CELL_H = 170, 175
ANCHOR_X, ANCHOR_Y = 85, 160   # el punto que se apoya en la baldosa


# ---------------------------------------------------------------- parser
def parse_anim(path):
    """Parsea un .txt de animación de Flare.
    Devuelve (ruta_imagen, {anim: {frames, duration, type, cells:{(frame,dir):rect}}})
    rect = (sx, sy, sw, sh, offset_x, offset_y)
    """
    img, cur, data = None, None, {}
    with open(path, encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^\[(\w+)\]$", line)
            if m:
                cur = m.group(1)
                data[cur] = {"frames": 0, "duration": "", "type": "", "cells": {}}
                continue
            if line.startswith("image="):
                img = line.split("=", 1)[1]
            elif cur is None:
                continue
            elif line.startswith("frames="):
                data[cur]["frames"] = int(line.split("=")[1])
            elif line.startswith("duration="):
                data[cur]["duration"] = line.split("=")[1]
            elif line.startswith("type="):
                data[cur]["type"] = line.split("=")[1]
            elif line.startswith("frame="):
                p = [int(x) for x in line.split("=")[1].split(",")]
                data[cur]["cells"][(p[0], p[1])] = tuple(p[2:8])
    return img, data


def duration_ms(s):
    """'800ms' | '24' (frames a 30fps) -> ms"""
    s = (s or "").strip()
    if s.endswith("ms"):
        return int(float(s[:-2]))
    if s.endswith("s"):
        return int(float(s[:-1]) * 1000)
    try:
        return int(round(float(s) / 30 * 1000))  # legacy: duración en frames
    except ValueError:
        return 800


def repack(anim_txt, root, out_png, scale, anims=ANIMS):
    """Repaqueta un sprite de Flare a grilla uniforme. Devuelve metadata o None."""
    if not os.path.exists(anim_txt):
        return None
    imgrel, data = parse_anim(anim_txt)
    src_path = os.path.join(root, imgrel)
    if not os.path.exists(src_path):
        return None
    src = Image.open(src_path).convert("RGBA")

    seq, meta, col = [], {}, 0
    for a in anims:
        if a not in data or data[a]["frames"] == 0:
            continue
        n = data[a]["frames"]
        meta[a] = {
            "start": col,
            "frames": n,
            "ms": duration_ms(data[a]["duration"]),
            "loop": data[a]["type"] in ("looped", "back_forth"),
            "pingpong": data[a]["type"] == "back_forth",
        }
        seq += [(a, f) for f in range(n)]
        col += n
    if not seq:
        return None

    sheet = Image.new("RGBA", (len(seq) * CELL_W, 8 * CELL_H), (0, 0, 0, 0))
    for ci, (a, f) in enumerate(seq):
        for d in range(8):
            c = data[a]["cells"].get((f, d))
            if not c:
                continue
            sx, sy, sw, sh, ox, oy = c
            piece = src.crop((sx, sy, sx + sw, sy + sh))
            px = ci * CELL_W + ANCHOR_X - ox
            py = d * CELL_H + ANCHOR_Y - oy
            if px < 0 or py < 0:      # sprite más grande que la celda: agrandá CELL_*
                px, py = max(px, 0), max(py, 0)
            sheet.alpha_composite(piece, (px, py))

    w, h = sheet.size
    if scale != 1.0:
        sheet = sheet.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    sheet.save(out_png, optimize=True)
    return {
        "src": os.path.basename(out_png),
        "cell": [int(CELL_W * scale), int(CELL_H * scale)],
        "anchor": [int(ANCHOR_X * scale), int(ANCHOR_Y * scale)],
        "cols": len(seq),
        "anims": meta,
    }


def extract_tileset(name, root, out_dir, scale):
    """Extrae un tileset isométrico: PNG escalado + rects por tile id."""
    tdef = os.path.join(root, "tilesetdefs", name + ".txt")
    if not os.path.exists(tdef):
        return None
    img_rel, tiles = None, {}
    for line in open(tdef, encoding="utf-8", errors="ignore"):
        line = line.strip()
        if line.startswith("img="):
            img_rel = line.split("=", 1)[1]
        elif line.startswith("tile="):
            p = [int(x) for x in line.split("=")[1].split(",")]
            # id, x, y, w, h, offset_x, offset_y
            tiles[p[0]] = p[1:7]
    src = Image.open(os.path.join(root, img_rel)).convert("RGBA")
    if scale != 1.0:
        src = src.resize((int(src.width * scale), int(src.height * scale)), Image.LANCZOS)
    out = os.path.join(out_dir, "tilesets", name + ".png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    src.save(out, optimize=True)
    return {
        "src": "tilesets/" + name + ".png",
        # rects escalados: [x, y, w, h, ox, oy]
        "tiles": {str(k): [int(v * scale) for v in r] for k, r in tiles.items()},
    }


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game", help="ruta al repo flare-game")
    ap.add_argument("--out", default="public/assets")
    ap.add_argument("--scale", type=float, default=0.5,
                    help="0.5 = mitad de resolución (los assets v1.15 apuntan a 1080-1440p)")
    ap.add_argument("--gender", default="male", choices=["male", "female", "female_dark"])
    a = ap.parse_args()

    core = os.path.join(a.flare, "mods", "fantasycore")
    if not os.path.isdir(core):
        sys.exit(f"No encuentro {core}. Cloná flare-game primero.")

    man = {
        "scale": a.scale,
        "dirs": ["SW", "W", "NW", "N", "NE", "E", "SE", "S"],
        "layers": {}, "enemies": {}, "npcs": {}, "tilesets": {},
        "license": "Art: Flare (Empyrean Campaign) — CC-BY-SA 3.0 — flareteam/flare-game",
    }

    for L in AVATAR_LAYERS:
        r = repack(f"{core}/animations/avatar/{a.gender}/{L}.txt", core,
                   f"{a.out}/avatar/{L}.png", a.scale)
        if r:
            r["src"] = "avatar/" + os.path.basename(r["src"])
            man["layers"][L] = r
        else:
            print("  (falta capa)", L)

    for e in ENEMIES:
        r = repack(f"{core}/animations/enemies/{e}.txt", core,
                   f"{a.out}/enemies/{e}.png", a.scale)
        if r:
            r["src"] = "enemies/" + os.path.basename(r["src"])
            man["enemies"][e] = r

    for n in NPCS:
        r = repack(f"{core}/animations/npcs/{n}.txt", core,
                   f"{a.out}/npcs/{n}.png", a.scale)
        if r:
            r["src"] = "npcs/" + os.path.basename(r["src"])
            man["npcs"][n] = r

    for t in TILESETS:
        r = extract_tileset(t, core, a.out, a.scale)
        if r:
            man["tilesets"][t] = r

    # íconos de inventario
    ic = Image.open(f"{core}/images/icons/icons.png").convert("RGBA")
    isz = ic.width // 8                      # 8 columnas fijas
    if a.scale != 1.0:
        ic = ic.resize((int(ic.width * a.scale), int(ic.height * a.scale)), Image.LANCZOS)
        isz = int(isz * a.scale)
    ic.save(f"{a.out}/icons.png", optimize=True)
    man["icons"] = {"src": "icons.png", "size": isz, "cols": 8}

    with open(f"{a.out}/assets.json", "w") as fh:
        json.dump(man, fh, indent=1)

    total = sum(os.path.getsize(os.path.join(dp, f))
                for dp, _, fs in os.walk(a.out) for f in fs)
    print(f"\nOK · capas {len(man['layers'])} · enemigos {len(man['enemies'])} "
          f"· npcs {len(man['npcs'])} · tilesets {len(man['tilesets'])}")
    print(f"    bundle: {total/1e6:.1f} MB en {a.out}")


if __name__ == "__main__":
    main()
