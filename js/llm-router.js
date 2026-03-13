/* AnimeSense AI — LLM Router v11 (Secure Backend Integration)
 * ============================================================
 * Routes chat requests to the secure Vercel backend.
 * API Keys and provider configurations are removed from frontend.
 */

const LLMRouter = (() => {

    const API_ENDPOINT = '/api/chat';

    // ═══════════════════════════ MAIN ROUTER ═══════════════════════════

    const promptCache = new Map();

    async function chat(messages, options = {}) {
        const cacheKey = JSON.stringify(messages) + (options.model || '') + (options.temperature || '');
        if (promptCache.has(cacheKey)) {
            console.log('[LLMRouter] Prompt cache hit');
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

            console.log(`[LLMRouter] Success via ${result.provider} (${result.model}) — ${result.tokens?.total || 0} tokens`);

            if (promptCache.size > 100) promptCache.clear();
            promptCache.set(cacheKey, result);

            return result;
        } catch (err) {
            console.error('[LLMRouter] API Chat Error:', err);
            throw err;
        }
    }

    async function streamChat(messages, onChunk, options = {}) {
        options.stream = true;

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
            console.error('[LLMRouter] Stream API Error:', err);
            throw err;
        }
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
   - MyAnimeList database (AnimeSense Data System) — live scores, episodes, rankings, aired dates
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
