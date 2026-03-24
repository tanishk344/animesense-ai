/* AnimeSense AI — LLM Router v11 (Secure Backend Integration)
 * ============================================================
 * Routes chat requests to the secure Vercel backend.
 * API Keys and provider configurations are removed from frontend.
 */

const LLMRouter = (() => {

    const API_ENDPOINT = '/api/chat';

    // ═══════════════════════════ MAIN ROUTER ═══════════════════════════

    const promptCache = new Map();

    // ══════════════ USER INTELLIGENCE LAYER ══════════════
    function detectUserLevel(query) {
        if (!query) return 'casual';
        const q = query.toLowerCase();
        
        if (q.match(/power scaling|lore|manga vs anime|foreshadowing|symbolism|world building|authorial intent|canon|filler list|vs battles|baryon|gear 5|bankai|curse energy/)) {
            return 'hardcore';
        }
        if (q.match(/what is|who is|explain|what's|how to start|watch order|is it good|worth watching|should i watch/)) {
            return 'beginner';
        }
        return 'casual';
    }

    function getUserLevelInstruction(level) {
        if (level === 'beginner') {
            return "\n\n[USER INTELLIGENCE LAYER: BEGINNER]\nOutput Style: Simple + clean. Avoid complex terms.";
        } else if (level === 'hardcore') {
            return "\n\n[USER INTELLIGENCE LAYER: HARDCORE FAN]\nOutput Style: Deep + analytical + advanced terms. Include hidden details and lore references.";
        }
        return "\n\n[USER INTELLIGENCE LAYER: CASUAL FAN]\nOutput Style: Info + little insight. Balanced explanation.";
    }

    function applyIntelligenceLayer(messages) {
        const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
            const level = detectUserLevel(lastUserMsg.content);
            const instruction = getUserLevelInstruction(level);
            const sysMsg = messages.find(m => m.role === 'system');
            if (sysMsg && !sysMsg.content.includes('[USER INTELLIGENCE LAYER')) {
                sysMsg.content += instruction;
            }
        }
    }

    async function chat(messages, options = {}) {
        applyIntelligenceLayer(messages);
        const cacheKey = JSON.stringify(messages) + (options.model || '') + (options.temperature || '');
        if (promptCache.has(cacheKey)) {
            return promptCache.get(cacheKey);
        }

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, options })
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new Error(`HTTP_${response.status} - ${errText}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }


            if (promptCache.size > 100) promptCache.clear();
            promptCache.set(cacheKey, result);

            return result;
        } catch (err) {
            console.error("Failed to load data");
            throw err;
        }
    }

    async function streamChat(messages, onChunk, options = {}) {
        options.stream = true;
        applyIntelligenceLayer(messages);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, options })
            });

            if (!response.ok) {
                throw new Error(`HTTP_${response.status}`);
            }
            if (!response.body) {
                throw new Error('NO_STREAM');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulatedContent = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            const delta = data.choices && data.choices[0]?.delta?.content || '';
                            accumulatedContent += delta;
                            if (delta) onChunk(delta, accumulatedContent);
                        } catch (e) { /* ignore parse error on incomplete chunks */ }
                    }
                }
            }

            // Save to cache after streaming completes
            const cacheKey = JSON.stringify(messages) + (options.model || '') + (options.temperature || '');
            promptCache.set(cacheKey, { content: accumulatedContent, provider: 'SecureProvider', model: options.model || 'auto', tokens: { total: 0 } });

            return accumulatedContent;
        } catch (err) {
            console.error("Failed to load data");
            throw err;
        }
    }

    // ═══════════════════════════ SYSTEM PROMPT ═══════════════════════════

    const ANIME_SYSTEM_PROMPT = `You are AnimeSense AI, a professional anime expert.

CORE RULE 1: STRICT ANSWER SCOPE (CRITICAL)
- You must ONLY answer the precise question being asked.
- Do NOT add extra sections, explanations, summaries, character lists, or recommendations unless explicitly requested.
- Prioritize: 1. Accuracy 2. Clarity 3. Brevity.

CORE RULE 2: LENGTH CONTROLS
- VERY SIMPLE / FACTUAL QUESTIONS (e.g., "How many episodes does Naruto have?", "Who created Naruto?"): Return exactly 1-2 sentences. Avoid all caps headers.
- MODERATE QUESTIONS / SUMMARIES (e.g., "What is the plot of Death Note?"): Return exactly 1 short paragraph.
- ANALYSIS QUESTIONS (e.g., "Explain Naruto's chakra system", "Why is Attack on Titan popular?"): Return a structured explanation with Markdown headings ONLY if the user uses words like "explain, describe, analysis, story, plot, why, how".

CORE RULE 3: DATA & EXPERTISE
- Avoid saying "I\'m an AI" or mentioning any third-party APIs. You are AnimeSense.
- If asked an analysis question, provide deep insights, objectivity, and specific feats or references.

CORE RULE 4: PROFESSIONAL UX BEHAVIOR (CRITICAL)
- Be extremely polite, professional, and direct.
- Do NOT repeat the user's question back to them.
- Do NOT use dramatic language or unnecessary storytelling.
- Do NOT use emojis unless strictly necessary or for visual structure. Keep it clean.
- Do NOT recommend unrelated anime unless explicitly asked.`;

    // ═══════════════════════════ PROMPT BUILDERS ═══════════════════════════

    function buildAnimeContext(animeData, characters = null) {
        let context = `\n[ANIME DATA]\n`;
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

        if (typeof AnimeKnowledge !== 'undefined') {
            const knowledge = AnimeKnowledge.lookup(animeData.title);
            if (knowledge) {
                context += AnimeKnowledge.buildKnowledgeContext(knowledge);
            }
        }

        if (typeof AnimeGraph !== 'undefined') {
            const graphCtx = AnimeGraph.buildGraphContext(animeData.title);
            if (graphCtx) {
                context += graphCtx;
            }
        }

        return context;
    }

    function buildTrendingContext(animeList) {
        let context = `\n[TRENDING ANIME DATA]\n`;
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
        streamChat,
        ANIME_SYSTEM_PROMPT,
        buildAnimeContext,
        buildTrendingContext,
        buildRecommendationsContext,
        buildRecommendationProfile,
        getCurrentModel() {
            return 'auto'; // Model is now managed by the backend
        },
        getStatus() {
            return {
                mode: 'Secure Backend Integration',
                endpoint: API_ENDPOINT
            };
        }
    };
})();
