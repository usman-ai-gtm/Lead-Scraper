with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = (
    "    @staticmethod\n"
    "    def clean(value):\n"
    "        if value is None:\n"
    "            return \"\"\n"
    "        return str(value).strip()"
)

dedupe_func = (
    "\n\n    @staticmethod\n"
    "    def dedupe(items):\n"
    "        result = []\n"
    "        seen = set()\n"
    "        for item in items or []:\n"
    "            text = str(item).strip()\n"
    "            if not text:\n"
    "                continue\n"
    "            key = text.lower()\n"
    "            if key not in seen:\n"
    "                seen.add(key)\n"
    "                result.append(text)\n"
    "        return result"
)

idx = content.find("class LeadDeduplicationEngine:")
assert idx != -1, "class LeadDeduplicationEngine not found"

part1 = content[:idx]
part2 = content[idx:]

assert target in part2, "Target clean method not found in LeadDeduplicationEngine"

part2 = part2.replace(target, target + dedupe_func, 1)

with open('app.py', 'w', encoding='utf-8', newline='\n') as f:
    f.write(part1 + part2)

print("Successfully added dedupe to LeadDeduplicationEngine!")

