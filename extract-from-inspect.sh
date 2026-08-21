#!/bin/bash

echo ""
echo "=========================================="
echo " EXTRAYENDO DATOS DE inspect-result.txt"
echo "=========================================="
echo ""

if [ ! -f inspect-result.txt ]; then
    echo "❌ No existe inspect-result.txt"
    exit 1
fi

python3 <<'PY'
import re
import json

file = "inspect-result.txt"

with open(file, "r", encoding="utf-8") as f:
    text = f.read()

# Buscar pares:
# LINK: Nombre => URL
pattern = re.compile(
    r'LINK:\s*(.*?)\s*=>\s*(https?://[^\s]+)',
    re.MULTILINE
)

results = []

for name, url in pattern.findall(text):

    name = name.strip()
    url = url.strip()

    if not name:
        continue

    results.append({
        "name": name,
        "url": url
    })

# Eliminar duplicados
unique = []
seen = set()

for item in results:

    key = item["name"].lower() + "|" + item["url"]

    if key in seen:
        continue

    seen.add(key)
    unique.append(item)

with open("extracted-links.json", "w", encoding="utf-8") as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)

print("TOTAL ENLACES:", len(unique))
print("")
print("Primeros 100:")
print("")

for i, item in enumerate(unique[:100], 1):
    print(
        f"[{i}] {item['name']} => {item['url']}"
    )

print("")
print("Archivo creado:")
print("extracted-links.json")
PY

echo ""
echo "=========================================="
echo " FIN"
echo "=========================================="
echo ""
