import os
import re

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return

    original_content = content

    # 1. HTML Replacements
    content = re.sub(r'Powered by AI &bull; Uses real anime data \(Jikan API\)', 'Powered by AnimeSense Intelligence Engine', content, flags=re.IGNORECASE)
    
    # 2. General Brand Terms
    content = re.sub(r'(?i)Jikan API response', 'Data loaded successfully', content)
    content = re.sub(r'(?i)Jikan API', 'AnimeSense Intelligence Engine', content)
    
    # 3. Clean Comments (replace specific providers with generic names)
    content = re.sub(r'(?i)Jikan calls', 'API calls', content)
    content = re.sub(r'(?i)from Jikan', 'from AnimeSense', content)
    content = re.sub(r'(?i)Jikan \+', 'AnimeSense +', content)
    content = re.sub(r'(?i)Jikan recommendations', 'AnimeSense recommendations', content)
    content = re.sub(r'(?i)Jikan v4', 'v4', content)
    
    # 4. Remove LLM/Groq/OpenAI in Prompts and UI (Except strictly required variable names, mainly strings)
    # Be careful not to break JavaScript variables like `LLMRouter`
    # Replace the "Avoid saying..." string in llm-router.js
    content = re.sub(r'"I\'m an AI" or mentioning Groq, OpenRouter, Jikan, or OpenAI. You are AnimeSense.', r'"I\'m an AI" or mentioning any third-party APIs. You are AnimeSense.', content)

    # 5. Fix chat.js privacy override logic (we will inject it via regex)
    if 'generateResponse(query)' in content and 'function generateResponse' in content:
        if 'Privacy & Branding Check' not in content:
            injection = """async function generateResponse(query) {
    // ── Privacy & Branding Check ──
    const safeQuery = query.toLowerCase();
    if (safeQuery.includes('what model') || safeQuery.includes('which model') || 
        safeQuery.includes('what api') || safeQuery.includes('which api') || 
        safeQuery.includes('openai') || safeQuery.includes('groq') || 
        safeQuery.includes('openrouter') || safeQuery.includes('jikan') || 
        safeQuery.includes('llm')) {
        return "This platform is powered by a proprietary AnimeSense AI system designed to deliver accurate anime insights.";
    }

"""
            content = content.replace('async function generateResponse(query) {\n', injection)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched: {filepath}")

for root, dirs, files in os.walk('.'):
    # Skip non-relevant folders
    if any(ignore in root for ignore in ['.git', 'node_modules', '.gemini', 'api']):
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.css', '.md')):
            process_file(os.path.join(root, file))

print("Privacy patch applied.")
