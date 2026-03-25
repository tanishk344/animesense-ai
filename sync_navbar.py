import re
import os

nav_actions_correct = '''            <div class="nav-actions">
                <!-- Auth: Login Button -->
                <button class="auth-nav-login" id="authLoginBtn" onclick="FirebaseAuth.openModal('login')">
                    <i class="fas fa-user"></i>
                    <span>Login</span>
                </button>
                <!-- Auth: User Section -->
                <div class="auth-user-section" id="authUserSection">
                    <a href="/dashboard" class="auth-user-avatar" id="authUserAvatar" title="Dashboard"></a>
                    <span class="auth-user-name" id="authUserName"></span>
                    <button class="auth-logout-btn"
                        onclick="FirebaseAuth.logoutUser().then(()=>location.href='/')">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
                <a href="/chat" class="btn btn-primary btn-nav btn-glow">
                    <span>Open AI Chat</span>
                    <i class="fas fa-arrow-right"></i>
                </a>
                <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle menu">
                    <span></span><span></span><span></span>
                </button>
            </div>'''

files_to_sync = ['chat.html', 'dashboard.html', 'search.html', 'watchlist.html']

for file in files_to_sync:
    path = f'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/{file}'
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Simple regex to replace nav-actions
    # Finding <div class="nav-actions"> ... </div></div></nav>
    # Actually, simpler: replace everything between <div class="nav-actions"> and </nav> minus the closing tags.
    pattern = r'<div class="nav-actions">.*?<button class="mobile-menu-btn"[^>]*>.*?<span></span><span></span><span></span>\s*</button>\s*</div>'
    html = re.sub(pattern, nav_actions_correct, html, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

print("Synchronized nav-actions across files")
