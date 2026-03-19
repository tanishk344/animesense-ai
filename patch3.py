import glob

files = glob.glob('*.html') + glob.glob('js/*.js')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Specifically strip .html from absolute paths mapped earlier
    
    # Handle query parameters explicitly by stripping .html right before the ? or end of string
    pages = ['chat', 'search', 'watchlist', 'dashboard']
    
    for page in pages:
        # Match "/page.html" and "/page.html?" style variants
        content = content.replace(f'href="/{page}.html', f'href="/{page}')
        content = content.replace(f"href='/{page}.html", f"href='/{page}")
        content = content.replace(f'window.location.href="/{page}.html', f'window.location.href="/{page}')
        content = content.replace(f"window.location.href='/{page}.html", f"window.location.href='/{page}")

    # Index needs to route to root "/" instead of "/index" ideally
    content = content.replace('href="/index.html', 'href="/')
    content = content.replace("href='/index.html", "href='/")
    content = content.replace('window.location.href="/index.html', 'window.location.href="/')
    content = content.replace("window.location.href='/index.html", "window.location.href='/")

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patching complete!")
