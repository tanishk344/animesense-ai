import os

issues = 0

def check_file(filepath):
    global issues
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception:
        return

    for i, line in enumerate(lines):
        line_lower = line.lower()
        if 'console.' in line_lower:
            if any(term in line_lower for term in ['jikan', 'groq', 'openrouter', 'openai', 'llm', 'api']):
                issues += 1
                print(f"[Line {i+1}] Console leak in {filepath}: {line.strip()}")

for root, dirs, files in os.walk('.'):
    if any(ignore in root for ignore in ['.git', 'node_modules', '.gemini', 'api', '.vercel']):
        continue
    for file in files:
        if file.endswith(('.html', '.js')):
            check_file(os.path.join(root, file))

if issues == 0:
    print("ALL CLEAN: No console leaks found!")
