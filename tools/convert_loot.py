#!/usr/bin/env python3
"""
convert_loot.py - Parse the REAL Flare loot tables into shared/loot.json.

No invented drops: everything comes from mods/empyrean_campaign/loot/*.txt,
resolving INCLUDE lines recursively. Each `loot=` line is an independent roll:

    loot=<item_id>,<chance%>[,<qty_min>[,<qty_max>]]
    loot=currency,<chance%>,<min>,<max>

Output (shared/loot.json):
    { "tables": { "chest_level_2": {
        "currency": [{"chance":100,"min":60,"max":80}, ...],
        "drops":    [{"id":750,"chance":20,"min":1,"max":2}, ...] }, ... } }

Usage:
    python3 tools/convert_loot.py [--flare vendor/flare-game] [--out shared/loot.json]

Stdlib only. Code in English.
"""

import argparse
import json
import os
import re
import sys

MOD = "empyrean_campaign"


def resolve(flare, rel):
    """Absolute path of a loot include (searched under the empyrean mod)."""
    return os.path.join(flare, "mods", MOD, rel)


def parse_table(flare, rel, seen):
    """Return (currency_rolls, drop_rolls) for a loot .txt, resolving INCLUDEs."""
    path = resolve(flare, rel)
    if path in seen or not os.path.isfile(path):
        return [], []
    seen.add(path)
    currency, drops = [], []
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            if line.startswith("INCLUDE "):
                inc = line[len("INCLUDE "):].strip()
                c, d = parse_table(flare, inc, seen)
                currency += c
                drops += d
                continue
            if not line.startswith("loot="):
                continue
            parts = [p.strip() for p in line[len("loot="):].split(",")]
            if parts[0] == "currency":
                # currency,chance,min,max
                chance = int(parts[1]) if len(parts) > 1 else 100
                lo = int(parts[2]) if len(parts) > 2 else 1
                hi = int(parts[3]) if len(parts) > 3 else lo
                currency.append({"chance": chance, "min": lo, "max": hi})
            else:
                try:
                    iid = int(parts[0])
                except ValueError:
                    continue
                chance = int(parts[1]) if len(parts) > 1 else 100
                lo = int(parts[2]) if len(parts) > 2 else 1
                hi = int(parts[3]) if len(parts) > 3 else lo
                drops.append({"id": iid, "chance": chance, "min": lo, "max": hi})
    return currency, drops


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flare", default="vendor/flare-game")
    ap.add_argument("--out", default="shared/loot.json")
    args = ap.parse_args()

    loot_dir = os.path.join(args.flare, "mods", MOD, "loot")
    if not os.path.isdir(loot_dir):
        sys.exit(f"no existe {loot_dir} (cloná vendor/flare-game)")

    tables = {}
    for fn in sorted(os.listdir(loot_dir)):
        if not re.match(r"chest_level_\d+\.txt$", fn):
            continue
        name = fn[:-4]
        currency, drops = parse_table(args.flare, os.path.join("loot", fn), set())
        tables[name] = {"currency": currency, "drops": drops}

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump({"tables": tables}, fh, ensure_ascii=False, indent=1)

    n_drops = sum(len(t["drops"]) for t in tables.values())
    print(f"OK: {len(tables)} tablas de loot, {n_drops} líneas de drop -> {args.out}")


if __name__ == "__main__":
    main()
