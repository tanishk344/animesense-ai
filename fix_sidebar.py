import re

css_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/css/chat.css'
with open(css_file, 'r', encoding='utf-8') as f:
    css = f.read()

# Fix desktop media query for sidebar
# Removing position: static; since sidebar must be fixed as per user instruction
css = css.replace('''.chat-sidebar {
        position: static;
        width: 260px;
        transform: translateX(0);
        z-index: 1;
    }''', '''.chat-sidebar {
        position: fixed;
        width: 260px;
        transform: translateX(0);
        z-index: var(--z-fixed);
    }''')

# Fix sidebar padding
# Since I added padding: 16px to .chat-sidebar earlier, I will remove it and let inner elements handle padding, OR I will strip inner paddings. It's safer to remove from .chat-sidebar.
css = css.replace('padding: 16px;\n    gap: 12px;\n    transition: var(--transition-base);', 'transition: var(--transition-base);')

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css)

print("chat.css sidebar issues fixed")
