import os
import re

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
        
        # We only care about front-end UI files, so HTML and JS.
        # Skip backend/API logic keywords that are just variable names (e.g. LLMRouter)
        # But we do care about string literals, console logs, and HTML text exposing backend.
        
        # 1. Check for console logs with API/LLM names
        if 'console.' in line_lower:
            if any(term in line_lower for term in ['jikan', 'groq', 'openrouter', 'openai', 'llm', 'api']):
                # Excluding "API" if it's generic, but let's just log it
                issues += 1
                print(f"[Line {i+1}] Console log leak in {filepath}: {line.strip()}")
                
        # 2. Check for HTML leaks (comments, text nodes)
        if filepath.endswith('.html'):
            # Strip tags and check content
            text_content = re.sub(r'<[^>]+>', '', line_lower)
            if any(term in text_content for term in ['jikan', 'groq', 'openrouter', 'openai']):
                issues += 1
                print(f"[Line {i+1}] HTML Text leak in {filepath}: {line.strip()}")
            if '<!--' in line and any(term in line_lower for term in ['jikan', 'groq', 'openrouter', 'openai']):
                issues += 1
                print(f"[Line {i+1}] HTML Comment leak in {filepath}: {line.strip()}")
                
        # 3. Check for specific provider names in JS strings
        # E.g. console.log("Jikan response"), alert("Groq error")
        # We can look for quotes around the forbidden terms
        matches = re.findall(r'["\'][^"\']*(jikan|groq|openrouter|openai)[^"\']*["\']', line_lower)
        if matches:
            # check if it's the backend config
            if 'api/chat.js' in filepath.replace('\\', '/'):
                continue
            # check if it's our privacy interceptor match array
            if "includes('groq')" in line_lower or "includes('openrouter')" in line_lower or "includes('openai')" in line_lower or "includes('jikan')" in line_lower:
                continue
            if 'mcp_config.json' in filepath.replace('\\', '/'):
                continue
            
            issues += 1
            print(f"[Line {i+1}] JS String leak in {filepath}: {line.strip()}")

for root, dirs, files in os.walk('.'):
    # Skip backend node_modules, .git, etc
    if any(ignore in root for ignore in ['.git', 'node_modules', '.gemini', 'api', '.vercel']):
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.css')):
            check_file(os.path.join(root, file))

if issues == 0:
    print("ALL CLEAN: No leaks found!")
