/* ═══════════════════════════════════════════════════════════════════
   AnimeSense AI v10 — Anime Personality Test
   ═══════════════════════════════════════════════════════════════════
   Recommends anime based on user personality traits.
   Scores: adventure, psychological, romance, action, dark themes,
           comedy, fantasy, sci-fi
   Integrates with AnimeKnowledge.DATABASE for theme matching.
   ═══════════════════════════════════════════════════════════════════ */

const PersonalityTest = (() => {

    // ══════════ PERSONALITY QUESTIONS ══════════

    const QUESTIONS = [
        {
            id: 1,
            text: "It's a free weekend. What sounds most appealing?",
            options: [
                { label: "A) Exploring a new place or going on a hike", traits: { adventure: 3, action: 1 } },
                { label: "B) Reading a mystery novel or solving puzzles", traits: { psychological: 3, dark: 1 } },
                { label: "C) Watching a romantic movie with someone special", traits: { romance: 3, comedy: 1 } },
                { label: "D) Playing competitive video games or sports", traits: { action: 3, adventure: 1 } }
            ]
        },
        {
            id: 2,
            text: "Which movie genre do you gravitate toward?",
            options: [
                { label: "A) Sci-fi and futuristic worlds", traits: { scifi: 3, psychological: 1 } },
                { label: "B) Dark thrillers and horror", traits: { dark: 3, psychological: 2 } },
                { label: "C) Fantasy epics with magic and adventure", traits: { fantasy: 3, adventure: 2 } },
                { label: "D) Comedy or feel-good stories", traits: { comedy: 3, romance: 1 } }
            ]
        },
        {
            id: 3,
            text: "In a group project, you usually...",
            options: [
                { label: "A) Take charge and lead the team", traits: { action: 2, adventure: 1 } },
                { label: "B) Analyze everything and plan strategically", traits: { psychological: 3, scifi: 1 } },
                { label: "C) Keep the peace and support others", traits: { romance: 2, comedy: 1 } },
                { label: "D) Push boundaries and challenge norms", traits: { dark: 2, fantasy: 1 } }
            ]
        },
        {
            id: 4,
            text: "What kind of story ending do you prefer?",
            options: [
                { label: "A) Bittersweet — meaningful but not fully happy", traits: { psychological: 2, dark: 2 } },
                { label: "B) Triumphant — the hero wins against all odds", traits: { action: 3, adventure: 1 } },
                { label: "C) Romantic — love conquers all", traits: { romance: 3, comedy: 1 } },
                { label: "D) Ambiguous — open to interpretation", traits: { psychological: 3, scifi: 1 } }
            ]
        },
        {
            id: 5,
            text: "Which power would you want most?",
            options: [
                { label: "A) Superhuman strength and combat ability", traits: { action: 3, adventure: 1 } },
                { label: "B) Time manipulation or mind reading", traits: { psychological: 2, scifi: 2 } },
                { label: "C) Magical abilities from a fantasy world", traits: { fantasy: 3, adventure: 1 } },
                { label: "D) Immortality or dark forbidden powers", traits: { dark: 3, psychological: 1 } }
            ]
        },
        {
            id: 6,
            text: "What's your ideal companion on an adventure?",
            options: [
                { label: "A) A loyal rival who pushes you to be stronger", traits: { action: 2, adventure: 2 } },
                { label: "B) A genius strategist who always has a plan", traits: { psychological: 3, dark: 1 } },
                { label: "C) A funny friend who keeps things lighthearted", traits: { comedy: 3, romance: 1 } },
                { label: "D) A mysterious figure with hidden depth", traits: { dark: 2, fantasy: 2 } }
            ]
        },
        {
            id: 7,
            text: "Which setting excites you most?",
            options: [
                { label: "A) A vast open world full of exploration", traits: { adventure: 3, fantasy: 1 } },
                { label: "B) A futuristic dystopia with moral dilemmas", traits: { scifi: 2, dark: 2 } },
                { label: "C) A cozy town with deep character relationships", traits: { romance: 2, comedy: 2 } },
                { label: "D) A battlefield where power and strategy clash", traits: { action: 3, psychological: 1 } }
            ]
        }
    ];

    // ══════════ TRAIT → ANIME THEME MAPPING ══════════

    const TRAIT_THEME_MAP = {
        adventure: ['adventure', 'freedom', 'dreams', 'exploration', 'curiosity', 'youth', 'growth'],
        psychological: ['psychological', 'morality', 'identity', 'existentialism', 'consciousness', 'free will', 'determinism', 'cat-and-mouse', 'complexity of morality'],
        romance: ['romance', 'love', 'unrequited love', 'healing', 'understanding love', 'found family', 'innocence'],
        action: ['martial arts', 'battle', 'surpassing limits', 'rivalry', 'survival', 'competition', 'ego', 'protecting loved ones', 'heroism'],
        dark: ['dark', 'revenge', 'genocide', 'cycle of hatred', 'violence', 'suffering', 'the cost of ambition', 'corruption of power', 'monster', 'prejudice', 'loss of innocence'],
        comedy: ['comedy', 'absurd', 'humor', 'parody', 'satire', 'feel-good', 'slice of life', 'dysfunctional'],
        fantasy: ['fantasy', 'magic', 'isekai', 'supernatural', 'redemption', 'second chances', 'power fantasy'],
        scifi: ['sci-fi', 'time travel', 'cybernetics', 'dystopia', 'virtual reality', 'consciousness', 'the butterfly effect', 'what defines humanity']
    };

    // ══════════ TEST STATE ══════════

    let testState = null;

    function startTest() {
        testState = {
            currentQuestion: 0,
            scores: {
                adventure: 0,
                psychological: 0,
                romance: 0,
                action: 0,
                dark: 0,
                comedy: 0,
                fantasy: 0,
                scifi: 0
            }
        };
        return formatQuestion(0);
    }

    function answerQuestion(choiceIndex) {
        if (!testState || testState.currentQuestion >= QUESTIONS.length) return null;

        const question = QUESTIONS[testState.currentQuestion];
        const choice = question.options[choiceIndex];

        if (!choice) return null;

        // Add trait scores
        for (const [trait, score] of Object.entries(choice.traits)) {
            testState.scores[trait] = (testState.scores[trait] || 0) + score;
        }

        testState.currentQuestion++;

        // Check if test is done
        if (testState.currentQuestion >= QUESTIONS.length) {
            return getResults();
        }

        return formatQuestion(testState.currentQuestion);
    }

    function formatQuestion(index) {
        const q = QUESTIONS[index];
        const progress = `${index + 1}/${QUESTIONS.length}`;
        const progressBar = '█'.repeat(index + 1) + '░'.repeat(QUESTIONS.length - index - 1);

        let response = `## 🎭 Anime Personality Test\n\n`;
        response += `**Progress:** ${progress} ${progressBar}\n\n`;
        response += `### Question ${index + 1}\n\n`;
        response += `**${q.text}**\n\n`;
        response += q.options.map(o => o.label).join('\n') + '\n\n';
        response += `**Type A, B, C, or D to answer!**`;

        return response;
    }

    function getResults() {
        const scores = testState.scores;

        // Sort traits by score
        const sortedTraits = Object.entries(scores)
            .sort((a, b) => b[1] - a[1]);

        const topTraits = sortedTraits.slice(0, 3);
        const dominantTrait = topTraits[0][0];

        // Find matching anime from knowledge base
        const recommendations = findMatchingAnime(scores);

        // Build personality profile
        const profileNames = {
            adventure: '🗺️ The Explorer',
            psychological: '🧠 The Thinker',
            romance: '💕 The Heart',
            action: '⚔️ The Warrior',
            dark: '🌑 The Shadow',
            comedy: '😄 The Entertainer',
            fantasy: '✨ The Dreamer',
            scifi: '🔬 The Visionary'
        };

        const profileDescs = {
            adventure: "You crave exploration, freedom, and the thrill of the unknown. You love vast worlds and epic journeys.",
            psychological: "You're drawn to complex narratives, moral dilemmas, and stories that challenge the mind.",
            romance: "You appreciate deep emotional connections, heartfelt moments, and stories about love and relationships.",
            action: "You live for intense battles, rivalries, and heroes pushing past their limits.",
            dark: "You prefer mature themes, moral ambiguity, and stories that explore the darker side of humanity.",
            comedy: "You enjoy lighthearted fun, absurd humor, and stories that make you laugh out loud.",
            fantasy: "You love magical worlds, supernatural powers, and imaginative settings that transport you.",
            scifi: "You're fascinated by technology, future worlds, and stories that question what it means to be human."
        };

        let response = `## 🎭 Your Anime Personality Profile\n\n`;
        response += `### ${profileNames[dominantTrait] || '🎌 Anime Enthusiast'}\n\n`;
        response += `*${profileDescs[dominantTrait]}*\n\n`;

        // Trait scores table
        response += `### 📊 Trait Breakdown\n\n`;
        response += `| Trait | Score | Level |\n|---|---|---|\n`;
        for (const [trait, score] of sortedTraits) {
            const maxScore = QUESTIONS.length * 3;
            const pct = Math.round((score / maxScore) * 100);
            const bar = '▓'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
            response += `| **${trait.charAt(0).toUpperCase() + trait.slice(1)}** | ${bar} ${pct}% | ${score}/${maxScore} |\n`;
        }

        // Recommendations
        response += `\n### 🎯 Your Perfect Anime Matches\n\n`;
        if (recommendations.length > 0) {
            recommendations.slice(0, 5).forEach((rec, i) => {
                response += `${i + 1}. **${rec.title}** — ⭐ *${rec.matchReason}*\n`;
                response += `   - Themes: ${rec.themes.slice(0, 4).join(', ')}\n`;
                response += `   - Power System: ${rec.power_system.slice(0, 80)}...\n\n`;
            });
        } else {
            response += `Based on your profile, try: *Attack on Titan*, *Death Note*, *Steins;Gate*, *Cowboy Bebop*, *Frieren*\n\n`;
        }

        response += `> 🧠 *Personality matched against ${typeof AnimeKnowledge !== 'undefined' ? AnimeKnowledge.getCount() : 35} anime in the Knowledge Base*\n\n`;
        response += `> 💡 Say **"personality test"** to retake, or ask about any recommended anime!`;

        // Save results to memory
        const topTraitNames = topTraits.map(t => t[0]);
        sessionStorage.setItem('as_personality_traits', JSON.stringify(topTraitNames));
        sessionStorage.setItem('as_personality_recs', JSON.stringify(recommendations.slice(0, 5).map(r => r.title)));

        // Reset state
        testState = null;

        return response;
    }

    function findMatchingAnime(scores) {
        if (typeof AnimeKnowledge === 'undefined') return [];

        const results = [];

        for (const [key, data] of Object.entries(AnimeKnowledge.DATABASE)) {
            let matchScore = 0;
            let matchReasons = [];

            for (const [trait, traitScore] of Object.entries(scores)) {
                if (traitScore <= 0) continue;

                const relevantThemes = TRAIT_THEME_MAP[trait] || [];
                for (const theme of relevantThemes) {
                    for (const animeTheme of data.themes) {
                        if (animeTheme.toLowerCase().includes(theme) || theme.includes(animeTheme.toLowerCase())) {
                            matchScore += traitScore;
                            matchReasons.push(animeTheme);
                        }
                    }
                }
            }

            if (matchScore > 0) {
                results.push({
                    key,
                    title: data.title.split('(')[0].trim(),
                    matchScore,
                    matchReason: [...new Set(matchReasons)].slice(0, 3).join(', '),
                    themes: data.themes,
                    power_system: data.power_system,
                    characters: data.characters
                });
            }
        }

        return results.sort((a, b) => b.matchScore - a.matchScore);
    }

    // ══════════ PUBLIC API ══════════

    function isActive() {
        return testState !== null;
    }

    function getCurrentQuestion() {
        return testState ? testState.currentQuestion : -1;
    }

    return {
        startTest,
        answerQuestion,
        isActive,
        getCurrentQuestion,
        QUESTIONS
    };

})();
