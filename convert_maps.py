#!/usr/bin/env python3
"""
convert_maps.py — Mapas de Flare (.txt) -> JSON para el cliente web.

Uso:
    python tools/convert_maps.py --maps black_oak_city lochport goblin_cave
    python tools/convert_maps.py --all

Formato de salida (public/maps/<nombre>.json):
{
  "name": "black_oak_city",
  "title": "Black Oak City",
  "w": 100, "h": 100,
  "tileW": 192, "tileH": 96,          # en px ORIGINALES; el cliente aplica scale
  "tileset": "tileset_grassland",
  "spawn": [98, 50],
  "layers": {
     "background": [[...ids...]],     # matriz h x w, 0 = vacío
     "object":     [[...ids...]],     # props, muros, árboles (se dibujan con depth sort)
     "collision":  [[...ids...]]      # 0 = caminable, >0 = bloqueado
  },
  "portals":  [{"x","y","w","h","to","tx","ty","label"}],
  "chests":   [{"x","y","loot"}],
  "npcs":     [{"x","y","id"}],
  "spawners": [{"x","y","w","h","category","level","n"}]
}

Notas sobre la colisión de Flare:
  0 = pasable
  1 = bloquea movimiento y proyectiles (pared)
  2 = bloquea movimiento, deja pasar proyectiles (agua, hoyo)
  3+ = variantes (ver engine). Tratá todo >0 como bloqueado para empezar.
"""
import os, re, json, argparse, glob

TXT_INT = re.compile(r"^(\w+)=(.*)$")


def parse_map(path):
    m = {"layers": {}, "portals": [], "chests": [], "npcs": [], "spawners": []}
    section, buf, layer_type, reading_data = None, {}, None, False
    rows = []

    def flush():
        nonlocal section, buf, layer_type, rows
        if section == "layer" and layer_type:
            m["layers"][layer_type] = rows
        elif section == "event":
            ev = buf
            loc = [int(x) for x in ev.get("location", "0,0,1,1").split(",")]
            if "intermap" in ev:
                p = ev["intermap"].split(",")
                dest = os.path.splitext(os.path.basename(p[0]))[0]
                m["portals"].append({
                    "x": loc[0], "y": loc[1], "w": loc[2], "h": loc[3],
                    "to": dest,
                    "tx": int(p[1]) if len(p) > 1 else 0,
                    "ty": int(p[2]) if len(p) > 2 else 0,
                    "label": ev.get("tooltip", dest.replace("_", " ").title()),
                })
            elif "loot" in ev:
                m["chests"].append({"x": loc[0], "y": loc[1],
                                    "loot": os.path.basename(ev["loot"])})
            elif "npc" in ev:
                m["npcs"].append({"x": loc[0], "y": loc[1],
                                  "id": os.path.splitext(os.path.basename(ev["npc"]))[0]})
        elif section == "enemy":
            loc = [int(x) for x in buf.get("location", "0,0,1,1").split(",")]
            # level y number pueden ser un valor ("10") o un rango ("2,3")
            def rng(v, d):
                p = [int(x) for x in str(buf.get(v, d)).split(",") if x.strip()]
                return [p[0], p[-1]] if p else [d, d]
            m["spawners"].append({
                "x": loc[0], "y": loc[1], "w": loc[2], "h": loc[3],
                "category": buf.get("category", "generic"),
                "level": rng("level", 1),     # [min, max]
                "n": rng("number", 1),        # [min, max]
            })
        elif section == "header":
            m["w"] = int(buf.get("width", 0))
            m["h"] = int(buf.get("height", 0))
            m["tileW"] = int(buf.get("tilewidth", 192))
            m["tileH"] = int(buf.get("tileheight", 96))
            m["title"] = buf.get("title", "")
            m["tileset"] = os.path.splitext(os.path.basename(buf.get("tileset", "")))[0]
            hp = buf.get("hero_pos", "0,0").split(",")
            m["spawn"] = [int(hp[0]), int(hp[1])]
        buf, layer_type, rows = {}, None, []

    for raw in open(path, encoding="utf-8", errors="ignore"):
        line = raw.rstrip("\n")
        s = line.strip()
        if s.startswith("#"):
            continue
        if s.startswith("[") and s.endswith("]"):
            flush()
            section = s[1:-1]
            reading_data = False
            continue
        if reading_data:
            if not s:
                reading_data = False
                continue
            rows.append([int(v) for v in s.rstrip(",").split(",") if v != ""])
            continue
        mt = TXT_INT.match(s)
        if not mt:
            continue
        k, v = mt.group(1), mt.group(2)
        if section == "layer" and k == "type":
            layer_type = v
        elif section == "layer" and k == "data":
            reading_data = True
        else:
            buf[k] = v
    flush()
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="public/maps")
    ap.add_argument("--maps", nargs="*", default=[])
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()

    src = os.path.join(a.flare, "mods", "empyrean_campaign", "maps")
    os.makedirs(a.out, exist_ok=True)

    files = (sorted(glob.glob(os.path.join(src, "*.txt"))) if a.all
             else [os.path.join(src, n + ".txt") for n in a.maps])

    index = []
    for f in files:
        if not os.path.exists(f):
            print("  falta:", f)
            continue
        name = os.path.splitext(os.path.basename(f))[0]
        m = parse_map(f)
        if not m.get("w"):
            continue
        m["name"] = name
        with open(os.path.join(a.out, name + ".json"), "w") as fh:
            json.dump(m, fh, separators=(",", ":"))
        index.append({"name": name, "title": m.get("title", name),
                      "w": m["w"], "h": m["h"], "tileset": m.get("tileset", "")})
        print(f"  {name:26} {m['w']}x{m['h']:<4} portales={len(m['portals']):<3} "
              f"spawners={len(m['spawners']):<3} cofres={len(m['chests'])}")

    with open(os.path.join(a.out, "index.json"), "w") as fh:
        json.dump(index, fh, indent=1)
    print(f"\n{len(index)} mapas -> {a.out}")


if __name__ == "__main__":
    main()
