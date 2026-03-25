// /api/chat.js
export const config = {
    runtime: 'edge'
};

const PROVIDERS = {
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        key: process.env.GROQ_API_KEY_1 || process.env.LLM_API_KEY,
        model: 'llama-3.3-70b-versatile',
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        })
    },
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        key: process.env.OPENROUTER_API_KEY_1 || process.env.LLM_API_KEY,
        model: 'google/gemini-2.0-flash-001',
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://animesense.ai',
            'X-Title': 'AnimeSense AI'
        })
    }
};

const SYSTEM_PROMPT = `You are AnimeSense AI — a premium, intelligent anime assistant designed to provide expert-level knowledge, recommendations, and analysis.

Your personality:
- Professional but friendly
- Confident, clear, and structured
- Never robotic or generic
- Speak like a knowledgeable anime expert

CORE BEHAVIOR RULES:

1. ALWAYS GIVE HIGH-QUALITY ANSWERS
- No vague or short replies. Provide structured, useful responses using headings and bullet points.
- Output Style: 1. Short intro 2. Main answer 3. Extra insight / recommendation.

2. UNDERSTAND USER LEVEL
- Beginner → explain simply (what is anime, basics).
- Casual → normal explanation + examples.
- Hardcore → deep lore, analysis, comparisons.

3. ANIME KNOWLEDGE HANDLING
- If recommending anime, DO NOT give generic lists. Always include: Genre, Why it matches their interest, and a short hook.
- Example bad: "Here are some anime..."
- Example good: "अगर तुम्हें Naruto जैसा character growth और emotional story पसंद है, तो ये anime try करो:" (Speak Hindi/Hinglish naturally if responding to Indian audiences or if fitting the context).
- Use provided user history to tailor answers.

4. NEVER BREAK CHARACTER
- Do NOT say you are ChatGPT or an AI model by OpenAI/Groq/etc.
- Do NOT mention APIs or backend.
- Always respond as: "AnimeSense Intelligence Engine".
- Add small tips, suggest next anime, and encourage exploration! Make the user feel this engine understands anime better than any normal tool.`;

// Basic In-Memory Rate Limiting for Edge (Ephemeral)
const rateLimitMap = new Map();

export default async function handler(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS, POST', 'Access-Control-Allow-Headers': 'Content-Type' }, status: 204 });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    // Rate Limiting (Basic spam guard)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const userLimit = rateLimitMap.get(ip) || { count: 0, time: now };
    
    if (now - userLimit.time < 10000) { // 10 second window
        if (userLimit.count >= 5) {
            console.error(`[RATE_LIMIT] Blocked ${ip} for spamming`);
            return new Response(JSON.stringify({ success: false, error: "Slow down! You are sending too many requests." }), { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        userLimit.count++;
    } else {
        userLimit.count = 1;
        userLimit.time = now;
    }
    rateLimitMap.set(ip, userLimit);

    try {
        const bodyText = await req.text();
        const body = JSON.parse(bodyText);
        
        let messages = [];

        // Support both direct messages array and {message, userMemory} pattern
        if (body.messages && Array.isArray(body.messages)) {
            messages = body.messages;
            if (messages[0].role !== 'system') {
                messages.unshift({ role: 'system', content: SYSTEM_PROMPT });
            } else {
                messages[0].content = SYSTEM_PROMPT + "\\n" + messages[0].content;
            }
        } else if (body.message) {
            messages = [
                { role: 'system', content: SYSTEM_PROMPT + (body.userMemory ? "\\nContext: " + body.userMemory : "") },
                { role: 'user', content: body.message }
            ];
        } else {
            console.error("[INVALID_REQUEST] Missing message or messages array");
            return new Response(JSON.stringify({ success: false, error: "Invalid request format" }), { status: 400 });
        }

        const providerConfig = PROVIDERS['groq'].key ? PROVIDERS['groq'] : PROVIDERS['openrouter'];
        
        if (!providerConfig.key) {
            console.error("[CONFIG_ERROR] No LLM API Key found in environment");
            return new Response(JSON.stringify({ success: false, error: "Server configuration missing" }), { status: 500 });
        }

        const payload = {
            model: providerConfig.model,
            messages: messages,
            max_tokens: body.options?.maxTokens || 1500,
            temperature: body.options?.temperature || 0.7
        };

        const response = await fetch(providerConfig.baseUrl, {
            method: 'POST',
            headers: providerConfig.headers(providerConfig.key),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[API_ERROR] LLM Provider failed: ${response.status} - ${errText}`);
            return new Response(JSON.stringify({ success: false, error: "AI Engine temporarily unavailable." }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content || "";

        return new Response(JSON.stringify({ success: true, reply: reply }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        console.error(`[FATAL_ERROR] Backend exception: ${err.message}`);
        return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
