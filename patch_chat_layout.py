import os
import re

base_css_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/css/base.css'
chat_css_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/css/chat.css'
chat_html_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/chat.html'

# 1. Update HTML structure
with open(chat_html_file, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace <main class="chat-main chat-container"> with <main class="chat-main"><div class="chat-container">
if '<main class="chat-main chat-container">' in html:
    html = html.replace('<main class="chat-main chat-container">', '<main class="chat-main">\n            <div class="chat-container">')
    # find closing </main> and add </div>
    html = html.replace('</main>', '</div>\n        </main>')

with open(chat_html_file, 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update base.css Global Navbar
with open(base_css_file, 'r', encoding='utf-8') as f:
    base_css = f.read()

navbar_old = re.search(r'\.navbar \{[^}]*\}', base_css).group(0)
navbar_new = '''.navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 64px;
    z-index: var(--z-fixed);
    display: flex;
    align-items: center;
    background: rgba(10, 10, 25, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: var(--transition-base);
    box-sizing: border-box;
}'''
base_css = base_css.replace(navbar_old, navbar_new)

# Remove the weird mobile media query for navbar that made it float
bad_media = re.search(r'@media \(max-width: 768px\) \{\s*\.navbar \{\s*top: 8px;\s*width: calc\(100% - 16px\);\s*\}\s*\.nav-container \{\s*padding: 12px 20px;\s*\}\s*\}', base_css)
if bad_media:
    base_css = base_css.replace(bad_media.group(0), '')

with open(base_css_file, 'w', encoding='utf-8') as f:
    f.write(base_css)


# 3. Update chat.css
with open(chat_css_file, 'r', encoding='utf-8') as f:
    chat_css = f.read()

# Replace .chat-layout
chat_css = re.sub(r'\.chat-layout\s*\{[^}]*\}', '''.chat-layout {
    display: flex;
    height: 100vh;
    width: 100%;
    position: relative;
    z-index: var(--z-base);
    background: var(--bg-primary);
}''', chat_css, count=1)

# Replace .chat-sidebar
chat_css = re.sub(r'\.chat-sidebar\s*\{[^}]*\}', '''.chat-sidebar {
    position: fixed;
    left: 0;
    top: 64px;
    bottom: 0;
    width: 260px;
    z-index: var(--z-modal);
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 12px;
    transition: var(--transition-base);
}''', chat_css, count=1)

# Replace .chat-main
chat_css = re.sub(r'\.chat-main\s*\{[^}]*\}', '''.chat-main {
    margin-left: 260px;
    margin-top: 64px;
    height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
    width: calc(100% - 260px);
    padding: 24px;
    gap: 20px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    background: radial-gradient(circle at top, #1e1b4b, #020617);
}''', chat_css, count=1)

# Replace .chat-container (Center Fix)
chat_css = re.sub(r'\.chat-container\s*\{[^}]*\}', '''.chat-container {
    max-width: 900px;
    margin: 40px auto 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
}''', chat_css, count=1)

# Update Welcome Empty State Redesign
chat_css = re.sub(r'\.chat-welcome\s*\{[^}]*\}', '''.chat-welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
}''', chat_css, count=1)

chat_css = re.sub(r'\.welcome-icon\s*\{[^}]*\}', '''.welcome-icon {
    width: 72px;
    height: 72px;
    border-radius: var(--radius-xl);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-2xl);
    color: white;
    margin-bottom: var(--space-6);
    box-shadow: 0 0 25px rgba(124, 58, 237, 0.4);
}''', chat_css, count=1)

chat_css = re.sub(r'\.chat-welcome h2\s*\{[^}]*\}', '''.chat-welcome h2 {
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--text-primary);
}''', chat_css, count=1)

chat_css = re.sub(r'\.chat-welcome p\s*\{[^}]*\}', '''.chat-welcome p {
    font-size: 1rem;
    font-weight: 300;
    color: rgba(255,255,255,0.7);
    margin-bottom: 32px;
    max-width: 500px;
}''', chat_css, count=1)


# Update .chat-input-wrapper Glass effect & sticky bottom
chat_css = re.sub(r'\.chat-input-wrapper\s*\{[^}]*\}', '''.chat-input-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(15, 20, 35, 0.7);
    backdrop-filter: blur(16px);
    border-radius: 16px;
    box-shadow: 0 -4px 30px rgba(0,0,0,0.5);
    margin-top: auto;
    border: 1px solid rgba(255,255,255,0.05);
}''', chat_css, count=1)

# Remove old media queries that overlap or mess up layout
# We will just append the proper responsive query at the end
chat_css += '''
@media (max-width: 768px) {
    .chat-sidebar {
        width: 260px;
        transform: translateX(-100%);
        border-right: 1px solid var(--border);
    }
    .chat-sidebar.active {
        transform: translateX(0);
    }
    .chat-main {
        margin-left: 0;
        width: 100%;
        padding: 16px;
    }
    .chat-container {
        margin-top: 16px;
    }
    .navbar {
        height: 64px;
        position: fixed;
    }
}
'''

with open(chat_css_file, 'w', encoding='utf-8') as f:
    f.write(chat_css)

print("Chat CSS patched")
