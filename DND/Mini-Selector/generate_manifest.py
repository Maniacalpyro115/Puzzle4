import json
import os

DATABASE_DIR = "database"
OUTPUT_FILE = os.path.join(DATABASE_DIR, "manifest.json")
BASE_URL = "https://pub-a16924d33e624186b23a508f51d992f1.r2.dev/database"

minis = []

for mini_class in os.listdir(DATABASE_DIR):
    class_path = os.path.join(DATABASE_DIR, mini_class)
    if not os.path.isdir(class_path):
        continue

    for race in os.listdir(class_path):
        race_path = os.path.join(class_path, race)
        if not os.path.isdir(race_path):
            continue

        for filename in os.listdir(race_path):
            if not filename.lower().endswith(".stl"):
                continue

            name = os.path.splitext(filename)[0]

            public_file_url = f"{BASE_URL}/{mini_class}/{race}/{filename}".replace("\\", "/").replace(" ", "%20")

            minis.append({
                "name": name,
                "class": mini_class,
                "race": race,
                "file": public_file_url
            })

minis.sort(key=lambda m: (m["class"], m["race"], m["name"]))

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump({"minis": minis}, f, indent=2)

print(f"Wrote {len(minis)} minis to {OUTPUT_FILE}")