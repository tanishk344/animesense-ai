/* ═══════════════════════════════════════════════════════════════════
   AnimeSense AI v10 — Anime Knowledge Graph
   ═══════════════════════════════════════════════════════════════════
   Builds and queries relationships between anime, characters,
   studios, power systems, and themes. Used by the Advanced Context
   Builder and recommendation engine.
   ═══════════════════════════════════════════════════════════════════ */

const AnimeGraph = (() => {

    // ══════════ GRAPH DATA STRUCTURES ══════════

    const nodes = {
        anime: new Map(),       // key → { title, data }
        character: new Map(),   // name → { anime[], role }
        studio: new Map(),      // name → { anime[] }
        powerSystem: new Map(), // name → { anime[], description }
        theme: new Map()        // name → { anime[] }
    };

    const edges = [];  // { from, to, type, weight }

    let initialized = false;

    // ══════════ BUILD GRAPH FROM KNOWLEDGE BASE ══════════

    function buildFromKnowledgeBase() {
        if (typeof AnimeKnowledge === 'undefined') return;
        if (initialized) return;

        const db = AnimeKnowledge.DATABASE;

        for (const [key, data] of Object.entries(db)) {
            // Add anime node
            nodes.anime.set(key, {
                title: data.title,
                author: data.author,
                studio: data.studio,
                years: data.years,
                themes: data.themes,
                powerSystem: data.power_system,
                characters: data.characters,
                arcs: data.notable_arcs || [],
                related: data.related || []
            });

            // Add studio node & edges
            const studioName = data.studio.split(/[,/]/)[0].trim();
            if (!nodes.studio.has(studioName)) {
                nodes.studio.set(studioName, { anime: [] });
            }
            nodes.studio.get(studioName).anime.push(key);
            edges.push({ from: key, to: studioName, type: 'produced_by', weight: 1 });

            // Add character nodes & edges
            for (const char of data.characters) {
                const charKey = char.toLowerCase();
                if (!nodes.character.has(charKey)) {
                    nodes.character.set(charKey, { name: char, anime: [] });
                }
                nodes.character.get(charKey).anime.push(key);
                edges.push({ from: key, to: charKey, type: 'has_character', weight: 1 });
            }

            // Add theme nodes & edges
            for (const theme of data.themes) {
                const themeKey = theme.toLowerCase();
                if (!nodes.theme.has(themeKey)) {
                    nodes.theme.set(themeKey, { anime: [] });
                }
                nodes.theme.get(themeKey).anime.push(key);
                edges.push({ from: key, to: themeKey, type: 'has_theme', weight: 1 });
            }

            // Add power system node
            const psKey = key + '_power';
            nodes.powerSystem.set(psKey, {
                anime: [key],
                description: data.power_system
            });
            edges.push({ from: key, to: psKey, type: 'uses_power', weight: 1 });

            // Add related anime edges
            for (const related of (data.related || [])) {
                edges.push({ from: key, to: related, type: 'related_to', weight: 2 });
            }
        }

        initialized = true;
        console.log(`[AnimeGraph] Built graph: ${nodes.anime.size} anime, ${nodes.character.size} characters, ${nodes.studio.size} studios, ${nodes.theme.size} themes, ${edges.length} edges`);
    }

    // ══════════ QUERY FUNCTIONS ══════════

    /**
     * Get all nodes connected to an anime.
     */
    function getAnimeConnections(animeKey) {
        ensureBuilt();
        const key = animeKey.toLowerCase();
        const animeNode = nodes.anime.get(key);
        if (!animeNode) return null;

        return {
            anime: animeNode,
            characters: animeNode.characters,
            studio: animeNode.studio,
            themes: animeNode.themes,
            powerSystem: animeNode.powerSystem,
            related: (animeNode.related || [])
                .map(r => nodes.anime.get(r))
                .filter(Boolean)
                .map(a => a.title),
            arcs: animeNode.arcs
        };
    }

    /**
     * Find anime sharing the most themes with a given anime.
     */
    function findSimilarByThemes(animeKey, limit = 5) {
        ensureBuilt();
        const key = animeKey.toLowerCase();
        const source = nodes.anime.get(key);
        if (!source) return [];

        const scores = new Map();

        for (const theme of source.themes) {
            const themeNode = nodes.theme.get(theme.toLowerCase());
            if (!themeNode) continue;

            for (const otherKey of themeNode.anime) {
                if (otherKey === key) continue;
                scores.set(otherKey, (scores.get(otherKey) || 0) + 1);
            }
        }

        return [...scores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([k, score]) => ({
                key: k,
                title: nodes.anime.get(k)?.title || k,
                sharedThemes: score
            }));
    }

    /**
     * Find anime by a character name.
     */
    function findAnimeByCharacter(characterName) {
        ensureBuilt();
        const charKey = characterName.toLowerCase();

        // Exact match
        if (nodes.character.has(charKey)) {
            return nodes.character.get(charKey).anime
                .map(k => ({ key: k, title: nodes.anime.get(k)?.title || k }));
        }

        // Partial match
        const results = [];
        for (const [key, data] of nodes.character.entries()) {
            if (key.includes(charKey) || charKey.includes(key.split(' ')[0])) {
                for (const animeKey of data.anime) {
                    results.push({ key: animeKey, title: nodes.anime.get(animeKey)?.title || animeKey, character: data.name });
                }
            }
        }
        return results;
    }

    /**
     * Find all anime by a studio.
     */
    function findAnimeByStudio(studioName) {
        ensureBuilt();
        const studioKey = studioName.toLowerCase();

        for (const [name, data] of nodes.studio.entries()) {
            if (name.toLowerCase().includes(studioKey) || studioKey.includes(name.toLowerCase())) {
                return data.anime.map(k => ({
                    key: k,
                    title: nodes.anime.get(k)?.title || k
                }));
            }
        }
        return [];
    }

    /**
     * Find all anime with a specific theme.
     */
    function findAnimeByTheme(themeName) {
        ensureBuilt();
        const themeKey = themeName.toLowerCase();

        const results = [];
        for (const [key, data] of nodes.theme.entries()) {
            if (key.includes(themeKey) || themeKey.includes(key)) {
                for (const animeKey of data.anime) {
                    results.push({
                        key: animeKey,
                        title: nodes.anime.get(animeKey)?.title || animeKey,
                        theme: key
                    });
                }
            }
        }
        return results;
    }

    /**
     * Get power system comparison between two anime.
     */
    function comparePowerSystems(key1, key2) {
        ensureBuilt();
        const a1 = nodes.anime.get(key1.toLowerCase());
        const a2 = nodes.anime.get(key2.toLowerCase());

        if (!a1 || !a2) return null;

        return {
            anime1: {
                title: a1.title,
                powerSystem: a1.powerSystem,
                themes: a1.themes
            },
            anime2: {
                title: a2.title,
                powerSystem: a2.powerSystem,
                themes: a2.themes
            },
            sharedThemes: a1.themes.filter(t =>
                a2.themes.some(t2 => t.toLowerCase().includes(t2.toLowerCase()) || t2.toLowerCase().includes(t.toLowerCase()))
            )
        };
    }

    /**
     * Build a relationship chain between two anime (path finding).
     */
    function findRelationshipPath(fromKey, toKey, maxDepth = 4) {
        ensureBuilt();
        const from = fromKey.toLowerCase();
        const to = toKey.toLowerCase();

        if (!nodes.anime.has(from) || !nodes.anime.has(to)) return null;

        // BFS to find path via 'related_to' edges
        const queue = [[from]];
        const visited = new Set([from]);

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (current === to) {
                return path.map(k => ({
                    key: k,
                    title: nodes.anime.get(k)?.title || k
                }));
            }

            if (path.length >= maxDepth) continue;

            const currentNode = nodes.anime.get(current);
            if (!currentNode) continue;

            for (const related of (currentNode.related || [])) {
                if (!visited.has(related) && nodes.anime.has(related)) {
                    visited.add(related);
                    queue.push([...path, related]);
                }
            }
        }

        return null;
    }

    /**
     * Build rich context for an anime including graph relationships.
     */
    function buildGraphContext(animeKey) {
        ensureBuilt();
        const key = animeKey.toLowerCase();
        const connections = getAnimeConnections(key);
        if (!connections) return '';

        let ctx = `\n[KNOWLEDGE GRAPH CONTEXT]\n`;
        ctx += `Connected Anime: ${connections.related.join(', ') || 'None'}\n`;

        const similar = findSimilarByThemes(key, 3);
        if (similar.length > 0) {
            ctx += `Thematically Similar: ${similar.map(s => `${s.title} (${s.sharedThemes} shared themes)`).join(', ')}\n`;
        }

        const studioAnime = findAnimeByStudio(connections.studio.split(/[,/]/)[0].trim());
        if (studioAnime.length > 1) {
            ctx += `Same Studio Works: ${studioAnime.filter(a => a.key !== key).slice(0, 4).map(a => a.title).join(', ')}\n`;
        }

        return ctx;
    }

    // ══════════ GRAPH STATISTICS ══════════

    function getStats() {
        ensureBuilt();
        return {
            totalAnime: nodes.anime.size,
            totalCharacters: nodes.character.size,
            totalStudios: nodes.studio.size,
            totalThemes: nodes.theme.size,
            totalEdges: edges.length,
            topThemes: [...nodes.theme.entries()]
                .sort((a, b) => b[1].anime.length - a[1].anime.length)
                .slice(0, 10)
                .map(([k, v]) => ({ theme: k, count: v.anime.length })),
            topStudios: [...nodes.studio.entries()]
                .sort((a, b) => b[1].anime.length - a[1].anime.length)
                .slice(0, 5)
                .map(([k, v]) => ({ studio: k, count: v.anime.length }))
        };
    }

    function ensureBuilt() {
        if (!initialized) buildFromKnowledgeBase();
    }

    // ══════════ PUBLIC API ══════════

    return {
        buildFromKnowledgeBase,
        getAnimeConnections,
        findSimilarByThemes,
        findAnimeByCharacter,
        findAnimeByStudio,
        findAnimeByTheme,
        comparePowerSystems,
        findRelationshipPath,
        buildGraphContext,
        getStats
    };

})();
