export const config = {
    runtime: 'edge'
};

const PROVIDERS = {
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        keys: [
            process.env.OPENROUTER_API_KEY_1,
            process.env.OPENROUTER_API_KEY_2,
            process.env.OPENROUTER_API_KEY_3,
            process.env.OPENROUTER_API_KEY_4,
            process.env.OPENROUTER_API_KEY_5
        ].filter(Boolean),
        models: [
            'google/gemini-2.0-flash-001',
            'meta-llama/llama-3.3-70b-instruct:free',
            'deepseek/deepseek-chat-v3-0324:free',
            'google/gemini-2.0-flash-lite-001'
        ],
        currentKeyIndex: 0,
        currentModelIndex: 0,
        failedKeys: new Set(),
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://animesense.ai',
            'X-Title': 'AnimeSense AI'
        })
    },
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        keys: [
            process.env.GROQ_API_KEY_1,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3,
            process.env.GROQ_API_KEY_4,
            process.env.GROQ_API_KEY_5
        ].filter(Boolean),
        models: [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'gemma2-9b-it',
            'mixtral-8x7b-32768'
        ],
        currentKeyIndex: 0,
        currentModelIndex: 0,
        failedKeys: new Set(),
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        })
    }
};

const PROVIDER_ORDER = ['groq', 'openrouter'];

const SYSTEM_PROMPT = `You are AnimeSense AI, a highly intelligent anime expert assistant.

-----------------------------------
CORE BEHAVIOR:

1. Understand ANY type of anime-related query:
   - factual (episodes, story)
   - comparison (Naruto vs Luffy)
   - recommendation (anime like AOT)
   - opinion (best villain)
   - deep analysis (character psychology, themes)

2. Always respond:
   - professionally
   - confidently
   - clearly structured

-----------------------------------
SMART RESPONSE RULES:

1. If simple query:
→ Give direct answer + key details

2. If comparison:
→ Analyze both sides + give conclusion

3. If recommendation:
→ Give 3–5 highly relevant anime + short reason

4. If opinion:
→ Give reasoning (NOT generic answer)

5. If deep topic:
→ Break into clear points

-----------------------------------
TONE:
- Clean
- Professional
- Smart (not robotic)
- No unnecessary questions

-----------------------------------
NEVER:
- Reveal APIs or models
- Ask "Are you looking for X or Y"

-----------------------------------
OUTPUT FORMATTING (MANDATORY):
If the user prompt asks for JSON, you MUST return exactly this JSON format:
{
  "response": "Your markdown answer ignoring suggestions.",
  "suggestions": ["Dynamic suggestion 1", "Dynamic suggestion 2", "Dynamic suggestion 3"]
}
Otherwise, append dynamic suggestions as a bulleted list titled "You can also explore:".`;
function getNextKey(provider) {
    const config = PROVIDERS[provider];
    if (config.keys.length === 0) return null;
    const totalKeys = config.keys.length;
    let attempts = 0;

    while (attempts < totalKeys) {
        config.currentKeyIndex = (config.currentKeyIndex + 1) % totalKeys;
        const key = config.keys[config.currentKeyIndex];
        if (!config.failedKeys.has(key)) {
            return key;
        }
        attempts++;
    }

    config.failedKeys.clear();
    config.currentKeyIndex = (config.currentKeyIndex + 1) % totalKeys;
    return config.keys[config.currentKeyIndex];
}

function markKeyFailed(provider, key) {
    PROVIDERS[provider].failedKeys.add(key);
}

function rotateModel(provider) {
    const config = PROVIDERS[provider];
    config.currentModelIndex = (config.currentModelIndex + 1) % config.models.length;
    return config.models[config.currentModelIndex];
}

function getCurrentModel(provider) {
    return PROVIDERS[provider].models[PROVIDERS[provider].currentModelIndex];
}

async function callProvider(provider, messages, options = {}) {
    const config = PROVIDERS[provider];
    const key = getNextKey(provider);
    if (!key) throw new Error('NO_API_KEY');

    const model = options.model || getCurrentModel(provider);

    const body = {
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
        stream: options.stream || false
    };

    if (provider === 'openrouter') {
        body.frequency_penalty = 0.1;
        body.presence_penalty = 0.1;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const t0 = Date.now();
    try {
        const response = await fetch(config.baseUrl, {
            method: 'POST',
            headers: config.headers(key),
            body: JSON.stringify(body),
            signal: controller.signal
        });

        const duration = Date.now() - t0;
        if (duration > 5000) {
            console.warn(`[METRIC_SLOW_AI] Provider: ${provider}, Model: ${model}, Time: ${duration}ms`);
        } else {
        }

        clearTimeout(timeout);

        if (response.status === 429) {
            markKeyFailed(provider, key);
            throw new Error('RATE_LIMITED');
        }

        if (response.status === 401 || response.status === 403) {
            markKeyFailed(provider, key);
            throw new Error('AUTH_FAILED');
        }

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`HTTP_${response.status} - ${errText}`);
        }

        if (options.stream) {
            return {
                isStream: true,
                stream: response.body
            };
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
            throw new Error('NO_CHOICES');
        }

        const content = data.choices[0].message?.content || '';
        const usage = data.usage || {};

        return {
            content: content,
            provider: 'AnimeSense Intelligence Engine',
            model: 'AnimeSense Advanced',
            tokens: {
                prompt: usage.prompt_tokens || 0,
                completion: usage.completion_tokens || 0,
                total: usage.total_tokens || 0
            }
        };

    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('TIMEOUT');
        }
        throw err;
    }
}

export default async function handler(req) {
    // Only accept POST requests
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS, POST',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const bodyText = await req.text();
        if (bodyText.length > 50000) {
            return new Response(JSON.stringify({ error: 'Payload too large. Please shorten your request.' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
        }
        const body = JSON.parse(bodyText);
        const messages = body.messages;
        const options = body.options || {};

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'messages payload required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Apply system prompt
        let finalMessages = [...messages];
        if (finalMessages.length > 0 && finalMessages[0].role === 'system') {
            finalMessages[0].content = SYSTEM_PROMPT + '\n\nAdditional Context:\n' + finalMessages[0].content;
        } else {
            finalMessages.unshift({ role: 'system', content: SYSTEM_PROMPT });
        }

        const maxRetries = options.maxRetries || 3;
        const errors = [];

        for (const provider of PROVIDER_ORDER) {
            let retries = 0;

            while (retries < maxRetries) {
                try {
                    const result = await callProvider(provider, finalMessages, options);

                    if (options.stream && result.isStream) {
                        return new Response(result.stream, {
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive',
                                'Access-Control-Allow-Origin': '*'
                            }
                        });
                    }

                    return new Response(JSON.stringify(result), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });

                } catch (err) {
                    retries++;
                    errors.push({ provider, error: err.message, retry: retries });

                    if (err.message === 'RATE_LIMITED' || err.message === 'AUTH_FAILED' || err.message === 'TIMEOUT') {
                        continue;
                    }

                    if (err.message.startsWith('HTTP_')) {
                        console.error(`[METRIC_API_ERROR] ${provider} failed with ${err.message}`);
                        rotateModel(provider);
                        continue;
                    }

                    console.error(`[METRIC_FAIL] Provider ${provider} failed completely:`, err.message);
                    break;
                }
            }
        }

        console.error(`[METRIC_FATAL] All AI providers exhausted`);

        return new Response(JSON.stringify({ error: 'AI service is currently busy or unavailable. Please try again in a moment.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        console.error(`[API_FATAL] Unexpected error:`, err.message);
        return new Response(JSON.stringify({ error: 'Internal server error. Please try again later.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
