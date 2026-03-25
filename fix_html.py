import re

html_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/chat.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'<main class="chat-main">\s*<div class="chat-container">', '<main class="chat-main chat-container">', html)
html = re.sub(r'</div>\s*</main>', '</main>', html)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("done")
