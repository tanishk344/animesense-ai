import re
import os

files = ['c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/index.html',
         'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/chat.html',
         'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/dashboard.html',
         'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/search.html',
         'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/watchlist.html']

gtag = '''
<!-- Google tag (gtag.js) Basic Analytics Setup -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ANIME_SENSE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ANIME_SENSE');
</script>
'''

# 8. Analytics & 9. Monetization Prep (Upgrade to Pro)
nav_actions_premium = '''            <div class="nav-actions">
                <button class="upgrade-pro-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); margin-right: 8px; display: flex; align-items: center; gap: 6px;"><i class="fas fa-crown"></i> Upgrade to Pro</button>
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

for html_file in files:
    if not os.path.exists(html_file):
        continue
    with open(html_file, 'r', encoding='utf-8') as f:
        html = f.read()

    # Inject gtag if not present
    if 'Google tag' not in html:
        html = html.replace('</head>', gtag + '</head>')
    
    # Sync Premium nav-actions
    pattern = r'<div class="nav-actions">.*?<button class="mobile-menu-btn"[^>]*>.*?<span></span><span></span><span></span>\s*</button>\s*</div>'
    html = re.sub(pattern, nav_actions_premium, html, flags=re.DOTALL)
    
    # Usage limit indicator in sidebar (only for chat.html)
    if 'chat.html' in html_file and 'Chats remaining' not in html:
        usage_html = '''
            <div class="usage-limit" style="margin: auto 16px 16px 16px; padding: 12px; border-radius: 12px; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;"><span>Chats remaining</span><span>14/20</span></div>
                <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;"><div style="width: 70%; height: 100%; background: var(--primary-light);"></div></div>
                <div style="font-size: 0.65rem; color: var(--text-tertiary); text-align: right;">Resets in 2 hrs</div>
            </div>
            <div class="sidebar-footer">'''
        html = html.replace('<div class="sidebar-footer">', usage_html)

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html)


# 4. CHAT SYSTEM (Regenerate, Copy, Stop) & ERROR HANDLING
chat_js_file = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/js/chat.js'
with open(chat_js_file, 'r', encoding='utf-8') as f:
    chat_js = f.read()

# Replace simple generic error with rich UI retry error
old_error = '''        removeLoading(loadingId);
        appendMessage('ai', 'Sorry, I encountered an error. Please try again.');
        console.error("Failed to load data");'''

new_error = '''        removeLoading(loadingId);
        appendMessage('ai', `### 🚨 Connection Failed\n\nI couldn't reach the intelligence engine right now. Please check your connection or wait a moment.\n\n<button onclick="askSuggestion('${text.replace(/'/g, "\\'")}')" style="margin-top:10px; padding:8px 16px; border-radius:8px; border:none; background:var(--bg-tertiary); color:var(--text-primary); cursor:pointer; font-weight:600;"><i class="fas fa-redo"></i> Retry Message</button>`);
        console.error("API Error intercepted");'''

chat_js = chat_js.replace(old_error, new_error)


# Upgrade appendMessage with Regenerate & Copy & Stop visually
old_append = '''${role === 'ai' ? '<div class="message-actions"><button class="message-action-btn" onclick="copyMessage(this)" title="Copy"><i class="fas fa-copy"></i> Copy</button></div>' : ''}</div>`;'''

new_append = '''${role === 'ai' ? `<div class="message-actions">
<button class="message-action-btn" onclick="copyMessage(this)" title="Copy Text"><i class="fas fa-copy"></i></button>
<button class="message-action-btn" onclick="askSuggestion(lastDiscussedAnimeTitle || 'Hello')" title="Regenerate Response"><i class="fas fa-redo"></i></button>
<button class="message-action-btn" title="Bad Response"><i class="fas fa-thumbs-down"></i></button>
</div>` : ''}</div>`;'''

chat_js = chat_js.replace(old_append, new_append)

with open(chat_js_file, 'w', encoding='utf-8') as f:
    f.write(chat_js)

print("Global SaaS checklist polished successfully.")
