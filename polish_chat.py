import re
import os

base_css_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/css/base.css'
chat_css_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/css/chat.css'
chat_html_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/chat.html'
js_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/js/chat.js'

# 1. Update Chat CSS (Sidebar junction, background depth, animations, input focus, message styles)
with open(chat_css_file, 'r', encoding='utf-8') as f:
    chat_css = f.read()

# Sidebar junction & background match
chat_css = re.sub(r'\.chat-sidebar\s*\{[^}]*\}', '''.chat-sidebar {
    position: fixed;
    left: 0;
    top: 64px;
    bottom: 0;
    width: 260px;
    z-index: var(--z-fixed);
    background: rgba(10, 10, 25, 0.4);
    backdrop-filter: blur(12px);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    transition: var(--transition-base);
}''', chat_css, count=1)

# Chat Area Background Depth
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
    background: radial-gradient(circle at center, rgba(124, 58, 237, 0.05) 0%, rgba(2, 6, 23, 1) 100%);
    animation: layoutFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(10px);
}
.chat-main::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-image: url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"0.03\"/%3E%3C/svg%3E');
    pointer-events: none;
    z-index: 0;
}
@keyframes layoutFadeIn {
    to { opacity: 1; transform: translateY(0); }
}''', chat_css, count=1)


# Input Box Enhancements
chat_css = re.sub(r'\.chat-input-inner:focus-within\s*\{[^}]*\}', '''.chat-input-inner:focus-within {
    border-color: rgba(124, 58, 237, 0.5);
    box-shadow: 0 0 15px rgba(124, 58, 237, 0.3), 0 10px 25px -5px rgba(0,0,0,0.5);
}''', chat_css)

if '.chat-send-btn:active' not in chat_css:
    chat_css += '''
.chat-send-btn:active {
    transform: scale(0.95);
}
'''

# Messages Enhancements (already somewhat in chat.css but let's enforce right/left max-width 70%)
chat_css = re.sub(r'\.message\s*\{[^}]*\}', '''.message {
    display: flex;
    gap: var(--space-3);
    max-width: 70%;
    padding: 16px 20px;
    border-radius: 16px;
    margin-bottom: 16px;
    word-wrap: break-word;
    font-size: 15px;
    width: fit-content;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: fadeInMessage 0.4s ease-out forwards;
    z-index: 1;
}''', chat_css, count=1)

typing_anim = '''
/* Typing dots */
.typing-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
}
.typing-dot {
    width: 6px;
    height: 6px;
    background: rgba(255,255,255,0.5);
    border-radius: 50%;
    animation: typingPulse 1.4s infinite cubic-bezier(0.4, 0, 0.2, 1);
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.5); opacity: 1; background: var(--primary-light); }
}
'''
if '.typing-indicator' not in chat_css:
    chat_css += typing_anim


with open(chat_css_file, 'w', encoding='utf-8') as f:
    f.write(chat_css)


# 2. Add Global Smooth Page Transition
with open(base_css_file, 'r', encoding='utf-8') as f:
    base_css = f.read()

page_fade = '''
/* Page Fade Transition */
body {
    animation: pageFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes pageFade {
    from { opacity: 0; }
    to { opacity: 1; }
}
'''
if 'pageFade' not in base_css:
    base_css += page_fade

with open(base_css_file, 'w', encoding='utf-8') as f:
    f.write(base_css)


# 3. Add Placeholder Animation to chat.js or creating a local script
placeholder_script = '''
<script>
    // Placeholder Animation
    document.addEventListener('DOMContentLoaded', () => {
        const input = document.getElementById('chatInput');
        if(!input) return;
        
        const hints = [
            "Ask about Naruto...",
            "Find anime like Death Note...",
            "What happened in Attack on Titan season 3?",
            "Recommend me a dark fantasy anime...",
            "Who is the strongest in Jujutsu Kaisen?"
        ];
        
        let hintIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingDelay = 100;
        let erasingDelay = 50;
        let nextHintDelay = 2000;
        
        function type() {
            const currentHint = hints[hintIndex];
            
            if (isDeleting) {
                input.setAttribute('placeholder', currentHint.substring(0, charIndex - 1));
                charIndex--;
            } else {
                input.setAttribute('placeholder', currentHint.substring(0, charIndex + 1));
                charIndex++;
            }
            
            let typeSpeed = isDeleting ? erasingDelay : typingDelay;
            
            if (!isDeleting && charIndex === currentHint.length) {
                typeSpeed = nextHintDelay;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                hintIndex = (hintIndex + 1) % hints.length;
                typeSpeed = 500;
            }
            
            // Only type if input is not focused and empty
            if(document.activeElement !== input && input.value === '') {
                setTimeout(type, typeSpeed);
            } else {
                input.setAttribute('placeholder', "Type your message...");
                setTimeout(() => {
                    if(document.activeElement !== input && input.value === '') {
                        isDeleting = false;
                        charIndex = 0;
                        type();
                    }
                }, 2000);
            }
        }
        
        setTimeout(type, 1000);
        
        input.addEventListener('focus', () => {
             input.setAttribute('placeholder', "Type your message...");
        });
        input.addEventListener('blur', () => {
             if(input.value === '') {
                 isDeleting = false;
                 charIndex = 0;
                 setTimeout(type, 500);
             }
        });
    });
</script>
'''

with open(chat_html_file, 'r', encoding='utf-8') as f:
    html = f.read()

if 'Placeholder Animation' not in html:
    html = html.replace('</body>', placeholder_script + '\n</body>')
    with open(chat_html_file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Polish script executed successfully")
