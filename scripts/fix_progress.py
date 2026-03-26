import json

with open("d:/Web/IA/E13 Ftiness/Plataforma Web/scripts/progress.json", "r", encoding="utf-8") as f:
    p = json.load(f)

print(f"Before: completed={len(p['completed'])}, failed={len(p['failed'])}")
p["failed"] = []
with open("d:/Web/IA/E13 Ftiness/Plataforma Web/scripts/progress.json", "w", encoding="utf-8") as f:
    json.dump(p, f, ensure_ascii=False, indent=2)
print(f"After: completed={len(p['completed'])}, failed=0 (cleared)")
