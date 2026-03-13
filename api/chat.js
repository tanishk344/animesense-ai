export const config = {
    runtime: 'edge'
};

const PROVIDERS = {
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        keys: process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.split(',') : [],
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
        keys: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.split(',') : [],
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

const PROVIDER_ORDER = ['openrouter', 'groq'];

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

function getCurrentKey(provider) {
    const config = PROVIDERS[provider];
    if (config.keys.length === 0) return null;
    const key = config.keys[config.currentKeyIndex];
    if (config.failedKeys.has(key)) {
        return getNextKey(provider);
    }
    return key;
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
    const key = getCurrentKey(provider);
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

    try {
        const response = await fetch(config.baseUrl, {
            method: 'POST',
            headers: config.headers(key),
            body: JSON.stringify(body),
            signal: controller.signal
        });

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

        getNextKey(provider);

        return {
            content: content,
            provider: config.name,
            model: data.model || model,
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
        const body = await req.json();
        const messages = body.messages;
        const options = body.options || {};

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'messages payload required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const maxRetries = options.maxRetries || 3;
        const errors = [];

        for (const provider of PROVIDER_ORDER) {
            let retries = 0;

            while (retries < maxRetries) {
                try {
                    const result = await callProvider(provider, messages, options);

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

                    if (err.message === 'RATE_LIMITED' || err.message === 'AUTH_FAILED') {
                        continue;
                    }

                    if (options.stream) {
                        break;
                    }

                    if (err.message.startsWith('HTTP_')) {
                        rotateModel(provider);
                        continue;
                    }

                    break;
                }
            }
        }

        return new Response(JSON.stringify({ error: 'ALL_PROVIDERS_FAILED', details: errors }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
