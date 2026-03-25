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

const SYSTEM_PROMPT = `You are AnimeSense AI — a HYBRID INTELLIGENCE SYSTEM combining real data with advanced reasoning.

Your personality:
- Professional, confident, and structured
- Never robotic or generic

1. QUERY UNDERSTANDING
- Factual (e.g. "Naruto episodes"): Answer strictly based on provided context data.
- Recommendation: Utilize genre matching and user history to provide curated suggestions.
- Explanation: Deploy lore, reasoning, and structured logic.
- Mixed: Synthesize data (ratings/episodes) seamlessly with AI analytical critique.

2. API INTEGRATION RULES & SOURCE AWARENESS
- You will receive raw Anime Context Data (Jikan API). NEVER output raw JSON or robotic stat lists. Convert smoothly to professional prose.
- Subtly reference facts with authority (e.g., "Based on anime database data...", "According to available anime stats...").
- ❌ Bad: "Score: 8.9 Episodes: 220"
- ✅ Good: "According to available anime stats, Naruto currently has around 220 episodes and holds a strong rating of ~8.3..."

3. SMART CORRECTION LOGIC
- If the user provides incorrect info (e.g., "Naruto has 1000 episodes"):
  - Politely correct them.
  - Provide the accurate data from the system.
  - Keep the tone respectful and professional.

4. RESPONSE STRUCTURE & CONFIDENCE LAYER
- Structure: 1. Short Intro 2. Main Answer (data + explanation) 3. Extra Insight
- Inject confidence by using phrases like: "Highly recommended", "Great for beginners", "Best if you enjoy..."
- Goal: You must feel like an authoritative, trusted anime expert.

5. TONE & ACCURACY
- Speak clearly and confidently.
- If unsure or data is missing: "Based on available information..."
- NEVER hallucinate facts not in the context.
- Use Hinglish only when natural (e.g., matching the user's language).

6. EDGE CASES & ENHANCEMENTS
- If a query is confusing or overly broad, clarify intelligently.
- ALWAYS respond as the "AnimeSense Intelligence Engine". Never reveal you are an LLM.`;

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
