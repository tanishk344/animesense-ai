import re

with open('css/chat.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update chat-messages layout and margins
css = re.sub(
    r'\.chat-messages\s*\{[^}]+\}',
    r'''.chat-messages {
    flex: 1;
    padding: 20px;
    padding-bottom: 120px; /* Space for sticky input */
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    width: 100%;
}''',
    css
)

css = re.sub(
    r'\.chat-messages-inner\s*\{[^}]+\}',
    r'''.chat-messages-inner {
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
}''',
    css
)

# 2. Update .message
css = re.sub(
    r'\.message\s*\{[^}]+\}',
    r'''.message {
    display: flex;
    gap: var(--space-3);
    max-width: 70%;
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 16px;
    word-wrap: break-word;
    font-size: 15px;
    width: fit-content;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: fadeInMessage 0.3s ease-out forwards;
}
.message:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
@keyframes fadeInMessage {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
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
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom-left-radius: 4px;
}''',
    css
)

# Typography improvements
css = re.sub(r'font-size:\s*var\(--fs-([^\)]+)\);\s*font-weight:\s*var\(--fw-semibold\);', lambda m: m.group(0) + '\n    line-height: 1.5;', css)

# 3. Update Chat Input
css = re.sub(
    r'\.chat-input-area\s*\{[^}]+\}',
    r'''.chat-input-area {
    width: 100%;
}''',
    css
)

css = re.sub(
    r'\.chat-input-wrapper\s*\{[^}]+\}',
    r'''.chat-input-wrapper {
    position: fixed;
    bottom: 0;
    left: 260px; /* updated sidebar width */
    width: calc(100% - 260px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(10, 15, 30, 0.9);
    backdrop-filter: blur(10px);
    padding: 12px 20px;
    z-index: var(--z-sticky);
    border-top: 1px solid rgba(255,255,255,0.05);
}''',
    css
)

# Add .chat-input-inner styling
css += '''
.chat-input-inner {
    max-width: 800px;
    width: 100%;
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: var(--transition-base);
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
}
.chat-input-inner:focus-within {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15), 0 10px 25px -5px rgba(0,0,0,0.5);
}
.chat-disclaimer {
    max-width: 800px;
    width: 100%;
    text-align: center;
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    margin-top: 8px;
}
'''

css = re.sub(
    r'\.chat-input\s*\{[^}]+\}',
    r'''.chat-input {
    width: 100%;
    border-radius: 12px;
    padding: 16px;
    padding-right: 60px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 15px;
    line-height: var(--lh-normal);
    resize: none;
    max-height: 150px;
    font-family: var(--font-primary);
}''',
    css
)

# 4. Update Sidebar Desktop view
css = re.sub(
    r'@media\s*\(min-width:\s*768px\)\s*\{[^{]*\.chat-sidebar\s*\{[^}]+\}',
    r'''@media (min-width: 768px) {
    .chat-sidebar {
        position: static;
        width: 260px;
        transform: translateX(0);
        z-index: 1;
    }''',
    css
)

# 5. Mobile view Input Area Overrides
css += '''
@media (max-width: 767px) {
    .chat-input-wrapper {
        left: 0 !important;
        width: 100% !important;
        padding: 10px;
    }
    .message {
        max-width: 85%;
    }
    .chat-messages {
        padding-bottom: 120px;
    }
}
'''

with open('css/chat.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("chat CSS updated")
