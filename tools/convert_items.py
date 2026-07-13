#!/usr/bin/env python3
"""
convert_items.py - Parse the REAL Flare items (Empyrean Campaign) into shared/items.json.

No invented items or stats: everything comes from the Flare data files under
mods/empyrean_campaign/items/categories/*.txt, resolving INCLUDE base files
(recursively) from the empyrean_campaign and fantasycore mods.

Usage:
    python3 tools/convert_items.py [--flare vendor/flare-game] [--out shared/items.json]

Stdlib only. Item/field names are Spanish (rioplatense neutro); code is English.
"""

import argparse
import json
import os
import sys


# Mods (in resolution order) where INCLUDE paths are searched.
MOD_ORDER = ["empyrean_campaign", "fantasycore"]

# quality -> rarity (Spanish). Files whose name contains "unique" force "unico".
QUALITY_TO_RARITY = {
    "normal": "comun",
    "high": "fino",
    "epic": "legendario",
    "unique": "unico",
    "one_time_use": "comun",
}

# Equippable-visible slots (paperdoll), for the final report.
VISIBLE_SLOTS = {"chest", "legs", "hands", "feet", "head", "main", "off"}

# English material adjectives that go BEFORE the noun in English but right AFTER it
# in Spanish (e.g. "Cloth Shirt" -> "Camisa de tela"). Placed first in the tail.
MATERIAL_WORDS = {
    "Cloth", "Leather", "Chain", "Plate", "Iron", "Steel", "Wooden", "Wood",
    "Wool", "Silk", "Velvet", "Mastite", "Silver", "Gold",
}

# English base nouns (the item type). These stay at the HEAD; everything else in the
# name is a modifier that moves to the tail (Spanish word order).
NOUN_WORDS = {
    # armor
    "Shirt", "Pants", "Vest", "Skirt", "Sleeves", "Robe", "Tunic", "Cuirass",
    "Greaves", "Gauntlets", "Gloves", "Boots", "Sandals", "Steppers", "Helm",
    "Helmet", "Hood", "Coif", "Cap", "Hat", "Crown", "Mask", "Cowl", "Wraps",
    "Leathers", "Platemail", "Armguards", "Crest", "Tri-pants",
    # weapons
    "Dagger", "Knife", "Shortsword", "Longsword", "Greatsword", "Sword",
    "Zweihander", "Blade", "Axe", "Hatchet", "Mace", "Battlemace", "Maul",
    "Hammer", "Club", "Spear", "Bow", "Shortbow", "Longbow", "Greatbow",
    "Sling", "Slingshot", "Crossbow", "Wand", "Rod", "Staff", "Greatstaff",
    "Sceptre", "Battleaxe", "Battlemace",
    # shields / accessories
    "Buckler", "Shield", "Ring", "Amulet", "Necklace", "Pendant", "Cloak",
    "Cape", "Belt", "Bracers", "Fleshband", "Soulband",
    # consumables / misc
    "Potion", "Scroll", "Book", "Spellbook", "Gem", "Key", "Elixir", "Tome",
    "Journal", "Note", "Notes", "Pages", "Vial", "Bottle", "Quill", "Inkwell",
    "Mortar", "Pestle", "Powder", "Dynamite", "Branch", "Totem", "Figurine",
    "Chest", "Sapphire", "Ruby", "Emerald", "Crystal", "Mushrooms",
}

# Token-by-token translation dictionary (English -> Spanish rioplatense neutro).
TRANSLATE = {
    # materials (tail)
    "Cloth": "de tela", "Leather": "de cuero", "Chain": "de malla",
    "Plate": "de placas", "Iron": "de hierro", "Steel": "de acero",
    "Wooden": "de madera", "Wood": "de madera", "Wool": "de lana",
    "Silk": "de seda", "Velvet": "de terciopelo", "Mastite": "de mastita",
    "Silver": "de plata", "Gold": "de oro",
    # armor pieces (head)
    "Shirt": "Camisa", "Pants": "Pantalones", "Vest": "Chaleco",
    "Skirt": "Faldón", "Sleeves": "Mangas", "Robe": "Túnica", "Tunic": "Túnica",
    "Cuirass": "Coraza", "Greaves": "Grebas", "Gauntlets": "Guanteletes",
    "Gloves": "Guantes", "Boots": "Botas", "Sandals": "Sandalias",
    "Steppers": "Zapatillas", "Helm": "Yelmo", "Helmet": "Yelmo",
    "Hood": "Capucha", "Coif": "Cofia", "Cap": "Gorro", "Hat": "Sombrero",
    "Crown": "Corona", "Mask": "Máscara", "Cowl": "Capirote", "Wraps": "Vendas",
    "Leathers": "Cueros", "Platemail": "Cota de placas", "Armguards": "Brazaletes",
    "Crest": "Cimera", "Tri-pants": "Pantalón triple",
    # weapons - blades (head)
    "Dagger": "Daga", "Knife": "Cuchillo", "Shortsword": "Espada corta",
    "Longsword": "Espada larga", "Greatsword": "Espadón", "Sword": "Espada",
    "Zweihander": "Mandoble", "Blade": "Hoja",
    # weapons - blunt / axe (head)
    "Axe": "Hacha", "Battleaxe": "Hacha de guerra", "Hatchet": "Hacha de mano",
    "Mace": "Maza", "Battlemace": "Maza de guerra", "Maul": "Mazo",
    "Hammer": "Martillo", "Club": "Garrote", "Spear": "Lanza",
    # ranged (head)
    "Bow": "Arco", "Shortbow": "Arco corto", "Longbow": "Arco largo",
    "Greatbow": "Arco de guerra", "Sling": "Honda", "Slingshot": "Honda",
    "Crossbow": "Ballesta",
    # magic (head)
    "Wand": "Varita", "Rod": "Vara", "Staff": "Bastón", "Greatstaff": "Gran bastón",
    "Sceptre": "Cetro",
    # shields (head, except Kite modifier)
    "Buckler": "Broquel", "Shield": "Escudo", "Kite": "de cometa",
    # accessories / misc wear (head)
    "Ring": "Anillo", "Amulet": "Amuleto", "Necklace": "Collar",
    "Pendant": "Colgante", "Cloak": "Capa", "Cape": "Capa", "Belt": "Cinturón",
    "Bracers": "Brazales", "Fleshband": "Banda de carne", "Soulband": "Banda de alma",
    # consumables / misc (head)
    "Potion": "Poción", "Scroll": "Pergamino", "Book": "Libro",
    "Spellbook": "Libro de hechizos", "Gem": "Gema", "Key": "Llave",
    "Elixir": "Elixir", "Tome": "Tomo", "Journal": "Diario", "Note": "Nota",
    "Notes": "Notas", "Pages": "Páginas", "Vial": "Vial", "Bottle": "Botella",
    "Quill": "Pluma", "Inkwell": "Tintero", "Mortar": "Mortero", "Pestle": "maja",
    "Powder": "Pólvora", "Dynamite": "Dinamita", "Branch": "Rama", "Totem": "Tótem",
    "Figurine": "Figurilla", "Chest": "Cofre",
    # gems (head)
    "Sapphire": "Zafiro", "Ruby": "Rubí", "Emerald": "Esmeralda", "Crystal": "Cristal",
    # potion / property words (tail)
    "Health": "de vida", "Mana": "de maná", "Healing": "de curación",
    "Stamina": "de aguante", "Restoration": "de restauración", "Elemental": "elemental",
    "Super": "súper", "Ultra": "ultra",
    # element affixes (tail)
    "Fire": "de fuego", "Ice": "de hielo", "Lightning": "del rayo",
    "Dark": "de las sombras", "Frost": "de escarcha", "Blood": "de sangre",
    "Burn": "de quemadura", "Electric": "eléctrico", "Shadow": "de sombra",
    "Inferno": "del infierno", "Blaze": "de llamas", "Freeze": "de congelación",
    "Shock": "de descarga", "Gloom": "de penumbra", "Glacial": "glacial",
    "Volt": "de voltaje", "Void": "del vacío",
    # purpose affixes (tail)
    "Experience": "de experiencia", "Wealth": "de riqueza", "Treasure": "del tesoro",
    "Knowledge": "de conocimiento", "Prosperity": "de prosperidad", "Loot": "de botín",
    "Greed": "de codicia", "Affluence": "de opulencia", "Intellectual": "del intelecto",
    "Lucrative": "lucrativo", "Fireball": "de bola de fuego", "Bolt": "de descarga",
    "Haste": "de premura", "Immunity": "de inmunidad", "Reflection": "de reflejo",
    # set / tier prefixes (tail)
    "Fighting": "de combate", "Recon": "de reconocimiento", "Sorcerer": "de hechicero",
    "Warrior": "de guerrero", "Ranger": "de montaraz", "Wandering": "errante",
    "Adventurer": "de aventurero", "Master": "del maestro", "Wizard": "de mago",
    "Mage": "de mago", "Paladin": "de paladín", "Templar": "de templario",
    "Scholar": "de erudito", "Huntsman": "de cazador", "Guardsman": "de guardia",
    "Worn": "desgastado", "Battle": "de batalla", "Keeper": "del guardián",
    "Strange": "extraño",
    # named sets (tail)
    "Warlord": "del Caudillo", "Sniper": "del Francotirador",
    "Archwizard": "del Archimago",
    # crafting / consumable extras
    "Empty": "vacía", "Mushrooms": "Hongos", "Aloe": "Aloe", "Vera": "Vera",
    "Gravebloom": "Flor de tumba", "Blast": "de detonación",
    "Bear": "de oso", "Owl": "de búho", "Cat": "de gato", "Turtle": "de tortuga",
    # connective words
    "of": "de", "the": "el", "and": "y",
}


def parse_blocks(path):
    """Read a category file; return a list of blocks.
    Each block is an ordered list of (key, value) line pairs (raw, unresolved).
    A block starts at an '[item]' header line."""
    blocks = []
    current = None
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("[") and line.endswith("]"):
                if line == "[item]":
                    current = []
                    blocks.append(current)
                else:
                    current = None  # some other section: ignore
                continue
            if current is None:
                continue
            current.append(line)
    return blocks


def resolve_include_path(inc_path, flare_root):
    """Return the absolute path of an INCLUDE, searching mods in order."""
    for mod in MOD_ORDER:
        candidate = os.path.join(flare_root, "mods", mod, inc_path)
        if os.path.isfile(candidate):
            return candidate
    return None


def flatten_lines(lines, flare_root, seen):
    """Expand INCLUDE directives in place (recursively), returning an ordered
    list of (key, value) pairs. Last assignment wins for scalars (handled by the
    caller); INCLUDE content is inlined at the position where it appears."""
    out = []
    for line in lines:
        if line.startswith("INCLUDE "):
            inc_path = line[len("INCLUDE "):].strip()
            base = resolve_include_path(inc_path, flare_root)
            if base is None or base in seen:
                continue
            seen.add(base)
            with open(base, "r", encoding="utf-8", errors="replace") as fh:
                base_lines = []
                for raw in fh:
                    s = raw.strip()
                    if s and not s.startswith("#") and not (s.startswith("[") and s.endswith("]")):
                        base_lines.append(s)
            out.extend(flatten_lines(base_lines, flare_root, seen))
        elif "=" in line:
            key, val = line.split("=", 1)
            out.append((key.strip(), val.strip()))
    return out


def fold(pairs):
    """Fold ordered (key, value) pairs into a resolved dict.
    Scalars: last assignment wins. bonus: accumulated into a 'stats' dict
    (numeric values summed)."""
    fields = {}
    stats = {}
    for key, val in pairs:
        if key == "bonus":
            if "," not in val:
                continue
            stat, num = val.split(",", 1)
            stat = stat.strip()
            num = num.strip()
            try:
                num = int(num)
            except ValueError:
                try:
                    num = float(num)
                except ValueError:
                    stats[stat] = num  # non-numeric: overwrite
                    continue
            if stat in stats and isinstance(stats[stat], (int, float)):
                stats[stat] += num
            else:
                stats[stat] = num
        else:
            fields[key] = val  # last wins
    return fields, stats


def to_int(value, default=0):
    if value is None:
        return default
    # price can be "20,player_level:20" -> take first token
    token = str(value).split(",", 1)[0].strip()
    try:
        return int(token)
    except ValueError:
        return default


def translate_name(name_en):
    """Translate an item name into Spanish with proper word order. The base noun
    stays first (head); materials come right after it, then every other modifier
    (elements, sets, tiers) — so "Health Potion" -> "Poción de vida" and
    "Warlord Cloth Shirt" -> "Camisa de tela del Caudillo". Possessives ("Krolan's")
    and "of [the] X" become "de[l] X". Unknown tokens are kept as-is."""
    if not name_en:
        return name_en
    head, mat_tail, tail = [], [], []
    tokens = name_en.split()
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok == "the":
            i += 1
            continue
        if tok == "of":
            j = i + 1
            art = ""
            if j < len(tokens) and tokens[j] == "the":
                art = "l"
                j += 1
            if j < len(tokens):
                nxt = TRANSLATE.get(tokens[j], tokens[j])
                tail.append(nxt if nxt.startswith("de") else ("de%s " % art) + nxt)
                i = j + 1
                continue
            i += 1
            continue
        if tok.endswith("'s"):
            base = tok[:-2]
            tail.append("de " + TRANSLATE.get(base, base))
            i += 1
            continue
        trans = TRANSLATE.get(tok, tok)
        if tok in NOUN_WORDS:
            head.append(trans)
        elif tok in MATERIAL_WORDS:
            mat_tail.append(trans)
        else:
            tail.append(trans)
        i += 1
    return " ".join(head + mat_tail + tail).strip()


def load_layers(assets_path):
    """Return the set of valid paperdoll layer names from assets.json, or None."""
    if not os.path.isfile(assets_path):
        return None
    try:
        with open(assets_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None
    layers = data.get("layers")
    if isinstance(layers, dict):
        return set(layers.keys())
    if isinstance(layers, list):
        return set(layers)
    return None


def build_item(block, flare_root, source_name, valid_layers):
    """Turn a raw block into a shared item dict, or None if it has no id."""
    pairs = flatten_lines(block, flare_root, set())
    fields, stats = fold(pairs)

    if "id" not in fields:
        return None
    try:
        item_id = int(fields["id"])
    except ValueError:
        return None

    name_en = fields.get("name", "")

    # rarity: from quality, but a "unique" source file forces "unico".
    quality = fields.get("quality", "")
    rarity = QUALITY_TO_RARITY.get(quality, "comun")
    if "unique" in source_name:
        rarity = "unico"

    # gfx: only keep if it exists as a paperdoll layer.
    gfx = fields.get("gfx")
    if gfx is not None and valid_layers is not None and gfx not in valid_layers:
        gfx = None

    icon = fields.get("icon")
    icon = to_int(icon, None) if icon is not None else None

    equip_flags = fields.get("equip_flags")

    return {
        "id": item_id,
        "name": translate_name(name_en) if name_en else name_en,
        "name_en": name_en,
        "slot": fields.get("item_type"),
        "icon": icon,
        "tier": to_int(fields.get("level"), 0),
        "price": to_int(fields.get("price"), 0),
        "rarity": rarity,
        "gfx": gfx,
        "stats": stats,
        "equip_flags": equip_flags,
    }


def main():
    ap = argparse.ArgumentParser(description="Convert Flare items to shared/items.json")
    ap.add_argument("--flare", default="vendor/flare-game", help="path to flare-game repo")
    ap.add_argument("--out", default="shared/items.json", help="output JSON path")
    args = ap.parse_args()

    # Anchor relative defaults to the repo root (parent of tools/).
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    flare_root = args.flare if os.path.isabs(args.flare) else os.path.join(repo_root, args.flare)
    out_path = args.out if os.path.isabs(args.out) else os.path.join(repo_root, args.out)

    categories_dir = os.path.join(
        flare_root, "mods", "empyrean_campaign", "items", "categories"
    )
    if not os.path.isdir(categories_dir):
        print("ERROR: categories dir not found: %s" % categories_dir, file=sys.stderr)
        return 1

    valid_layers = load_layers(os.path.join(repo_root, "public", "assets", "assets.json"))
    if valid_layers is None:
        print("WARNING: could not load layers from public/assets/assets.json; "
              "gfx will not be validated.", file=sys.stderr)

    # Process files in sorted order so dedup 'last wins' is deterministic.
    by_id = {}
    for fname in sorted(os.listdir(categories_dir)):
        if not fname.endswith(".txt"):
            continue
        path = os.path.join(categories_dir, fname)
        for block in parse_blocks(path):
            item = build_item(block, flare_root, fname, valid_layers)
            if item is not None:
                by_id[item["id"]] = item  # last wins

    items = [by_id[i] for i in sorted(by_id)]

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump({"items": items}, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    # ---- Summary ----
    by_slot = {}
    by_rarity = {}
    with_gfx = 0
    visible = 0
    for it in items:
        by_slot[it["slot"]] = by_slot.get(it["slot"], 0) + 1
        by_rarity[it["rarity"]] = by_rarity.get(it["rarity"], 0) + 1
        if it["gfx"]:
            with_gfx += 1
        if it["slot"] in VISIBLE_SLOTS:
            visible += 1

    print("Wrote %d items -> %s" % (len(items), out_path))
    print("\nBy slot:")
    for slot in sorted(by_slot, key=lambda s: (s is None, s)):
        print("  %-12s %d" % (slot, by_slot[slot]))
    print("\nBy rarity:")
    for r in sorted(by_rarity):
        print("  %-12s %d" % (r, by_rarity[r]))
    print("\nItems with valid gfx: %d" % with_gfx)
    print("Equippable-visible items (chest/legs/hands/feet/head/main/off): %d" % visible)
    return 0


if __name__ == "__main__":
    sys.exit(main())
