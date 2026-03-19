import os
import re

def sanitize_logs(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return

    original_content = content

    # Replace specific console logs requested by user
    content = re.sub(r'console\.log\([^;]*API RESPONSE[^;]*\);?', 'console.log("Data loaded successfully");', content, flags=re.IGNORECASE)
    content = re.sub(r'console\.log\([^;]*API RESPONSE[^;]*data[^;]*\);?', 'console.log("Data loaded successfully");', content, flags=re.IGNORECASE)
    content = re.sub(r'console\.error\([^;]*API ERROR[^;]*\);?', 'console.error("Failed to load data");', content, flags=re.IGNORECASE)
    content = re.sub(r'console\.error\([^;]*Fetch error[^;]*\);?', 'console.error("Failed to load data");', content, flags=re.IGNORECASE)
    content = re.sub(r'console\.error\([^;]*API Chat Error[^;]*\);?', 'console.error("Failed to load data");', content, flags=re.IGNORECASE)
    content = re.sub(r'console\.error\([^;]*Stream API Error[^;]*\);?', 'console.error("Failed to load data");', content, flags=re.IGNORECASE)
    content = re.sub(r'console\.log\([^;]*Success via[^;]*\);?', 'console.log("Data loaded successfully");', content, flags=re.IGNORECASE)
    
    # Catch-alls for other exposes
    content = re.sub(r'console\.error\([^;]*failed[^;]*\);?', 'console.error("Failed to load data");', content, flags=re.IGNORECASE)
    content = re.sub(r'console\.error\([^;]*error[^;]*\);?', 'console.error("Failed to load data");', content, flags=re.IGNORECASE)
    
    # If there's any remaining Jikan API response log not caught by above
    content = re.sub(r'(?i)console\.log\([^;]*Jikan API response[^;]*\);?', 'console.log("Data loaded successfully");', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched logs: {filepath}")

for root, dirs, files in os.walk('.'):
    # Skip non-relevant folders
    if any(ignore in root for ignore in ['.git', 'node_modules', '.gemini', 'api']):
        continue
    for file in files:
        if file.endswith('.js'):
            sanitize_logs(os.path.join(root, file))

print("Log sanitization applied.")
