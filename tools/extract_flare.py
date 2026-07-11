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

# Nombres reales de Flare (verificados contra fantasycore + empyrean_campaign).
ENEMIES = [
    # duendes
    "goblin", "goblin_elite", "goblin_runner", "goblin_elite_runner",
    "hobgoblin", "hobgoblin_archer",
    # no-muertos
    "skeleton", "skeleton_weak", "skeleton_archer", "skeleton_mage",
    "zombie", "zombie_dark", "zombie_ghost", "frozen_zombie",
    "cursed_grave", "cursed_grave_fire", "cursed_grave_ice",
    # hormigas león
    "antlion", "antlion_small", "antlion_armored", "antlion_fossilized",
    "fire_ant", "ice_ant",
    # wyvernos
    "wyvern", "wyvern_air", "wyvern_fire", "wyvern_water",
    # jefes
    "minotaur", "skeleton_knight_boss", "skeleton_mage_boss",
]

NPCS = [
    "wandering_trader", "wandering_trader1", "wandering_trader2",
    "peddler_goblin", "guild_man", "guild_man1", "guild_man2", "knight",
    "peasant_man1", "peasant_man2", "peasant_woman1", "peasant_woman2",
    "return_obelisk1", "return_obelisk2",
]

TILESETS = [
    "tileset_grassland", "tileset_dungeon", "tileset_cave",
    "tileset_ruins", "tileset_snowplains", "tileset_cave_and_dungeon",
]

# Animaciones que exportamos. Sacá las que no uses para achicar el bundle.
ANIMS = ["stance", "run", "swing", "cast", "shoot", "block", "hit", "die"]

# Celda de destino ANTES de escalar. Los sprites de Flare v1.15 llegan a ~125px de
# ancho y ~145px de alto por encima del punto de anclaje.
CELL_W, CELL_H = 170, 175
ANCHOR_X, ANCHOR_Y = 85, 160   # el punto que se apoya en la baldosa


# ---------------------------------------------------------------- parser
def parse_anim(path):
    """Parsea un .txt de animación de Flare. Soporta los dos formatos del engine:

      1. Imagen única: una línea `image=ruta.png` y frames de 8 campos
         `frame=col,dir,sx,sy,sw,sh,ox,oy`.
      2. Multi-imagen: una línea `image=ruta.png,anim` POR animación, y frames con
         un 9º campo con el nombre de la animación (a qué PNG indexan).

    Devuelve (images, {anim: {frames, duration, type, cells:{(frame,dir):rect}}})
    donde images mapea anim -> ruta png ('__single__' para el formato 1).
    rect = (sx, sy, sw, sh, offset_x, offset_y)
    """
    images, cur, data = {}, None, {}
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
                parts = line.split("=", 1)[1].split(",")
                if len(parts) >= 2 and parts[1].strip():
                    images[parts[1].strip()] = parts[0].strip()   # una PNG por anim
                else:
                    images["__single__"] = parts[0].strip()
            elif cur is None:
                continue
            elif line.startswith("frames="):
                data[cur]["frames"] = int(line.split("=")[1])
            elif line.startswith("duration="):
                data[cur]["duration"] = line.split("=")[1]
            elif line.startswith("type="):
                data[cur]["type"] = line.split("=")[1]
            elif line.startswith("frame="):
                # tomamos solo los 8 campos numéricos; el 9º (nombre de anim) se ignora
                # acá porque ya lo resuelve la sección [cur] via `images`.
                p = [int(x) for x in line.split("=", 1)[1].split(",")[:8]]
                data[cur]["cells"][(p[0], p[1])] = tuple(p[2:8])
    return images, data


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


def resolve(roots, rel):
    """Primera coincidencia de `rel` a través de los mods (empyrean pisa a fantasycore)."""
    for r in roots:
        p = os.path.join(r, rel)
        if os.path.exists(p):
            return p
    return None


def repack(anim_txt, roots, out_png, scale, anims=ANIMS):
    """Repaqueta un sprite de Flare a grilla uniforme. Devuelve metadata o None.
    `roots` es la lista de mods donde resolver las imágenes fuente."""
    if not anim_txt or not os.path.exists(anim_txt):
        return None
    images, data = parse_anim(anim_txt)
    if not images:
        return None

    # Cache de imágenes fuente. En el formato multi-imagen hay una PNG por anim;
    # en el de imagen única todas las anims comparten '__single__'.
    srccache = {}
    def get_src(anim):
        rel = images.get(anim) or images.get("__single__")
        if not rel:
            return None
        if rel not in srccache:
            sp = resolve(roots, rel)
            srccache[rel] = Image.open(sp).convert("RGBA") if sp else None
        return srccache[rel]

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
        src = get_src(a)
        if src is None:
            continue
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


def extract_tileset(name, roots, out_dir, scale, atlas_w=2048):
    """Extrae un tileset isométrico y lo REPAQUETA a un atlas propio.

    Un tilesetdef de Flare puede referenciar VARIAS imágenes fuente (una línea
    `img=` por grupo; grassland usa grassland.png + grassland_water.png, snowplains
    usa 4). Cada `tile=` indexa a la imagen `img=` vigente y un id repetido pisa al
    anterior. En vez de copiar las imágenes fuente (que se solapan y desperdician),
    recortamos cada tile de SU imagen correcta y los empaquetamos en un atlas nuevo.
    Los rects de salida apuntan a ese atlas; el cliente no necesita saber nada de esto.
    """
    tdef = resolve(roots, os.path.join("tilesetdefs", name + ".txt"))
    if not tdef:
        return None

    # id -> (img_rel, (x, y, w, h, ox, oy)); el último define gana.
    cur_img, tiledefs = None, {}
    for line in open(tdef, encoding="utf-8", errors="ignore"):
        line = line.strip()
        if line.startswith("img="):
            cur_img = line.split("=", 1)[1].strip()
        elif line.startswith("tile=") and cur_img:
            p = [int(x) for x in line.split("=")[1].split(",")]
            tiledefs[p[0]] = (cur_img, tuple(p[1:7]))
    if not tiledefs:
        return None

    srccache = {}
    def src_img(rel):
        if rel not in srccache:
            p = resolve(roots, rel)
            srccache[rel] = Image.open(p).convert("RGBA") if p else None
        return srccache[rel]

    # Recortar y escalar cada tile.
    crops = {}   # id -> (PIL, ox_escalado, oy_escalado)
    for tid, (img_rel, (x, y, w, h, ox, oy)) in tiledefs.items():
        im = src_img(img_rel)
        if im is None:
            continue
        crop = im.crop((x, y, x + w, y + h))
        if scale != 1.0:
            crop = crop.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        crops[tid] = (crop, int(ox * scale), int(oy * scale))
    if not crops:
        return None

    # Empaquetado por estanterías (altura descendente); pad de 2px anti-bleeding.
    pad = 2
    order = sorted(crops, key=lambda t: crops[t][0].height, reverse=True)
    cx = cy = rowh = 0
    placed = {}
    for tid in order:
        cw, ch = crops[tid][0].size
        if cx + cw + pad > atlas_w:
            cx = 0
            cy += rowh + pad
            rowh = 0
        placed[tid] = (cx, cy)
        cx += cw + pad
        rowh = max(rowh, ch)
    atlas_h = cy + rowh + pad

    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    out_tiles = {}
    for tid, (crop, ox, oy) in crops.items():
        px, py = placed[tid]
        atlas.alpha_composite(crop, (px, py))
        out_tiles[str(tid)] = [px, py, crop.width, crop.height, ox, oy]

    out = os.path.join(out_dir, "tilesets", name + ".png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    atlas.save(out, optimize=True)
    return {"src": "tilesets/" + name + ".png", "tiles": out_tiles}


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game", help="ruta al repo flare-game")
    ap.add_argument("--out", default="public/assets")
    ap.add_argument("--scale", type=float, default=0.5,
                    help="0.5 = mitad de resolución (los assets v1.15 apuntan a 1080-1440p)")
    ap.add_argument("--gender", default="male", choices=["male", "female", "female_dark"])
    a = ap.parse_args()

    # Los assets están repartidos entre mods: empyrean_campaign depende de fantasycore.
    # Buscamos en ese orden (empyrean pisa a core).
    roots = [os.path.join(a.flare, "mods", m) for m in ("empyrean_campaign", "fantasycore")]
    roots = [r for r in roots if os.path.isdir(r)]
    if not roots:
        sys.exit(f"No encuentro los mods de Flare en {a.flare}. Cloná flare-game primero.")

    man = {
        "scale": a.scale,
        "dirs": ["SW", "W", "NW", "N", "NE", "E", "SE", "S"],
        "layers": {}, "enemies": {}, "npcs": {}, "tilesets": {},
        "license": "Art: Flare (Empyrean Campaign) — CC-BY-SA 3.0 — flareteam/flare-game",
    }

    for L in AVATAR_LAYERS:
        r = repack(resolve(roots, f"animations/avatar/{a.gender}/{L}.txt"), roots,
                   f"{a.out}/avatar/{L}.png", a.scale)
        if r:
            r["src"] = "avatar/" + os.path.basename(r["src"])
            man["layers"][L] = r
        else:
            print("  (falta capa)", L)

    for e in ENEMIES:
        r = repack(resolve(roots, f"animations/enemies/{e}.txt"), roots,
                   f"{a.out}/enemies/{e}.png", a.scale)
        if r:
            r["src"] = "enemies/" + os.path.basename(r["src"])
            man["enemies"][e] = r
        else:
            print("  (falta enemigo)", e)

    for n in NPCS:
        r = repack(resolve(roots, f"animations/npcs/{n}.txt"), roots,
                   f"{a.out}/npcs/{n}.png", a.scale)
        if r:
            r["src"] = "npcs/" + os.path.basename(r["src"])
            man["npcs"][n] = r

    for t in TILESETS:
        r = extract_tileset(t, roots, a.out, a.scale)
        if r:
            man["tilesets"][t] = r
        else:
            print("  (falta tileset)", t)

    # íconos de inventario
    ic = Image.open(resolve(roots, "images/icons/icons.png")).convert("RGBA")
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
