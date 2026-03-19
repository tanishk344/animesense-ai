/* ═══════════════════════════════════════════════════════════════════
   AnimeSense AI v10 — Power Scaling Arena
   ═══════════════════════════════════════════════════════════════════
   Advanced battle analysis system. Detects fighter queries,
   fetches data from AnimeSense + Knowledge Base, generates structured
   battle breakdowns with power scaling, abilities, combat style,
   universe rules, weaknesses, and final verdict.
   ═══════════════════════════════════════════════════════════════════ */

const PowerArena = (() => {

    // ══════════ BATTLE DETECTION PATTERNS ══════════

    const BATTLE_PATTERNS = [
        /(.+?)\s+(?:vs\.?|versus)\s+(.+)/i,
        /who\s+(?:would\s+)?wins?\s+(?:between\s+)?(.+?)\s+(?:and|or|vs\.?)\s+(.+)/i,
        /(.+?)\s+(?:fights?|battles?|beats?)\s+(.+)/i,
        /can\s+(.+?)\s+(?:beat|defeat)\s+(.+)/i,
        /(.+?)\s+(?:stronger|weaker)\s+than\s+(.+)/i
    ];

    // ══════════ DETECT BATTLE QUERY ══════════

    function detectBattle(query) {
        for (const pattern of BATTLE_PATTERNS) {
            const match = query.match(pattern);
            if (match) {
                return {
                    fighter1: match[1].trim(),
                    fighter2: match[2].trim().replace(/\?$/, '')
                };
            }
        }
        return null;
    }

    // ══════════ BUILD POWER PROFILE ══════════

    function buildPowerProfile(characterName, animeData, knowledgeData) {
        const profile = {
            name: characterName,
            anime: animeData?.title || 'Unknown',
            score: animeData?.score || 'N/A',
            genres: (animeData?.genres || []).map(g => g.name),
            studio: (animeData?.studios || []).map(s => s.name).join(', ') || 'Unknown',
            powerSystem: 'Unknown',
            themes: [],
            characters: [],
            arcs: []
        };

        if (knowledgeData) {
            profile.powerSystem = knowledgeData.power_system || 'Unknown';
            profile.themes = knowledgeData.themes || [];
            profile.characters = knowledgeData.characters || [];
            profile.arcs = knowledgeData.notable_arcs || [];
        }

        return profile;
    }

    // ══════════ GENERATE BATTLE PROMPT ══════════

    function buildBattlePrompt(fighter1Profile, fighter2Profile, query) {
        return `Analyze this POWER SCALING BATTLE in extreme detail:

**${fighter1Profile.name}** (from ${fighter1Profile.anime}) vs **${fighter2Profile.name}** (from ${fighter2Profile.anime})

User asked: "${query}"

Provide a STRUCTURED battle analysis with these EXACT sections:

## ⚔️ ${fighter1Profile.name} vs ${fighter2Profile.name}

### 1. 📊 Power Scaling
Compare raw power levels, transformations, and peak feats for both fighters. Reference specific moments from the anime.

### 2. 🔥 Abilities & Techniques
List the key abilities, signature moves, and hax powers of each fighter. Be specific.

### 3. 🥊 Combat Style
Analyze fighting approach, strategy, adaptability, and battle IQ of each fighter.

### 4. 🌍 Universe Rules
Explain how each universe's power system works and how it would interact in a crossover scenario.

### 5. ⚠️ Weaknesses
Identify critical weaknesses, limitations, and exploitable flaws for each fighter.

### 6. 🏆 Final Verdict
Give a clear, definitive winner with detailed reasoning. Include win percentage estimate.

--- FIGHTER 1: ${fighter1Profile.name} ---
Anime: ${fighter1Profile.anime}
Score: ${fighter1Profile.score}/10
Genres: ${fighter1Profile.genres.join(', ')}
Power System: ${fighter1Profile.powerSystem}
Key Characters: ${fighter1Profile.characters.slice(0, 8).join(', ')}
Themes: ${fighter1Profile.themes.join(', ')}
Notable Arcs: ${fighter1Profile.arcs.join(', ')}

--- FIGHTER 2: ${fighter2Profile.name} ---
Anime: ${fighter2Profile.anime}
Score: ${fighter2Profile.score}/10
Genres: ${fighter2Profile.genres.join(', ')}
Power System: ${fighter2Profile.powerSystem}
Key Characters: ${fighter2Profile.characters.slice(0, 8).join(', ')}
Themes: ${fighter2Profile.themes.join(', ')}
Notable Arcs: ${fighter2Profile.arcs.join(', ')}

Be analytical, reference specific feats, and give a definitive winner.`;
    }

    // ══════════ FORMAT BATTLE HEADER ══════════

    function formatBattleHeader(f1Profile, f2Profile) {
        const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

        let header = `## ⚔️ Power Scaling Arena\n\n`;
        header += `### ${cap(f1Profile.name)} vs ${cap(f2Profile.name)}\n\n`;
        header += `| Stat | ${cap(f1Profile.name)} | ${cap(f2Profile.name)} |\n`;
        header += `|---|---|---|\n`;
        header += `| **Anime** | ${f1Profile.anime} | ${f2Profile.anime} |\n`;
        header += `| **MAL Score** | ⭐ ${f1Profile.score} | ⭐ ${f2Profile.score} |\n`;
        header += `| **Genres** | ${f1Profile.genres.slice(0, 3).join(', ') || '?'} | ${f2Profile.genres.slice(0, 3).join(', ') || '?'} |\n`;
        header += `| **Studio** | ${f1Profile.studio} | ${f2Profile.studio} |\n`;
        header += `| **Power System** | ${f1Profile.powerSystem.slice(0, 50)}... | ${f2Profile.powerSystem.slice(0, 50)}... |\n\n`;

        return header;
    }

    // ══════════ RUN BATTLE (Main Function) ══════════

    async function runBattle(query, entities) {
        const battleFighters = detectBattle(query);
        if (!battleFighters && (!entities || entities.battleEntities?.length < 2)) {
            return null; // Not a battle query
        }

        const f1Name = entities?.battleEntities?.[0]?.name || battleFighters?.fighter1;
        const f2Name = entities?.battleEntities?.[1]?.name || battleFighters?.fighter2;
        const f1Anime = entities?.battleEntities?.[0]?.anime || null;
        const f2Anime = entities?.battleEntities?.[1]?.anime || null;

        if (!f1Name || !f2Name) return null;

        try {
            // Fetch anime data for both fighters
            const [anime1, anime2] = await Promise.all([
                f1Anime ? EntityDetector.validateAndFetch(f1Anime, null) : EntityDetector.validateAndFetch(f1Name, null),
                f2Anime ? EntityDetector.validateAndFetch(f2Anime, null) : EntityDetector.validateAndFetch(f2Name, null)
            ]);

            // Get knowledge base data
            const kb1 = typeof AnimeKnowledge !== 'undefined'
                ? AnimeKnowledge.lookup(anime1?.title || f1Anime || f1Name)
                : null;
            const kb2 = typeof AnimeKnowledge !== 'undefined'
                ? AnimeKnowledge.lookup(anime2?.title || f2Anime || f2Name)
                : null;

            // Build power profiles
            const profile1 = buildPowerProfile(f1Name, anime1, kb1);
            const profile2 = buildPowerProfile(f2Name, anime2, kb2);

            // Format header
            let response = formatBattleHeader(profile1, profile2);

            // LLM-powered deep analysis
            try {
                const prompt = buildBattlePrompt(profile1, profile2, query);
                const messages = [
                    { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ];

                const result = await LLMRouter.chat(messages, { maxTokens: 2500, temperature: 0.7 });
                response = result.content;

                const kbTag = (kb1 || kb2) ? ' + Knowledge Base' : '';
                response += `\n\n> ⚔️ *Power Arena analysis by AnimeSense AI Analysis Engine${kbTag}*`;
            } catch (llmErr) {
                // Fallback: data-only comparison
                response += `### 📊 Quick Analysis\n\n`;
                response += `Both **${profile1.name}** and **${profile2.name}** are formidable fighters from their respective universes.\n\n`;
                if (kb1) response += `**${profile1.name}** fights using: *${profile1.powerSystem.slice(0, 150)}*\n\n`;
                if (kb2) response += `**${profile2.name}** fights using: *${profile2.powerSystem.slice(0, 150)}*\n\n`;
                response += `The outcome depends heavily on which universe's rules apply!\n\n`;
                response += `> 📊 *Battle data from AnimeSense Knowledge System*`;
            }

            // Track in memory
            if (typeof userMemory !== 'undefined') {
                if (anime1?.title) userMemory.trackInteraction(anime1.title);
                if (anime2?.title) userMemory.trackInteraction(anime2.title);
            }

            // Save battle history
            const battleRecord = {
                fighter1: f1Name,
                fighter2: f2Name,
                anime1: anime1?.title || f1Anime,
                anime2: anime2?.title || f2Anime,
                timestamp: new Date().toISOString()
            };
            saveBattleHistory(battleRecord);

            return response;
        } catch (err) {
            console.error("Failed to load data");
            return `## ⚔️ Battle Error\n\nCouldn't set up this battle. Try:\n- **"Goku vs Saitama"**\n- **"Gojo vs Sukuna"**\n- **"Naruto vs Ichigo"**`;
        }
    }

    // ══════════ BATTLE HISTORY ══════════

    function saveBattleHistory(record) {
        try {
            const history = JSON.parse(sessionStorage.getItem('as_battle_history') || '[]');
            history.unshift(record);
            sessionStorage.setItem('as_battle_history', JSON.stringify(history.slice(0, 20)));
        } catch (e) { }
    }

    function getBattleHistory() {
        try {
            return JSON.parse(sessionStorage.getItem('as_battle_history') || '[]');
        } catch (e) { return []; }
    }

    // ══════════ PUBLIC API ══════════

    return {
        detectBattle,
        runBattle,
        getBattleHistory,
        buildPowerProfile
    };

})();
