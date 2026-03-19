import re

with open('js/discovery.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace JIKAN with API_BASE
content = content.replace("const JIKAN = 'https://api.jikan.moe/v4';", "const API_BASE = 'https://api.jikan.moe/v4';")
content = content.replace("${JIKAN}", "${API_BASE}")

with open('js/discovery.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('discovery.js patched')
