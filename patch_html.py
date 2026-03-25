import re
import glob

html_files = glob.glob('c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/*.html')

logo_html = '''<img src="/assets/icon-32.png" alt="AnimeSense Icon" class="logo-icon">'''
old_logo_regex = re.compile(r'<div class="logo-icon">\s*<i class="fas fa-bolt"></i>\s*</div>', re.MULTILINE)

loader_html = '''    <div class="loading-screen" id="loadingScreen">
        <img src="/assets/icon-192.png" alt="AnimeSense Loading" class="loading-icon">
    </div>

    <script>
        window.addEventListener('load', () => {
            const loader = document.getElementById('loadingScreen');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 500);
            }
        });
    </script>
'''

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace logo
    content = old_logo_regex.sub(logo_html, content)
    
    # Check if loader is already there
    if 'id="loadingScreen"' not in content:
        # Insert loader right after <body>
        content = content.replace('<body>', '<body>\n' + loader_html)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("HTML updated.")
