/* ═══════════ AnimeSense — Entity Detection System v3 ═══════════ */
/* Preprocessing layer: extracts anime titles, characters, seasons
   from user queries BEFORE any API calls are made.
   v3: Added PERSONALITY_TEST, QUIZ_STATS, enhanced DESCRIBE_ANIME */

const EntityDetector = (() => {

    // ══════════ CHARACTER → ANIME MAPPING ══════════
    const CHARACTER_MAP = {
        // Dragon Ball
        'goku': 'Dragon Ball Z', 'vegeta': 'Dragon Ball Z', 'gohan': 'Dragon Ball Z',
        'piccolo': 'Dragon Ball Z', 'frieza': 'Dragon Ball Z', 'cell': 'Dragon Ball Z',
        'buu': 'Dragon Ball Z', 'broly': 'Dragon Ball Super: Broly', 'trunks': 'Dragon Ball Z',
        'krillin': 'Dragon Ball Z', 'beerus': 'Dragon Ball Super', 'whis': 'Dragon Ball Super',
        // One Punch Man
        'saitama': 'One Punch Man', 'genos': 'One Punch Man', 'garou': 'One Punch Man',
        'tatsumaki': 'One Punch Man', 'king': 'One Punch Man',
        // Naruto
        'naruto': 'Naruto', 'sasuke': 'Naruto Shippuuden', 'sakura': 'Naruto',
        'kakashi': 'Naruto', 'itachi': 'Naruto Shippuuden', 'madara': 'Naruto Shippuuden',
        'minato': 'Naruto Shippuuden', 'hinata': 'Naruto', 'jiraiya': 'Naruto',
        'orochimaru': 'Naruto', 'obito': 'Naruto Shippuuden', 'pain': 'Naruto Shippuuden',
        'boruto': 'Boruto: Naruto Next Generations',
        // One Piece
        'luffy': 'One Piece', 'zoro': 'One Piece', 'nami': 'One Piece',
        'sanji': 'One Piece', 'usopp': 'One Piece', 'robin': 'One Piece',
        'chopper': 'One Piece', 'franky': 'One Piece', 'brook': 'One Piece',
        'shanks': 'One Piece', 'ace': 'One Piece', 'whitebeard': 'One Piece',
        'blackbeard': 'One Piece', 'kaido': 'One Piece', 'big mom': 'One Piece',
        // Attack on Titan
        'eren': 'Attack on Titan', 'mikasa': 'Attack on Titan', 'levi': 'Attack on Titan',
        'armin': 'Attack on Titan', 'erwin': 'Attack on Titan', 'annie': 'Attack on Titan',
        'reiner': 'Attack on Titan', 'zeke': 'Attack on Titan',
        // Jujutsu Kaisen
        'gojo': 'Jujutsu Kaisen', 'itadori': 'Jujutsu Kaisen', 'yuji': 'Jujutsu Kaisen',
        'megumi': 'Jujutsu Kaisen', 'fushiguro': 'Jujutsu Kaisen', 'sukuna': 'Jujutsu Kaisen',
        'nobara': 'Jujutsu Kaisen', 'todo': 'Jujutsu Kaisen', 'geto': 'Jujutsu Kaisen',
        'toji': 'Jujutsu Kaisen',
        // Demon Slayer
        'tanjiro': 'Demon Slayer: Kimetsu no Yaiba', 'nezuko': 'Demon Slayer: Kimetsu no Yaiba',
        'zenitsu': 'Demon Slayer: Kimetsu no Yaiba', 'inosuke': 'Demon Slayer: Kimetsu no Yaiba',
        'muzan': 'Demon Slayer: Kimetsu no Yaiba', 'rengoku': 'Demon Slayer: Kimetsu no Yaiba',
        'giyu': 'Demon Slayer: Kimetsu no Yaiba',
        // Death Note
        'light': 'Death Note', 'light yagami': 'Death Note', 'l': 'Death Note',
        'ryuk': 'Death Note', 'misa': 'Death Note', 'near': 'Death Note',
        // Fullmetal Alchemist
        'edward elric': 'Fullmetal Alchemist: Brotherhood', 'alphonse': 'Fullmetal Alchemist: Brotherhood',
        'roy mustang': 'Fullmetal Alchemist: Brotherhood', 'mustang': 'Fullmetal Alchemist: Brotherhood',
        // My Hero Academia
        'deku': 'My Hero Academia', 'bakugo': 'My Hero Academia', 'todoroki': 'My Hero Academia',
        'all might': 'My Hero Academia', 'shigaraki': 'My Hero Academia',
        // Hunter x Hunter
        'gon': 'Hunter x Hunter (2011)', 'killua': 'Hunter x Hunter (2011)',
        'hisoka': 'Hunter x Hunter (2011)', 'kurapika': 'Hunter x Hunter (2011)',
        'meruem': 'Hunter x Hunter (2011)',
        // Bleach
        'ichigo': 'Bleach', 'aizen': 'Bleach', 'rukia': 'Bleach', 'byakuya': 'Bleach',
        // Code Geass
        'lelouch': 'Code Geass: Hangyaku no Lelouch',
        // Evangelion
        'shinji': 'Neon Genesis Evangelion', 'asuka': 'Neon Genesis Evangelion', 'rei': 'Neon Genesis Evangelion',
        // Chainsaw Man
        'denji': 'Chainsaw Man', 'makima': 'Chainsaw Man', 'power': 'Chainsaw Man',
        // Spy x Family
        'loid': 'Spy x Family', 'yor': 'Spy x Family', 'anya': 'Spy x Family',
        // Solo Leveling
        'sung jinwoo': 'Solo Leveling', 'jinwoo': 'Solo Leveling',
        // Steins;Gate
        'okabe': 'Steins;Gate', 'kurisu': 'Steins;Gate', 'mayuri': 'Steins;Gate',
        // Mob Psycho
        'mob': 'Mob Psycho 100', 'reigen': 'Mob Psycho 100',
        // Tokyo Ghoul
        'kaneki': 'Tokyo Ghoul',
        // Cowboy Bebop
        'spike': 'Cowboy Bebop', 'spike spiegel': 'Cowboy Bebop',
        // Re:Zero
        'subaru': 'Re:Zero kara Hajimeru Isekai Seikatsu', 'emilia': 'Re:Zero kara Hajimeru Isekai Seikatsu',
        'rem': 'Re:Zero kara Hajimeru Isekai Seikatsu',
        // Blue Lock
        'isagi': 'Blue Lock', 'bachira': 'Blue Lock',
        // Frieren
        'frieren': 'Sousou no Frieren', 'himmel': 'Sousou no Frieren', 'fern': 'Sousou no Frieren',
        // Dandadan
        'okarun': 'Dandadan', 'momo': 'Dandadan',
        // Vinland Saga
        'thorfinn': 'Vinland Saga', 'askeladd': 'Vinland Saga',
        // Berserk
        'guts': 'Berserk', 'griffith': 'Berserk', 'casca': 'Berserk'
    };

    // ══════════ KNOWN TITLE DATABASE (sorted longest first for greedy match) ══════════
    const KNOWN_TITLES = [
        'fullmetal alchemist brotherhood', 'neon genesis evangelion', 'jujutsu kaisen',
        'attack on titan', 'shingeki no kyojin', 'kimetsu no yaiba', 'demon slayer',
        'naruto shippuden', 'dragon ball super', 'dragon ball z', 'dragon ball',
        'my hero academia', 'hunter x hunter', 'sword art online', 'one punch man',
        'mob psycho 100', 'cowboy bebop', 'code geass', 'tokyo ghoul', 'black clover',
        'chainsaw man', 'spy x family', 'vinland saga', 'solo leveling', 'oshi no ko',
        'bocchi the rock', 'cyberpunk edgerunners', 'mushoku tensei',
        'the apothecary diaries', 'wind breaker', 'kaiju no 8', 'tower of god',
        'the promised neverland', 'fire force', 'violet evergarden',
        'your lie in april', 'a silent voice', 'no game no life', 'made in abyss',
        'blue lock', 'dandadan', 'dorohedoro', 'one piece', 'death note',
        'naruto', 'bleach', 'berserk', 'frieren', 'overlord', 'konosuba',
        're zero', 'evangelion', 'steins gate', 'fate zero', 'fate stay night',
        'fate series', 'fate', 'spirited away', 'your name', 'dr stone', 'gundam',
        'monogatari', 'jojo', 'boruto', 'inuyasha', 'fairy tail', 'gintama',
        'haikyuu', 'slam dunk', 'detective conan', 'pokemon', 'digimon',
        'yu gi oh', 'toradora', 'clannad', 'angel beats', 'parasyte',
        'psycho pass', 'erased', 'another', 'akame ga kill', 'noragami',
        'durarara', 'k-on', 'lucky star', 'nichijou', 'tengen toppa gurren lagann',
        'kill la kill', 'hellsing', 'claymore', 'trigun', 'samurai champloo',
        'flcl', 'serial experiments lain', 'ghost in the shell'
    ].sort((a, b) => b.length - a.length);

    // ══════════ SEASON PATTERNS ══════════
    const SEASON_PATTERNS = [
        /season\s*(\d+)/i,
        /\bs(\d+)\b/i,
        /(\d+)(?:st|nd|rd|th)\s*season/i,
        /\bpart\s*(\d+)/i,
        /\bseason\s*(one|two|three|four|five|six|seven|eight|nine|ten)/i,
        /\blatest\s*season/i,
        /\bnew\s*season/i
    ];

    const WORD_TO_NUM = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };

    // ══════════ BATTLE KEYWORDS ══════════
    const BATTLE_PATTERN = /\b(vs|versus|fight|battle|beats?|stronger|who\s+(?:would\s+)?wins?|could\s+beat|defeat)\b/i;

    // ══════════ INTENT CLASSIFICATION ══════════
    const INTENTS = {
        CHARACTER_BATTLE: /\b(vs|versus|fight|battle|beats?|stronger|who\s+(?:would\s+)?wins?|could\s+beat|defeat)\b/i,
        SEASON_QUERY: /\b(season\s*\d+|s\d+|\d+(?:st|nd|rd|th)\s*season|latest\s*season|new\s*season|part\s*\d+)\b/i,
        PERSONALITY_TEST: /\b(personality\s+test|anime\s+personality|what\s+anime\s+(?:am\s+i|suits?\s+me|should\s+i|matches?\s+me)|my\s+anime\s+personality|anime\s+for\s+my\s+personality)\b/i,
        QUIZ_STATS: /\b(quiz\s+stats?|my\s+quiz|quiz\s+score|quiz\s+record|quiz\s+results?)\b/i,
        QUIZ_MODE: /\b(quiz|trivia|test\s+m[ey]|anime\s+game|play\s+a\s+game|challenge\s+me|guess\s+the\s+anime)\b/i,
        WATCHLIST_ADD: /\b(i\s+watched|i\s+finished|add\s+.+(?:to|my)\s+(?:watch)?list|mark\s+as\s+watched|i\s+completed|i\s+saw)\b/i,
        WATCHLIST_SHOW: /\b(show\s+(?:my\s+)?(?:watch)?list|my\s+(?:watch)?list|what\s+(?:have\s+)?i\s+watched|my\s+anime)\b/i,
        DESCRIBE_ANIME: /(?:^|\s)(anime\s+(?:where|about|with|that|in which)|show\s+(?:where|about)|series\s+(?:where|about)|which\s+anime|what\s+anime|an?\s+anime\s+(?:where|about|with|that)|anime\s+(?:featuring|involving|set\s+in))/i,
        ENDING_EXPLANATION: /\b(ending|end of|finale|how.*end|last.*episode)\b/i,
        WATCH_ORDER: /\b(watch.*order|order.*watch|where.*start|how.*watch)\b/i,
        RECOMMENDATION: /\b(recommend|suggest|similar|like|anime like)\b/i,
        TRENDING: /\b(trending|popular|top anime|best anime|right now|what.*hot)\b/i,
        UPCOMING: /\b(upcoming|next season|new anime|future|announced)\b/i,
        CHARACTERS: /\b(character|protagonist|who is|main character|villain|antagonist|cast|voice actor)\b/i,
        FACTUAL: /\b(how many\s+episodes?|total\s+episodes?|episode\s+count|number of\s+episodes?|episodes?\s*$|when did.*air|release date|studio.*name|who created|who wrote|what genre|who is the main character|score|rating|how good is)\b/i,
        RELEASE: /\b(release|when.*next|when.*come|airing|schedule)\b/i,
        ANALYSIS: /\b(symbolism|theme|analysis|meaning|deep|philosophy|why did|why does|system)\b/i,
        GREETING: /\b(hello|hi |hey |greetings|good morning|what can you do|help)\b/i,
        SEARCH: /\b(search|find|look up|look for)\b/i,
        SUMMARY: /\b(explain|storyline|plot|what.*about|synopsis|summary|summarize|recap|what happens)\b/i,
        DISCOVERY: /\b(show.*info|anime details|info about|details about|tell me about)\b/i
    };

    // ══════════ QUERY NORMALIZATION ══════════
    function normalizeQuery(query) {
        let q = query.toLowerCase().replace(/[?!.'"]/g, '').replace(/\s+/g, ' ').trim();

        // 1. Map common abbreviations
        q = q.replace(/\banime\s+eps\b/g, 'anime episodes');
        q = q.replace(/\beps\b/g, 'episodes');
        q = q.replace(/\bep\b/g, 'episode');

        // 2. Normalize sentence structures
        if (!q.startsWith('how many ') && !q.startsWith('what ') && !q.startsWith('which ')) {
            q = q.replace(/^(.+?)\s+episodes?$/g, 'how many episodes does $1 have');
        }
        q = q.replace(/^episodes?\s+of\s+(.+)$/g, 'how many episodes does $1 have');

        return q;
    }

    // ══════════ CORE: DETECT ENTITIES ══════════
    function detect(query) {
        const q = normalizeQuery(query);

        console.log(`[NORMALIZE] original_query: "${query}"`);
        console.log(`[NORMALIZE] normalized_query: "${q}"`);

        const result = {
            intent: null,
            confidence: 0,
            animeTitles: [],
            characters: [],
            characterAnime: [],
            season: null,
            seasonIsLatest: false,
            isBattle: false,
            battleEntities: [],    // [{name, anime, type:'character'|'anime'}]
            rawQuery: query,
            cleanedQuery: q
        };

        // 1. Detect intent and confidence
        const classification = classifyIntent(q);
        result.intent = classification.name;
        result.confidence = classification.score;

        // 2. Detect battle mode (overrides compare)
        if (BATTLE_PATTERN.test(q)) {
            result.isBattle = true;
            result.intent = 'CHARACTER_BATTLE';
            result.battleEntities = extractBattleEntities(q);
        }

        // 3. Detect season
        const seasonInfo = detectSeason(q);
        if (seasonInfo) {
            result.season = seasonInfo.number;
            result.seasonIsLatest = seasonInfo.isLatest;
            if (result.intent !== 'CHARACTER_BATTLE') {
                result.intent = 'SEASON_QUERY';
            }
        }

        // 4. Detect characters via mapping
        const charResults = detectCharacters(q);
        result.characters = charResults.characters;
        result.characterAnime = charResults.anime;

        // 5. Detect anime titles
        result.animeTitles = detectAnimeTitles(q);

        // If character mapping found anime but title detection didn't, add those
        if (result.animeTitles.length === 0 && result.characterAnime.length > 0) {
            result.animeTitles = result.characterAnime;
        }

        return result;
    }

    // ══════════ INTENT CLASSIFIER ══════════
    function classifyIntent(q) {
        // High confidence direct matches
        if (INTENTS.PERSONALITY_TEST.test(q)) return { name: 'PERSONALITY_TEST', score: 0.99 };
        if (INTENTS.QUIZ_STATS.test(q)) return { name: 'QUIZ_STATS', score: 0.99 };
        if (INTENTS.QUIZ_MODE.test(q)) return { name: 'QUIZ_MODE', score: 0.95 };
        if (INTENTS.WATCHLIST_ADD.test(q)) return { name: 'WATCHLIST_ADD', score: 0.95 };
        if (INTENTS.WATCHLIST_SHOW.test(q)) return { name: 'WATCHLIST_SHOW', score: 0.95 };

        if (INTENTS.DESCRIBE_ANIME.test(q)) return { name: 'DESCRIBE_ANIME', score: 0.90 };
        if (/i\s+(saw|remember|forgot).+anime/i.test(q)) return { name: 'DESCRIBE_ANIME', score: 0.90 };
        if (INTENTS.CHARACTER_BATTLE.test(q)) return { name: 'CHARACTER_BATTLE', score: 0.95 };
        if (INTENTS.SEASON_QUERY.test(q)) return { name: 'SEASON_QUERY', score: 0.85 };

        // Standard intents - calculate confidence based on input length / specificity if needed, but static is fine
        if (INTENTS.ENDING_EXPLANATION.test(q)) return { name: 'ENDING_EXPLANATION', score: 0.92 };
        if (INTENTS.FACTUAL.test(q)) return { name: 'FACTUAL', score: 0.95 };
        if (INTENTS.RELEASE.test(q)) return { name: 'RELEASE', score: 0.88 };
        if (INTENTS.WATCH_ORDER.test(q)) return { name: 'WATCH_ORDER', score: 0.90 };
        if (INTENTS.RECOMMENDATION.test(q)) return { name: 'RECOMMENDATION', score: 0.85 };
        if (INTENTS.CHARACTERS.test(q)) return { name: 'CHARACTERS', score: 0.85 };
        if (INTENTS.ANALYSIS.test(q)) return { name: 'ANALYSIS', score: 0.98 }; // "explain chakra" is very explicit
        if (INTENTS.TRENDING.test(q)) return { name: 'TRENDING', score: 0.90 };
        if (INTENTS.UPCOMING.test(q)) return { name: 'UPCOMING', score: 0.90 };
        if (INTENTS.GREETING.test(q)) return { name: 'GREETING', score: 0.90 };
        if (INTENTS.SEARCH.test(q)) return { name: 'SEARCH', score: 0.80 };
        if (INTENTS.SUMMARY.test(q)) return { name: 'SUMMARY', score: 0.85 };
        if (INTENTS.DISCOVERY.test(q)) return { name: 'DISCOVERY', score: 0.80 };

        // Very short queries defaulting to DISCOVERY might be low confidence
        if (q.split(' ').length <= 3) {
            return { name: 'DISCOVERY', score: 0.40 }; // Low confidence
        }

        return { name: 'ANIME_INFO', score: 0.30 }; // Fallback
    }

    // ══════════ SEASON DETECTION ══════════
    function detectSeason(q) {
        // "latest season" / "new season"
        if (/\b(latest|newest|current|new)\s*season\b/i.test(q)) {
            return { number: null, isLatest: true };
        }
        // "season X", "SX", "Xth season", "part X"
        for (const pat of SEASON_PATTERNS) {
            const m = q.match(pat);
            if (m && m[1]) {
                const num = WORD_TO_NUM[m[1].toLowerCase()] || parseInt(m[1]);
                if (num && num > 0) return { number: num, isLatest: false };
            }
        }
        return null;
    }

    // ══════════ CHARACTER DETECTION ══════════
    function detectCharacters(q) {
        const found = [];
        const anime = [];
        const words = q.split(/\s+/);

        // Try multi-word matches first ("light yagami", "edward elric", etc.)
        const sortedChars = Object.keys(CHARACTER_MAP).sort((a, b) => b.length - a.length);
        const used = new Set();

        for (const charName of sortedChars) {
            if (q.includes(charName) && !used.has(charName)) {
                found.push(charName);
                const animeTitle = CHARACTER_MAP[charName];
                if (!anime.includes(animeTitle)) anime.push(animeTitle);
                used.add(charName);
                // Mark individual words as used to avoid double-matching
                charName.split(' ').forEach(w => used.add(w));
            }
        }

        return { characters: found, anime };
    }

    // ══════════ ANIME TITLE DETECTION ══════════
    function detectAnimeTitles(q) {
        const titles = [];

        // Strip season info from query for cleaner title matching
        let cleaned = q
            .replace(/\b(season\s*\d+|s\d+|\d+(?:st|nd|rd|th)\s*season|latest\s*season|new\s*season|part\s*\d+)\b/gi, '')
            .replace(/\b(vs|versus|fight|battle|compare|who\s+wins)\b/gi, '')
            .trim();

        // First try exact matches against known title database
        for (const title of KNOWN_TITLES) {
            if (cleaned.includes(title) && !titles.includes(title)) {
                titles.push(title);
                // Remove it from cleaned to prevent sub-matches
                cleaned = cleaned.replace(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
            }
        }

        // If no known title found, try extracting by stripping common phrases
        if (titles.length === 0) {
            const extracted = extractByStripping(q);
            if (extracted && extracted.length >= 2) titles.push(extracted);
        }

        return titles;
    }

    // ══════════ STRIP-BASED EXTRACTION (fallback) ══════════
    function extractByStripping(q) {
        let cleaned = q.toLowerCase().replace(/[?!.'"]/g, '');

        const stripPatterns = [
            /^(how many episodes? (?:does|do|of|in)|explain the ending of|explain|tell me about|details? about|info about)\s+/,
            /^(when (?:will|does|is)\s+(?:the\s+)?(?:next episode of|next season of))\s+/,
            /^(recommend anime (?:similar to|like))\s+/,
            /^(what is the watch order (?:for|of))\s+/,
            /^(who (?:are )?the characters? (?:of|in|from)|characters? (?:of|in|from))\s+/,
            /^(what happens in|what is (?:the )?(?:plot|synopsis) of|summarize|search (?:for)?|find)\s+/,
            /^(compare|analyze (?:the )?themes? (?:of|in))\s+/,
            /\b(season\s*\d+|s\d+|\d+(?:st|nd|rd|th)\s*season|latest\s*season)\b/g,
            /\s+(ending|episodes?|release|watch order|characters?)$/,
            /\s+have\s*$/, /\s+anime$/
        ];

        for (const p of stripPatterns) cleaned = cleaned.replace(p, '');
        cleaned = cleaned
            .replace(/\b(the|a|an|of|in|for|and|is|are|was|were|do|does|did|will|would|can|could|should|about|with|from|me|it|its|this|that|what)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned.length >= 2 ? cleaned : null;
    }

    // ══════════ BATTLE ENTITY EXTRACTION ══════════
    function extractBattleEntities(q) {
        const entities = [];
        // Split on battle keywords
        const parts = q.split(/\b(?:vs|versus|fight|battle|beats?|against|or)\b/i).map(s => s.trim()).filter(s => s.length >= 2);

        for (let part of parts) {
            // Clean the part
            part = part.replace(/\b(who|would|win|could|beat|is|stronger|more|powerful|in|a)\b/gi, '').trim();
            if (part.length < 2) continue;

            // Check character map first
            const charMatch = Object.keys(CHARACTER_MAP)
                .sort((a, b) => b.length - a.length)
                .find(c => part.includes(c));

            if (charMatch) {
                entities.push({
                    name: charMatch,
                    anime: CHARACTER_MAP[charMatch],
                    type: 'character'
                });
            } else {
                // Could be an anime title
                const titleMatch = KNOWN_TITLES.find(t => part.includes(t));
                entities.push({
                    name: titleMatch || part.replace(/\s+/g, ' ').trim(),
                    anime: titleMatch || part.replace(/\s+/g, ' ').trim(),
                    type: titleMatch ? 'anime' : 'unknown'
                });
            }
        }
        return entities;
    }

    // ══════════ VALIDATION: VERIFY SEARCH RESULT ══════════
    async function validateAndFetch(searchTerm, expectedTitle) {
        try {
            const result = await AnimeAPI.searchAnime(searchTerm, 1, 5);
            if (!result.data || result.data.length === 0) return null;

            // Strategy 1: Pick by highest popularity (lowest popularity number = most popular)
            const sorted = [...result.data].sort((a, b) => (a.popularity || 99999) - (b.popularity || 99999));
            let best = sorted[0];

            // Strategy 2: If we have an expected title, check if any result is a better match
            if (expectedTitle) {
                const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const expected = norm(expectedTitle);
                const exactMatch = result.data.find(a =>
                    norm(a.title) === expected ||
                    norm(a.title_english || '') === expected ||
                    (a.title_synonyms || []).some(s => norm(s) === expected)
                );
                if (exactMatch) best = exactMatch;
            }

            // Strategy 3: Validate result title contains at least one keyword from search term
            const keywords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
            const titleWords = (best.title + ' ' + (best.title_english || '')).toLowerCase();
            const hasMatch = keywords.length === 0 || keywords.some(kw => titleWords.includes(kw));

            if (!hasMatch && result.data.length > 1) {
                // Try next results
                for (const alt of result.data.slice(1)) {
                    const altTitle = (alt.title + ' ' + (alt.title_english || '')).toLowerCase();
                    if (keywords.some(kw => altTitle.includes(kw))) {
                        best = alt;
                        break;
                    }
                }
            }

            return best;
        } catch (e) {
            console.error('[EntityDetector] Validation fetch failed:', e);
            return null;
        }
    }

    // ══════════ SEASON RESOLVER ══════════
    async function resolveSeasonedAnime(baseTitle, seasonNum, isLatest) {
        try {
            // Search with season appended
            const queries = isLatest
                ? [baseTitle]
                : [`${baseTitle} season ${seasonNum}`, `${baseTitle} ${seasonNum}`, `${baseTitle} part ${seasonNum}`];

            for (const query of queries) {
                const result = await AnimeAPI.searchAnime(query, 1, 10);
                if (!result.data || result.data.length === 0) continue;

                if (isLatest) {
                    // Find the latest (most recent) entry
                    const sorted = [...result.data]
                        .filter(a => a.title.toLowerCase().includes(baseTitle.split(' ')[0].toLowerCase()))
                        .sort((a, b) => (b.year || 0) - (a.year || 0));

                    if (sorted.length > 0) {
                        return { anime: sorted[0], found: true };
                    }
                } else {
                    // Try to match season number
                    const seasonMatch = result.data.find(a => {
                        const t = (a.title + ' ' + (a.title_english || '')).toLowerCase();
                        return (
                            t.includes(`season ${seasonNum}`) ||
                            t.includes(`${seasonNum}nd season`) ||
                            t.includes(`${seasonNum}rd season`) ||
                            t.includes(`${seasonNum}th season`) ||
                            t.includes(`part ${seasonNum}`) ||
                            t.includes(` ${toRoman(seasonNum)}`) ||
                            t.includes(` ${seasonNum} `)
                        );
                    });
                    if (seasonMatch) return { anime: seasonMatch, found: true };

                    // Check if any result from the series exists at all
                    const seriesMatch = result.data.find(a =>
                        a.title.toLowerCase().includes(baseTitle.split(' ')[0].toLowerCase())
                    );
                    if (seriesMatch && !seasonMatch) {
                        return { anime: seriesMatch, found: false, message: `Season ${seasonNum} has not been officially announced yet.` };
                    }
                }
            }

            // Fallback: search base title and return latest available
            const base = await AnimeAPI.searchAnime(baseTitle, 1, 5);
            if (base.data && base.data.length > 0) {
                return { anime: base.data[0], found: false, message: `Season ${seasonNum || 'requested'} has not been officially announced yet.` };
            }
        } catch (e) {
            console.error('[EntityDetector] Season resolution failed:', e);
        }
        return null;
    }

    function toRoman(num) {
        const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
        let r = '';
        for (const [v, s] of map) { while (num >= v) { r += s; num -= v; } }
        return r.toLowerCase();
    }

    // ══════════ PUBLIC API ══════════
    return {
        detect,
        validateAndFetch,
        resolveSeasonedAnime,
        CHARACTER_MAP,
        KNOWN_TITLES,
        classifyIntent,
        detectSeason,
        extractBattleEntities
    };

})();
