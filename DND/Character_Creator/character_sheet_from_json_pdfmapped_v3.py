import json
import sys
import textwrap
from typing import Any, Dict, List

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject


# Actual PDF field names for the uploaded 5E_CharacterSheet_Fillable.pdf
FIELD_MAP = {
    "class_level": "ClassLevel",
    "background": "Background",
    "player_name": "PlayerName",
    "character_name": "CharacterName",
    "race": "Race ",
    "alignment": "Alignment",
    "xp": "XP",
    "inspiration": "Inspiration",
    "ac": "AC",
    "str": "STR",
    "initiative": "Initiative",
    "speed": "Speed",
    "prof_bonus": "ProfBonus",
    "personality_traits": "PersonalityTraits ",
    "str_mod": "STRmod",
    "hp_max": "HPMax",
    "str_save": "ST Strength",
    "dex_save": "ST Dexterity",
    "dex": "DEX",
    "con_save": "ST Constitution",
    "current_hp": "HPCurrent",
    "ideals": "Ideals",
    "int_save": "ST Intelligence",
    "dex_mod": "DEXmod ",
    "wis_save": "ST Wisdom",
    "cha_save": "ST Charisma",
    "temp_hp": "HPTemp",
    "bonds": "Bonds",
    "con": "CON",
    "acrobatics": "Acrobatics",
    "total_hit_dice": "HDTotal",
    "con_mod": "CONmod",
    "animal_handling": "Animal",
    "hit_dice": "HD",
    "arcana": "Arcana",
    "flaws": "Flaws",
    "athletics": "Athletics",
    "int": "INT",
    "deception": "Deception ",
    "history": "History ",
    "int_mod": "INTmod",
    "insight": "Insight",
    "intimidation": "Intimidation",
    "investigation": "Investigation ",
    "wis": "WIS",
    "medicine": "Medicine",
    "nature": "Nature",
    "wis_mod": "WISmod",
    "perception": "Perception ",
    "performance": "Performance",
    "persuasion": "Persuasion",
    "cha": "CHA",
    "religion": "Religion",
    "sleight_of_hand": "SleightofHand",
    "stealth": "Stealth ",
    "cha_mod": "CHamod",
    "survival": "Survival",
    "passive_perception": "Passive",
    "other_proficiencies": "ProficienciesLang",
    "features_and_traits": "Features and Traits",
}

SAVE_CHECKBOXES = {
    "STR": "Check Box 11",
    "DEX": "Check Box 18",
    "CON": "Check Box 19",
    "INT": "Check Box 20",
    "WIS": "Check Box 21",
    "CHA": "Check Box 22",
}

SKILL_CHECKBOXES = {
    "Acrobatics": "Check Box 23",
    "Animal Handling": "Check Box 24",
    "Arcana": "Check Box 25",
    "Athletics": "Check Box 26",
    "Deception": "Check Box 27",
    "History": "Check Box 28",
    "Insight": "Check Box 29",
    "Intimidation": "Check Box 30",
    "Investigation": "Check Box 31",
    "Medicine": "Check Box 32",
    "Nature": "Check Box 33",
    "Perception": "Check Box 34",
    "Performance": "Check Box 35",
    "Persuasion": "Check Box 36",
    "Religion": "Check Box 37",
    "Sleight of Hand": "Check Box 38",
    "Stealth": "Check Box 39",
    "Survival": "Check Box 40",
}

SKILL_FIELD_MAP = {
    "Acrobatics": FIELD_MAP["acrobatics"],
    "Animal Handling": FIELD_MAP["animal_handling"],
    "Arcana": FIELD_MAP["arcana"],
    "Athletics": FIELD_MAP["athletics"],
    "Deception": FIELD_MAP["deception"],
    "History": FIELD_MAP["history"],
    "Insight": FIELD_MAP["insight"],
    "Intimidation": FIELD_MAP["intimidation"],
    "Investigation": FIELD_MAP["investigation"],
    "Medicine": FIELD_MAP["medicine"],
    "Nature": FIELD_MAP["nature"],
    "Perception": FIELD_MAP["perception"],
    "Performance": FIELD_MAP["performance"],
    "Persuasion": FIELD_MAP["persuasion"],
    "Religion": FIELD_MAP["religion"],
    "Sleight of Hand": FIELD_MAP["sleight_of_hand"],
    "Stealth": FIELD_MAP["stealth"],
    "Survival": FIELD_MAP["survival"],
}


def load_export_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def safe_get(dct: Dict[str, Any], *keys: str, default: Any = "") -> Any:
    cur: Any = dct
    for key in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
        if cur is None:
            return default
    return cur


def format_modifier(value: Any) -> str:
    try:
        ivalue = int(value)
    except Exception:
        return ""
    return f"{ivalue:+d}"


def as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else ""
    return str(value)


def wrap_feature_entry(title: str, description: str, width: int = 85, indent: int = 4) -> str:
    title = str(title or "").strip()
    description = " ".join(str(description or "").split())

    if not title:
        return description

    if not description:
        return title

    initial = f"{title}: "
    subsequent = " " * indent
    return textwrap.fill(
        description,
        width=width,
        initial_indent=initial,
        subsequent_indent=subsequent,
        break_long_words=False,
        break_on_hyphens=False,
    )


def build_features_text(character: Dict[str, Any]) -> str:
    lines: List[str] = []

    class_block = character.get("class") or {}
    class_name = safe_get(class_block, "name", default="")
    subclass_name = safe_get(class_block, "subclass", default="")
    if class_name:
        lines.append(f"Class: {class_name}" + (f" ({subclass_name})" if subclass_name else ""))

    background_name = safe_get(character, "background", "name", default="")
    if background_name:
        lines.append(f"Background: {background_name}")

    species_name = safe_get(character, "species", "name", default="")
    if species_name:
        lines.append(f"Species: {species_name}")

    adv = character.get("advancement_choices", []) or []
    feat_lines: List[str] = []
    asi_levels: List[str] = []

    for entry in adv:
        if not isinstance(entry, dict):
            continue

        mode = entry.get("mode", "")
        level = entry.get("level", "")

        if mode == "Feat":
            feat_name = (
                entry.get("feat_name")
                or entry.get("featName")
                or safe_get(entry, "feat_record", "name", default="")
                or "Feat"
            )
            feat_description = (
                entry.get("feat_description")
                or safe_get(entry, "feat_record", "description", default="")
            )

            feat_name = " ".join(str(feat_name).split())
            feat_description = " ".join(str(feat_description).split())

            if level:
                feat_name = f"{feat_name} (Level {level})"

            if feat_description:
                feat_lines.append(f"{feat_name}: {feat_description}")
            else:
                feat_lines.append(feat_name)

        elif mode == "Ability Score Improvement":
            asi_levels.append(str(level) if level else "?")

    if feat_lines:
        lines.append("")
        lines.append("Feats:")
        lines.extend(feat_lines)

    if asi_levels:
        lines.append("")
        lines.append("ASI Levels: " + ", ".join(asi_levels))

    extra = character.get("features_and_traits") or character.get("features") or []
    if isinstance(extra, list):
        extra_lines = [" ".join(str(x).split()) for x in extra if str(x).strip()]
        if extra_lines:
            lines.append("")
            lines.extend(extra_lines)
    elif extra:
        lines.append("")
        lines.append(" ".join(str(extra).split()))

    return "\r".join(line for line in lines if line is not None).strip()


def build_other_proficiencies_text(character: Dict[str, Any]) -> str:
    profs = character.get("proficiencies", {}) or {}
    lines: List[str] = []

    weapons = profs.get("weapons", []) or []
    armor = profs.get("armor", []) or []
    other = profs.get("other", []) or []
    languages = profs.get("languages", []) or []

    if weapons:
        lines.append("Weapons: " + ", ".join(sorted(dict.fromkeys(map(str, weapons)))))
    if armor:
        lines.append("Armor: " + ", ".join(sorted(dict.fromkeys(map(str, armor)))))
    if other:
        lines.append("Other: " + ", ".join(sorted(dict.fromkeys(map(str, other)))))
    if languages:
        lines.append("Languages: " + ", ".join(sorted(dict.fromkeys(map(str, languages)))))

    return "\n".join(lines)


def build_class_level(character: Dict[str, Any]) -> str:
    class_name = safe_get(character, "class", "name", default="")
    level = character.get("level", "")
    if class_name and level:
        return f"{class_name} {level}"
    if class_name:
        return class_name
    return as_text(level)


def build_text_fields(data: Dict[str, Any]) -> Dict[str, str]:
    character = data.get("character", {}) or {}
    ability_scores = character.get("ability_scores", {}) or {}
    ability_mods = character.get("ability_modifiers", {}) or {}
    saves = character.get("saving_throws", {}) or {}
    skills = character.get("skills", {}) or {}

    passive_perception = character.get("passive_perception")
    if passive_perception in (None, ""):
        per = skills.get("Perception", {}) or {}
        try:
            passive_perception = 10 + int(per.get("value", 0))
        except Exception:
            passive_perception = ""

    class_level = build_class_level(character)
    fields = {
        FIELD_MAP["class_level"]: class_level,
        FIELD_MAP["background"]: safe_get(character, "background", "name", default=character.get("background", "")),
        FIELD_MAP["player_name"]: character.get("player_name", ""),
        FIELD_MAP["character_name"]: character.get("name", ""),
        FIELD_MAP["race"]: safe_get(character, "species", "name", default=character.get("species", "")),
        FIELD_MAP["alignment"]: character.get("alignment", ""),
        FIELD_MAP["xp"]: as_text(character.get("xp", "")),
        FIELD_MAP["inspiration"]: as_text(character.get("inspiration", "")),
        FIELD_MAP["ac"]: as_text(character.get("ac", "")),
        FIELD_MAP["str"]: as_text(ability_scores.get("STR", "")),
        FIELD_MAP["initiative"]: format_modifier(character.get("initiative", ability_mods.get("DEX", ""))),
        FIELD_MAP["speed"]: as_text(character.get("speed", "")),
        FIELD_MAP["prof_bonus"]: format_modifier(character.get("proficiency_bonus", "")),
        FIELD_MAP["personality_traits"]: character.get("personality_traits", ""),
        FIELD_MAP["str_mod"]: format_modifier(ability_mods.get("STR", "")),
        FIELD_MAP["hp_max"]: as_text(character.get("hp_max", "")),
        FIELD_MAP["str_save"]: format_modifier(safe_get(saves, "STR", "value", default="")),
        FIELD_MAP["dex_save"]: format_modifier(safe_get(saves, "DEX", "value", default="")),
        FIELD_MAP["dex"]: as_text(ability_scores.get("DEX", "")),
        FIELD_MAP["con_save"]: format_modifier(safe_get(saves, "CON", "value", default="")),
        FIELD_MAP["current_hp"]: as_text(character.get("current_hp", "")),
        FIELD_MAP["ideals"]: character.get("ideals", ""),
        FIELD_MAP["int_save"]: format_modifier(safe_get(saves, "INT", "value", default="")),
        FIELD_MAP["dex_mod"]: format_modifier(ability_mods.get("DEX", "")),
        FIELD_MAP["wis_save"]: format_modifier(safe_get(saves, "WIS", "value", default="")),
        FIELD_MAP["cha_save"]: format_modifier(safe_get(saves, "CHA", "value", default="")),
        FIELD_MAP["temp_hp"]: as_text(character.get("temp_hp", "")),
        FIELD_MAP["bonds"]: character.get("bonds", ""),
        FIELD_MAP["con"]: as_text(ability_scores.get("CON", "")),
        FIELD_MAP["total_hit_dice"]: as_text(character.get("total_hit_dice", class_level.split()[-1] if class_level.split() and str(class_level.split()[-1]).isdigit() else "")),
        FIELD_MAP["con_mod"]: format_modifier(ability_mods.get("CON", "")),
        FIELD_MAP["hit_dice"]: safe_get(character, "class", "hit_die", default=character.get("hit_dice", "")),
        FIELD_MAP["flaws"]: character.get("flaws", ""),
        FIELD_MAP["int"]: as_text(ability_scores.get("INT", "")),
        FIELD_MAP["int_mod"]: format_modifier(ability_mods.get("INT", "")),
        FIELD_MAP["wis"]: as_text(ability_scores.get("WIS", "")),
        FIELD_MAP["wis_mod"]: format_modifier(ability_mods.get("WIS", "")),
        FIELD_MAP["cha"]: as_text(ability_scores.get("CHA", "")),
        FIELD_MAP["cha_mod"]: format_modifier(ability_mods.get("CHA", "")),
        FIELD_MAP["passive_perception"]: as_text(passive_perception),
        FIELD_MAP["other_proficiencies"]: build_other_proficiencies_text(character),
        FIELD_MAP["features_and_traits"]: build_features_text(character),
    }

    for skill_name, field_name in SKILL_FIELD_MAP.items():
        fields[field_name] = format_modifier(safe_get(skills, skill_name, "value", default=""))

    return fields


def build_checkbox_states(data: Dict[str, Any]) -> Dict[str, bool]:
    character = data.get("character", {}) or {}
    saves = character.get("saving_throws", {}) or {}
    skills = character.get("skills", {}) or {}

    states: Dict[str, bool] = {}

    for ability, checkbox_name in SAVE_CHECKBOXES.items():
        states[checkbox_name] = bool(safe_get(saves, ability, "proficient", default=False))

    for skill_name, checkbox_name in SKILL_CHECKBOXES.items():
        tier = safe_get(skills, skill_name, "tier", default="none")
        states[checkbox_name] = tier in ("proficient", "expertise")

    inspiration = character.get("inspiration")
    if isinstance(inspiration, bool):
        states[FIELD_MAP["inspiration"]] = inspiration

    return states


def copy_acroform(reader: PdfReader, writer: PdfWriter) -> None:
    if "/AcroForm" not in reader.trailer["/Root"]:
        raise ValueError("This PDF does not appear to have fillable form fields.")

    writer._root_object.update({
        NameObject("/AcroForm"): reader.trailer["/Root"]["/AcroForm"]
    })
    writer._root_object["/AcroForm"].update({
        NameObject("/NeedAppearances"): BooleanObject(True)
    })


def set_checkbox_value(writer: PdfWriter, field_name: str, checked: bool) -> None:
    target = NameObject("/Yes" if checked else "/Off")
    for page in writer.pages:
        annots = page.get("/Annots")
        if not annots:
            continue
        annots = annots.get_object() if hasattr(annots, "get_object") else annots
        for annot_ref in annots:
            annot = annot_ref.get_object()
            if annot.get("/T") == field_name:
                annot.update({
                    NameObject("/V"): target,
                    NameObject("/AS"): target,
                })


def fill_pdf(input_pdf: str, output_pdf: str, text_fields: Dict[str, str], checkbox_states: Dict[str, bool]) -> None:
    reader = PdfReader(input_pdf)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    copy_acroform(reader, writer)

    for page in writer.pages:
        writer.update_page_form_field_values(page, text_fields, auto_regenerate=False)

    for field_name, checked in checkbox_states.items():
        if field_name.startswith("Check Box"):
            set_checkbox_value(writer, field_name, checked)

    with open(output_pdf, "wb") as f:
        writer.write(f)


def main() -> None:
    json_path = sys.argv[1] if len(sys.argv) > 1 else "data.json"
    input_pdf = sys.argv[2] if len(sys.argv) > 2 else "5E_CharacterSheet_Fillable.pdf"
    output_pdf = sys.argv[3] if len(sys.argv) > 3 else "filled_character_sheet.pdf"

    data = load_export_json(json_path)
    text_fields = build_text_fields(data)
    checkbox_states = build_checkbox_states(data)
    fill_pdf(input_pdf, output_pdf, text_fields, checkbox_states)
    print(f"Saved to {output_pdf}")


if __name__ == "__main__":
    main()
