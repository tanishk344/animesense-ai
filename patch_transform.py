with open('css/chat.css', 'r', encoding='utf-8') as f:
    css = f.read()

# exact match user request
css = css.replace('transform: translateY(-2px);', 'transform: translateY(-1px);')

with open('css/chat.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Transform corrected")
