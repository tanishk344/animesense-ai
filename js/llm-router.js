/* AnimeSense AI — LLM Router v10 with Multi-Provider Key Rotation
 * ============================================================
 * Providers: OpenRouter (primary), Groq/Grok (fallback)
 * Features: Round-robin key rotation, auto-failover, rate limit handling
 * v10: Expert system prompt + advanced context builder
 */

const LLMRouter = (() => {

    // ═══════════════════════════ PROVIDER CONFIG ═══════════════════════════

    const PROVIDERS = {
        openrouter: {
            name: 'OpenRouter',
            baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
            keys: [
                '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',
                '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',
                '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',
                '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',
                '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'
            ],
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
                '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',
                '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',
                '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',
                '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',
                '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'
            ],
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

    // Provider priority order
    const PROVIDER_ORDER = ['openrouter', 'groq'];

    // ═══════════════════════════ KEY ROTATION ═══════════════════════════

    function getNextKey(provider) {
        const config = PROVIDERS[provider];
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

        // All keys failed — reset and try again
        config.failedKeys.clear();
        config.currentKeyIndex = (config.currentKeyIndex + 1) % totalKeys;
        return config.keys[config.currentKeyIndex];
    }

    function getCurrentKey(provider) {
        const config = PROVIDERS[provider];
        const key = config.keys[config.currentKeyIndex];
        if (config.failedKeys.has(key)) {
            return getNextKey(provider);
        }
        return key;
    }

    function markKeyFailed(provider, key) {
        PROVIDERS[provider].failedKeys.add(key);
        console.warn(`[LLMRouter] Key marked failed for ${provider}: ...${key.slice(-8)}`);
    }

    function rotateModel(provider) {
        const config = PROVIDERS[provider];
        config.currentModelIndex = (config.currentModelIndex + 1) % config.models.length;
        return config.models[config.currentModelIndex];
    }

    function getCurrentModel(provider) {
        return PROVIDERS[provider].models[PROVIDERS[provider].currentModelIndex];
    }

    // ═══════════════════════════ API CALL ═══════════════════════════

    async function callProvider(provider, messages, options = {}) {
        const config = PROVIDERS[provider];
        const key = getCurrentKey(provider);
        const model = options.model || getCurrentModel(provider);

        const body = {
            model: model,
            messages: messages,
            max_tokens: options.maxTokens || 2048,
            temperature: options.temperature ?? 0.7,
            top_p: options.topP ?? 0.9,
            stream: false
        };

        // Add frequency/presence penalty for better responses
        if (provider === 'openrouter') {
            body.frequency_penalty = 0.1;
            body.presence_penalty = 0.1;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers: config.headers(key),
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.status === 429) {
                // Rate limited — rotate key
                console.warn(`[LLMRouter] Rate limited on ${provider}, rotating key`);
                markKeyFailed(provider, key);
                throw new Error('RATE_LIMITED');
            }

            if (response.status === 401 || response.status === 403) {
                // Auth failed — mark key as bad
                console.warn(`[LLMRouter] Auth failed on ${provider}, key: ...${key.slice(-8)}`);
                markKeyFailed(provider, key);
                throw new Error('AUTH_FAILED');
            }

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                console.error(`[LLMRouter] ${provider} error ${response.status}:`, errText);
                throw new Error(`HTTP_${response.status}`);
            }

            const data = await response.json();

            if (!data.choices || !data.choices[0]) {
                throw new Error('NO_CHOICES');
            }

            const content = data.choices[0].message?.content || '';
            const usage = data.usage || {};

            // Rotate key for next request (round-robin)
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
            if (err.name === 'AbortError') {
                throw new Error('TIMEOUT');
            }
            throw err;
        }
    }

    // ═══════════════════════════ MAIN ROUTER ═══════════════════════════

    async function chat(messages, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const errors = [];

        for (const provider of PROVIDER_ORDER) {
            const config = PROVIDERS[provider];
            let retries = 0;

            while (retries < maxRetries) {
                try {
                    const result = await callProvider(provider, messages, options);
                    console.log(`[LLMRouter] Success via ${result.provider} (${result.model}) — ${result.tokens.total} tokens`);
                    return result;
                } catch (err) {
                    retries++;
                    errors.push({ provider, error: err.message, retry: retries });
                    console.warn(`[LLMRouter] ${provider} attempt ${retries} failed: ${err.message}`);

                    if (err.message === 'RATE_LIMITED' || err.message === 'AUTH_FAILED') {
                        // Try next key immediately
                        continue;
                    }

                    if (err.message.startsWith('HTTP_')) {
                        // Try different model
                        rotateModel(provider);
                        continue;
                    }

                    // Timeout or other — try next provider
                    break;
                }
            }

            console.warn(`[LLMRouter] All retries exhausted for ${provider}, trying next provider`);
        }

        console.error('[LLMRouter] All providers failed:', errors);
        throw new Error('ALL_PROVIDERS_FAILED');
    }

    // ═══════════════════════════ SYSTEM PROMPT ═══════════════════════════

    const ANIME_SYSTEM_PROMPT = `You are AnimeSense AI, a professional anime expert.

You understand anime history, characters, studios, genres, story themes, and power systems.
Provide structured, insightful responses.

When possible include:
- themes
- character motivations
- story analysis
- power scaling
- cultural impact

CORE RULES:
1. You receive real anime data from THREE sources:
   - MyAnimeList database (Jikan API) — live scores, episodes, rankings, aired dates
   - AnimeSense Knowledge Base — curated knowledge including power systems, arcs, themes, endings, authorship
   - Knowledge Graph — relationships between anime, characters, studios, themes, and power systems
   ALWAYS use ALL available data sources in your responses.
2. Format responses in clean Markdown:
   - ## for the main title/heading
   - ### for sections
   - **bold** for emphasis, *italics* for titles/terms
   - Tables for structured comparisons and data
   - Numbered lists for rankings, bullet points for details
3. Be an expert anime critic — insightful, opinionated, and engaging. Not generic.
4. When analyzing themes, endings, or character motivations, provide DEEP analysis:
   - Reference specific arcs, episodes, and scenes
   - Discuss symbolism, narrative techniques, and authorial intent
   - Compare with other works when relevant
   - Explore cultural impact and legacy
5. For character battles:
   - Analyze power systems objectively
   - Reference specific feats, transformations, and abilities
   - Consider universe rules and power scaling
   - Give a definitive verdict with reasoning
   - Include win probability estimates
6. For recommendations:
   - Explain WHY each pick fits based on shared themes, tone, or style
   - Consider the user's watch history and preferred genres when available
   - Suggest diverse picks, not just the obvious choices
   - Reference the knowledge graph for thematic connections
7. Always include specific data: scores, episode counts, studios, years, ranks.
8. Never say "I'm an AI" or "As an AI" — you are AnimeSense, a dedicated anime expert.
9. End responses with a helpful follow-up suggestion using > blockquote syntax.
10. When discussing endings, DO include spoilers — the user is asking for explanation.
11. Reference the author/creator by name when knowledge is available.
12. Mention power systems when relevant to battles, comparisons, or series analysis.
13. When analyzing story arcs, discuss pacing, character development, and narrative impact.
14. For studio analysis, compare animation quality and directorial styles.
15. Provide cultural context when discussing anime themes and their Japanese origins.`;

    // ═══════════════════════════ PROMPT BUILDERS ═══════════════════════════

    function buildAnimeContext(animeData, characters = null) {
        let context = `\n[ANIME DATA FROM MYANIMELIST]\n`;
        context += `Title: ${animeData.title}\n`;
        if (animeData.title_japanese) context += `Japanese Title: ${animeData.title_japanese}\n`;
        context += `Type: ${animeData.type || 'Unknown'}\n`;
        context += `Episodes: ${animeData.episodes || 'Unknown/Ongoing'}\n`;
        context += `Status: ${animeData.status || 'Unknown'}\n`;
        context += `Aired: ${animeData.aired?.string || 'Unknown'}\n`;
        context += `Score: ${animeData.score || 'N/A'}/10 (${(animeData.scored_by || 0).toLocaleString()} users)\n`;
        context += `Rank: #${animeData.rank || 'N/A'}\n`;
        context += `Popularity: #${animeData.popularity || 'N/A'}\n`;
        context += `Rating: ${animeData.rating || 'Unknown'}\n`;
        context += `Source: ${animeData.source || 'Unknown'}\n`;

        const studios = (animeData.studios || []).map(s => s.name).join(', ');
        if (studios) context += `Studios: ${studios}\n`;

        const genres = (animeData.genres || []).map(g => g.name).join(', ');
        if (genres) context += `Genres: ${genres}\n`;

        const themes = (animeData.themes || []).map(t => t.name).join(', ');
        if (themes) context += `Themes: ${themes}\n`;

        if (animeData.synopsis) {
            context += `\nSynopsis:\n${animeData.synopsis}\n`;
        }

        if (animeData.background) {
            context += `\nBackground:\n${animeData.background}\n`;
        }

        if (characters && characters.length > 0) {
            context += `\nMain Characters:\n`;
            characters.slice(0, 10).forEach(c => {
                const va = c.voice_actors?.find(v => v.language === 'Japanese');
                context += `- ${c.character.name} (${c.role})${va ? ` — VA: ${va.person?.name}` : ''}\n`;
            });
        }

        // ═══ FEATURE 5: Inject Knowledge Base data ═══
        if (typeof AnimeKnowledge !== 'undefined') {
            const knowledge = AnimeKnowledge.lookup(animeData.title);
            if (knowledge) {
                context += AnimeKnowledge.buildKnowledgeContext(knowledge);
            }
        }

        // ═══ FEATURE 8: Inject Knowledge Graph data ═══
        if (typeof AnimeGraph !== 'undefined') {
            const graphCtx = AnimeGraph.buildGraphContext(animeData.title);
            if (graphCtx) {
                context += graphCtx;
            }
        }

        return context;
    }

    function buildTrendingContext(animeList) {
        let context = `\n[TRENDING ANIME DATA FROM MYANIMELIST]\n`;
        animeList.forEach((a, i) => {
            const studios = (a.studios || []).map(s => s.name).join(', ') || 'Unknown';
            const genres = (a.genres || []).map(g => g.name).join(', ');
            context += `${i + 1}. ${a.title} — Score: ${a.score || 'N/A'}/10 | ${a.episodes || '?'} eps | ${a.status} | Studio: ${studios} | Genres: ${genres}\n`;
        });
        return context;
    }

    function buildRecommendationsContext(recs, sourceAnime) {
        let context = `\n[RECOMMENDATIONS FOR "${sourceAnime.title}"]\n`;
        context += `Source Genres: ${(sourceAnime.genres || []).map(g => g.name).join(', ')}\n\n`;
        recs.forEach((r, i) => {
            context += `${i + 1}. ${r.entry?.title || 'Unknown'} (${r.votes || 0} votes)\n`;
        });
        return context;
    }

    /**
     * Build user profile context for personalized recommendations.
     * Combines memory, watchlist, and genre preferences.
     */
    function buildRecommendationProfile(memory, watchlist) {
        let profile = `\n[USER PROFILE]\n`;
        if (memory && memory.watched && memory.watched.length > 0) {
            profile += `Recently Searched: ${memory.watched.slice(-10).join(', ')}\n`;
        }
        if (memory && memory.liked && memory.liked.length > 0) {
            profile += `Favorites: ${memory.liked.join(', ')}\n`;
        }
        if (memory && memory.genres && memory.genres.length > 0) {
            const topGenres = [...new Set(memory.genres)].slice(0, 8);
            profile += `Preferred Genres: ${topGenres.join(', ')}\n`;
        }
        if (watchlist && watchlist.length > 0) {
            profile += `Watchlist (${watchlist.length} anime): ${watchlist.slice(-8).map(a => a.title).join(', ')}\n`;
            // Inject knowledge for watchlist entries
            if (typeof AnimeKnowledge !== 'undefined') {
                const themes = new Set();
                watchlist.forEach(a => {
                    const k = AnimeKnowledge.lookup(a.title);
                    if (k && k.themes) k.themes.forEach(t => themes.add(t));
                });
                if (themes.size > 0) {
                    profile += `Theme Preferences (from knowledge base): ${[...themes].slice(0, 10).join(', ')}\n`;
                }
            }
        }
        return profile;
    }

    // ═══════════════════════════ PUBLIC API ═══════════════════════════

    return {
        chat,
        ANIME_SYSTEM_PROMPT,
        buildAnimeContext,
        buildTrendingContext,
        buildRecommendationsContext,
        buildRecommendationProfile,
        getCurrentModel,
        getStatus() {
            const status = {};
            for (const [key, config] of Object.entries(PROVIDERS)) {
                status[key] = {
                    name: config.name,
                    currentKeyIndex: config.currentKeyIndex,
                    currentModel: config.models[config.currentModelIndex],
                    failedKeys: config.failedKeys.size,
                    totalKeys: config.keys.length,
                    activeKeys: config.keys.length - config.failedKeys.size
                };
            }
            return status;
        }
    };
})();
