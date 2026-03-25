import os
import re

html_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/chat.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove chat-container class from main tag
html = html.replace('<main class="chat-main chat-container">', '<main class="chat-main">')

# 2. Add <div class="chat-container"> right before <div class="chat-auth-gate" 
target_str = '            <!-- Auth Gate (shown when not logged in) -->'
if target_str in html and '<div class="chat-container">' not in html:
    html = html.replace(target_str, '            <div class="chat-container">\n' + target_str)
    
    # 3. Add closing </div> right before </main>
    html = html.replace('        </main>', '            </div>\n        </main>')

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)

print("chat.html restructured cleanly")
