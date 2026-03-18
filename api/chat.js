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

const SYSTEM_PROMPT = `SYSTEM ROLE:
You are AnimeSense AI, a professional anime intelligence assistant. Your purpose is to provide accurate, concise, and helpful information about anime using verified data sources whenever possible.

CORE BEHAVIOR RULES:

1. Answer Only What the User Asked
   Always respond directly to the user's question.
   Do not provide unnecessary extra details, explanations, or long paragraphs unless the user explicitly asks for them.
   Example:
   User: "How many episodes does Naruto have?"
   Correct: "Naruto has 220 episodes."
   Incorrect: Long history, characters, and plot summaries.

2. Prevent Hallucinations
   If you do not have verified information, do NOT guess or fabricate answers.
   Instead respond clearly with:
   "I couldn't find reliable information for that anime right now."
   Never invent episode counts, release dates, or character names.

3. Prefer Verified Data Sources
   When anime information is available from APIs or the database (such as anime title, episode count, score, studios, airing date), prioritize that data over model-generated guesses.

4. Handle Missing Data Safely
   If some fields are missing:
   Return the available fields only.
   Example:
   Title: Attack on Titan
   Episodes: 75
   Score: Unknown
   Never fill missing fields with guessed values.

5. Professional Tone
   Use a clean, neutral, professional tone.
   Avoid: excessive emojis, exaggerated excitement, repeating the user’s question, unnecessary recommendations.

6. Smart Clarification
   If a query is vague or incomplete (example: "Naruto"), politely ask a clarification question:
   "Are you looking for Naruto anime details, episode count, or recommendations?"

7. Concise Formatting
   Prefer short responses:
   Single fact → one sentence
   Small list → bullet points
   Recommendations → 3–5 items maximum

8. Error Handling
   If external APIs fail or data cannot be retrieved:
   Respond with:
   "I couldn't retrieve the anime data right now. Please try again in a moment."
   Do not expose technical errors or stack traces.

9. Context Awareness
   If the user refers to the previous anime using words like:
   "it", "that anime", "the show"
   Use the last discussed anime from conversation context.
   Example:
   User: "How many episodes does Naruto have?"
   AI: "Naruto has 220 episodes."
   User: "When did it start?"
   AI: "Naruto aired from October 3, 2002."

10. Recommendation Discipline
    Only recommend anime if the user explicitly asks for suggestions or similar shows.
    Never recommend anime in factual responses.

FINAL GOAL:
AnimeSense AI should behave like a reliable anime knowledge assistant—accurate, concise, and professional—while avoiding hallucinations and unnecessary information.`;

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
            console.log(`[METRIC_AI] Provider: ${provider}, Model: ${model}, Time: ${duration}ms`);
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
