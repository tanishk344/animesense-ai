import os
import re

chat_js_path = 'c:/Users/Lenovo/Desktop/Antigravity/AI ANIME ASSITENT/js/chat.js'

with open(chat_js_path, 'r', encoding='utf-8') as f:
    chat_js = f.read()

# 1. Inject the apiChat proxy function into chat.js, strictly matching the user's required fetch format
apiProxy = '''
// ══════════ SECURE BACKEND INTEGRATION ══════════
// Replaces old LLMRouter direct calls with Vercel Serverless Function
async function apiChat(messages, options) {
    // Compile messages down to a single string to fit backend schema
    const mainMessage = messages.map(m => m.content).join('\\n\\n--- \\n\\n');
    const memory = typeof userMemory !== 'undefined' ? userMemory.getContext() : '';
    
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: mainMessage, userMemory: memory, options })
    });
    
    if (!res.ok) {
        throw new Error("⚠️ Server error, please try again");
    }
    
    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || "⚠️ Server error, please try again");
    }
    
    // Return mock object to satisfy existing .content parsing below
    return { content: data.reply };
}
'''

# Add apiProxy to the top after imports/declarations
if "function apiChat(" not in chat_js:
    # insert before function init()
    chat_js = re.sub(r'(function init\(\) {)', apiProxy + r'\n\1', chat_js)

# 2. Search and replace all LLMRouter.chat occurrences with apiChat
chat_js = chat_js.replace('LLMRouter.chat', 'apiChat')

with open(chat_js_path, 'w', encoding='utf-8') as f:
    f.write(chat_js)

print("Migrated LLMRouter to apiChat successfully!")
