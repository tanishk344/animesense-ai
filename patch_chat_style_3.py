import re

with open('css/chat.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update widths to 720px
css = re.sub(
    r'\.chat-messages-inner\s*\{[^}]+\}',
    r'''.chat-messages-inner {
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
}''',
    css
)

css = re.sub(
    r'\.chat-input-inner\s*\{[^}]+\}',
    r'''.chat-input-inner {
    max-width: 720px;
    width: 100%;
    position: relative;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    transition: var(--transition-base);
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
}''',
    css
)

# 2. Update background of .chat-main
css = re.sub(
    r'\.chat-main\s*\{[^}]+\}',
    r'''.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
    background: radial-gradient(circle at top, #1e1b4b, #020617);
    box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
}''',
    css
)

# 3. Update Message Styles
css = re.sub(
    r'\.message\s*\{[^}]+\}',
    r'''.message {
    display: flex;
    gap: var(--space-3);
    max-width: 70%;
    padding: 14px 18px;
    border-radius: 16px;
    margin-bottom: 20px;
    word-wrap: break-word;
    font-size: 15px;
    width: fit-content;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: fadeInMessage 0.4s ease-out forwards;
}
.message:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.2);
}''',
    css
)

css = re.sub(
    r'\.message\.user\s*\{[^}]+\}',
    r'''.message.user {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    margin-left: auto;
    border-bottom-right-radius: 4px;
}''',
    css
)

css = re.sub(
    r'\.message\.ai\s*\{[^}]+\}',
    r'''.message.ai {
    background: #111827;
    color: #e5e7eb;
    margin-right: auto;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom-left-radius: 4px;
}''',
    css
)

with open('css/chat.css', 'w', encoding='utf-8') as f:
    f.write(css)

# Update base.css for navbar specifically
with open('css/base.css', 'r', encoding='utf-8') as f:
    base = f.read()

base = re.sub(
    r'\.navbar\s*\{[^}]+\}',
    r'''.navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 60px; /* Reduced height slightly */
    z-index: var(--z-fixed);
    display: flex;
    align-items: center;
    background: rgba(6, 6, 17, 0.7);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid transparent;
    transition: var(--transition-base);
}''',
    base
)

base = re.sub(
    r'\.nav-links\s*\{[^}]+\}',
    r'''.nav-links {
    display: flex;
    gap: var(--space-4); /* Reduced spacing from space-6 to space-4 */
    align-items: center;
}''',
    base
)

with open('css/base.css', 'w', encoding='utf-8') as f:
    f.write(base)

print("Styles updated")
