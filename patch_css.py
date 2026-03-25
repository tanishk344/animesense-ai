import re

css_file = "c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/css/base.css"

with open(css_file, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace .logo-icon completely
logo_icon_new = '''
.logo-icon {
    width: 28px;
    height: 28px;
    margin-right: 8px;
    border-radius: var(--radius-sm, 4px);
    transition: transform 0.3s ease, filter 0.3s ease;
}

@media (max-width: 768px) {
    .logo-icon {
        width: 24px;
        height: 24px;
        margin-right: 6px;
    }
}
'''

# Use regex to find and replace the block
# .logo-icon { ... }
old_logo_css = re.compile(r'\.logo-icon\s*{[^}]*}', re.MULTILINE)
css = old_logo_css.sub(logo_icon_new, css)

# Appending animation and glow styles
additional_css = '''
/* --- Loading Screen --- */
.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: #060611;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    transition: opacity 0.5s ease;
}

.loading-icon {
    width: 64px;
    height: 64px;
    animation: loaderPulseGlow 2s infinite ease-in-out;
}

@keyframes loaderPulseGlow {
    0%, 100% {
        transform: scale(1);
        filter: drop-shadow(0 0 10px rgba(124, 58, 237, 0.4));
    }
    50% {
        transform: scale(1.1);
        filter: drop-shadow(0 0 25px rgba(124, 58, 237, 0.8));
    }
}

/* --- Premium Glow Hover Effect --- */
button, .btn, .logo-icon, .cta-element, .hero-actions a, .nav-action button, .auth-nav-login {
    transition: transform 0.3s ease, filter 0.3s ease;
}

button:hover, .btn:hover, .logo-icon:hover, .hero-actions a:hover, .auth-nav-login:hover {
    transform: scale(1.05);
    filter: drop-shadow(0 0 15px rgba(124, 58, 237, 0.6));
}
'''
if 'loaderPulseGlow' not in css:
    css += additional_css

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS updated.")
