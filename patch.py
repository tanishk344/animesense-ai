import os, glob

files = glob.glob('*.html') + glob.glob('js/*.js')
pages = ['index.html', 'chat.html', 'search.html', 'watchlist.html', 'dashboard.html']

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple replacement to absolute paths.
    for page in pages:
        # Prevent double slashes
        content = content.replace(f'href="{page}"', f'href="/{page}"')
        content = content.replace(f"href='{page}'", f"href='/{page}'")
        content = content.replace(f"'{page}'", f"'/{page}'") 
        content = content.replace(f'"{page}"', f'"/{page}"')

    # Fix the double slashes introduced by blindly prepending
    for page in pages:
        content = content.replace(f'href="//{page}"', f'href="/{page}"')
        content = content.replace(f"'//{page}'", f"'/{page}'")
        content = content.replace(f'"//{page}"', f'"/{page}"')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
