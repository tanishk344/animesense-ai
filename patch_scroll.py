with open('css/chat.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add scroll-behavior smooth to .chat-messages
css = css.replace('overflow-y: auto;\n    display: flex;', 'overflow-y: auto;\n    scroll-behavior: smooth;\n    display: flex;')

with open('css/chat.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Scroll updated")
