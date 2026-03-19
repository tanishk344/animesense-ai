import re

with open('css/chat.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Make chat-main relative
css = re.sub(
    r'\.chat-main\s*\{[^}]+\}',
    r'''.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative; /* Container for absolute input wrapper */
}''',
    css
)

# Convert wrapper to absolute constrained to chat-main
css = re.sub(
    r'\.chat-input-wrapper\s*\{[^}]+\}',
    r'''.chat-input-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(to top, rgba(10, 15, 30, 1) 50%, rgba(10, 15, 30, 0) 100%);
    backdrop-filter: blur(8px);
    padding: 24px 20px 12px;
    z-index: var(--z-sticky);
}''',
    css
)

# Also strip the mobile override for wrapper left/width
css = re.sub(
    r'\.chat-input-wrapper\s*\{\s*left:\s*0\s*!important;\s*width:\s*100%\s*!important;\s*padding:\s*10px;\s*\}',
    r'''.chat-input-wrapper { padding: 10px; }''',
    css
)

with open('css/chat.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("chat.css relative absolute input wrapper fix applied!")
