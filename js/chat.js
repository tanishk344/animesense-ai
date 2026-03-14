/* AnimeSense AI — Chat Engine v10 (Knowledge Graph + Power Arena + Personality Test + Enhanced Quiz) */

let currentChatId = null, currentMode = 'general', isProcessing = false;
let quizState = null; // Legacy quiz tracking (v8 compat)

// ══════════ AI CHAT MEMORY INTERCEPTOR (v12) ══════════
const _originalLLMChat = typeof LLMRouter !== 'undefined' ? LLMRouter.chat : null;
if (_originalLLMChat) {
    LLMRouter.chat = async function (messages, options) {
        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
            try {
                const hist = await FirebaseDB.getChatHistory(5);
                if (hist && hist.length > 0) {
                    let hCtx = "--- LAST 5 CHAT INTERACTIONS ---\n" + hist.map(h => `User: ${h.message}\nAI: ${h.response}`).join('\n\n') + "\n--- END PAST INTERACTIONS ---\n";
                    const newMessages = [...messages];
                    if (newMessages.length > 0 && newMessages[0].role === 'system') {
                        newMessages.splice(1, 0, { role: 'system', content: hCtx });
                    } else {
                        newMessages.unshift({ role: 'system', content: hCtx });
                    }
                    return await _originalLLMChat.call(LLMRouter, newMessages, options);
                }
            } catch (e) { }
        }
        return await _originalLLMChat.call(LLMRouter, messages, options);
    };
}

// ══════════ USER MEMORY SYSTEM (v10 Expanded) ══════════
const userMemory = {
    watched: JSON.parse(sessionStorage.getItem('as_watched') || '[]'),
    liked: JSON.parse(sessionStorage.getItem('as_liked') || '[]'),
    genres: JSON.parse(sessionStorage.getItem('as_genres') || '[]'),
    searchedAnime: JSON.parse(sessionStorage.getItem('as_searched_anime') || '[]'),
    favoriteGenres: JSON.parse(sessionStorage.getItem('as_favorite_genres') || '[]'),
    battleHistory: JSON.parse(sessionStorage.getItem('as_battle_history') || '[]'),
    interactions: {},

    addWatched(title) {
        if (title && !this.watched.includes(title)) {
            this.watched.push(title);
            sessionStorage.setItem('as_watched', JSON.stringify(this.watched));
        }
    },
    addLiked(title) {
        if (title && !this.liked.includes(title)) {
            this.liked.push(title);
            sessionStorage.setItem('as_liked', JSON.stringify(this.liked));
        }
    },
    addGenres(genres) {
        if (!genres) return;
        const arr = Array.isArray(genres) ? genres : [genres];
        arr.forEach(g => {
            if (g && !this.genres.includes(g)) this.genres.push(g);
            if (g && !this.favoriteGenres.includes(g)) {
                this.favoriteGenres.push(g);
                sessionStorage.setItem('as_favorite_genres', JSON.stringify(this.favoriteGenres));
            }
        });
        sessionStorage.setItem('as_genres', JSON.stringify(this.genres));
    },
    trackInteraction(title) {
        if (!title) return;
        this.interactions[title] = (this.interactions[title] || 0) + 1;
        if (this.interactions[title] >= 2) this.addLiked(title);
        this.addWatched(title);
        // Track in searchedAnime
        if (!this.searchedAnime.includes(title)) {
            this.searchedAnime.push(title);
            sessionStorage.setItem('as_searched_anime', JSON.stringify(this.searchedAnime));
        }
        // Sync to Firestore (fire-and-forget)
        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
            FirebaseDB.trackSearchedAnime(title).catch(() => { });
        }
    },
    addBattle(fighter1, fighter2) {
        this.battleHistory.push({ fighter1, fighter2, time: new Date().toISOString() });
        sessionStorage.setItem('as_battle_history', JSON.stringify(this.battleHistory.slice(-20)));
    },
    getTopGenres(n = 5) { return [...new Set(this.genres)].slice(0, n); },
    getContext() {
        let ctx = '';
        if (this.watched.length) ctx += `\nPreviously searched anime: ${this.watched.slice(-10).join(', ')}`;
        if (this.liked.length) ctx += `\nLiked/frequently asked: ${this.liked.join(', ')}`;
        if (this.genres.length) ctx += `\nPreferred genres: ${this.getTopGenres().join(', ')}`;
        if (this.battleHistory.length) ctx += `\nRecent battles: ${this.battleHistory.slice(-3).map(b => `${b.fighter1} vs ${b.fighter2}`).join(', ')}`;
        return ctx;
    }
};

// ══════════ WATCHLIST SYSTEM ══════════
const Watchlist = {
    _key: 'as_watchlist',
    getAll() {
        return JSON.parse(sessionStorage.getItem(this._key) || '[]');
    },
    add(anime) {
        const list = this.getAll();
        if (list.some(a => a.mal_id === anime.mal_id)) return false;
        list.push({
            mal_id: anime.mal_id,
            title: anime.title,
            score: anime.score,
            episodes: anime.episodes,
            genres: (anime.genres || []).map(g => g.name),
            image: anime.images?.jpg?.image_url || '',
            type: anime.type || 'TV',
            status: anime.status || 'Unknown'
        });
        sessionStorage.setItem(this._key, JSON.stringify(list));
        // Sync to Firestore (fire-and-forget)
        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
            FirebaseDB.addToWatchlist(anime).catch(() => { });
        }
        return true;
    },
    remove(malId) {
        const list = this.getAll().filter(a => a.mal_id !== malId);
        sessionStorage.setItem(this._key, JSON.stringify(list));
    },
    has(title) {
        return this.getAll().some(a => a.title.toLowerCase() === title.toLowerCase());
    }
};

// ══════════ WATCH ORDER DATABASE ══════════
const WATCH_ORDERS = {
    'fate': `## Fate Series — Watch Order\n\n**Recommended (Ufotable route):**\n1. **Fate/Zero** (25 eps) — 2011\n2. **Fate/stay night: Unlimited Blade Works** (26 eps) — 2014\n3. **Fate/stay night: Heaven's Feel** (3 movies) — 2017-2020\n\n**Alternative (VN purist):**\n1. **Fate/stay night** (2006, Studio DEEN)\n2. **Fate/stay night: UBW** (2014)\n3. **Fate/stay night: Heaven's Feel**\n4. **Fate/Zero**\n\n**Spinoffs (after core):**\n- Fate/Apocrypha\n- Fate/Grand Order: Babylonia\n- Fate/Extra: Last Encore\n- Lord El-Melloi II`,
    'monogatari': `## Monogatari Series — Watch Order\n\n**Novel/Airing Order (recommended):**\n1. **Bakemonogatari** (15 eps) — 2009\n2. **Kizumonogatari** (3 movies) — 2016-2017\n3. **Nisemonogatari** (11 eps) — 2012\n4. **Nekomonogatari: Kuro** (4 eps) — 2012\n5. **Monogatari Series: Second Season** (26 eps) — 2013\n6. **Hanamonogatari** (5 eps) — 2014\n7. **Tsukimonogatari** (4 eps) — 2014\n8. **Owarimonogatari** (12 eps) — 2015\n9. **Koyomimonogatari** (12 eps) — 2016\n10. **Owarimonogatari S2** (7 eps) — 2017\n11. **Zoku Owarimonogatari** (6 eps) — 2018\n12. **Off Season / Monster Season** — 2024+`,
    'attack on titan': `## Attack on Titan — Watch Order\n\n1. **Season 1** (25 eps) — 2013\n2. **Season 2** (12 eps) — 2017\n3. **Season 3 Part 1** (12 eps) — 2018\n4. **Season 3 Part 2** (10 eps) — 2019\n5. **The Final Season Part 1** (16 eps) — 2020\n6. **The Final Season Part 2** (12 eps) — 2022\n7. **The Final Season Part 3** (2 parts) — 2023\n\n**Total: 89 episodes**. Watch in order — no skipping!`,
    'naruto': `## Naruto — Watch Order\n\n1. **Naruto** (220 eps, ~90 filler) — 2002-2007\n2. **Naruto Shippuden** (500 eps, ~200 filler) — 2007-2017\n3. **The Last: Naruto the Movie** (canon)\n4. **Boruto: Naruto Next Generations** (293 eps) — 2017-2023\n5. **Boruto: Two Blue Vortex** (ongoing)\n\n**Tip:** Use a filler guide — core story is ~350 episodes.`,
    'dragon ball': `## Dragon Ball — Watch Order\n\n1. **Dragon Ball** (153 eps) — 1986\n2. **Dragon Ball Z** (291 eps) — 1989 (or **Kai** for cut version)\n3. **Dragon Ball Super** (131 eps) — 2015\n4. **Dragon Ball Super: Broly** (movie)\n5. **Dragon Ball Super: Super Hero** (movie)\n6. **Dragon Ball Daima** — 2024`,
    'jojo': `## JoJo's Bizarre Adventure — Watch Order\n\n1. **Phantom Blood** (9 eps) — 2012\n2. **Battle Tendency** (17 eps) — 2012\n3. **Stardust Crusaders** (48 eps) — 2014\n4. **Diamond is Unbreakable** (39 eps) — 2016\n5. **Golden Wind** (39 eps) — 2018\n6. **Stone Ocean** (38 eps) — 2021-2023\n7. **Steel Ball Run** — TBA`,
    'one piece': `## One Piece — Watch Order\n\n1. **One Piece** (1100+ eps, ongoing since 1999)\n\n**Key Movies:** Strong World, Film Z, Film Gold, Film Red\n\n**Alternative:** Watch **One Pace** (fan edit) for faster pacing.`,
    'evangelion': `## Neon Genesis Evangelion — Watch Order\n\n**Original:**\n1. **Neon Genesis Evangelion** (26 eps) — 1995\n2. **The End of Evangelion** (movie) — 1997\n\n**Rebuild (alternate retelling):**\n1. **Evangelion: 1.0** — 2007\n2. **Evangelion: 2.0** — 2009\n3. **Evangelion: 3.0** — 2012\n4. **Evangelion: 3.0+1.0** — 2021`,
    'sword art online': `## Sword Art Online — Watch Order\n\n1. **SAO Season 1** (25 eps) — 2012\n2. **SAO II** (24 eps) — 2014\n3. **SAO: Ordinal Scale** (movie) — 2017\n4. **SAO: Alicization** (24 eps) — 2018\n5. **SAO: Alicization WoU** (23 eps) — 2019-2020\n6. **SAO Alternative: GGO** (12 eps, spinoff)`,
    'death note': `## Death Note — Watch Order\n\n1. **Death Note** (37 eps) — 2006-2007\n2. **Death Note Relight 1** (recap, optional)\n3. **Death Note Relight 2** (recap, optional)`,
    'steins;gate': `## Steins;Gate — Watch Order\n\n1. **Steins;Gate** (24 eps) — 2011\n2. **Steins;Gate: Missing Link** (OVA)\n3. **Steins;Gate: Load Region of Déjà Vu** (movie)\n4. **Steins;Gate 0** (23 eps) — 2018`,
    'code geass': `## Code Geass — Watch Order\n\n1. **Code Geass: Lelouch of the Rebellion** (25 eps)\n2. **Code Geass R2** (25 eps)\n3. **Code Geass: Lelouch of the Re;surrection** (movie)`,
    'gundam': `## Gundam — Beginner Watch Order\n\n**Universal Century (main timeline):**\n1. **Mobile Suit Gundam** (43 eps) — 1979\n2. **Zeta Gundam** → **ZZ Gundam** → **Char's Counterattack**\n\n**Standalone (no prior knowledge needed):**\n- **Gundam 00** — Modern, accessible\n- **Iron-Blooded Orphans** — Dark, grounded\n- **Witch from Mercury** — 2022, newest`
};

// ══════════ DYNAMIC MODULE LOADER (v12) ══════════
const DynamicLoader = {
    loaded: new Set(),
    async load(scriptUrl) {
        if (this.loaded.has(scriptUrl)) return true;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.onload = () => { this.loaded.add(scriptUrl); resolve(true); };
            script.onerror = () => reject();
            document.body.appendChild(script);
        });
    }
};

// ══════════ DOM REFS ══════════
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatWelcome = document.getElementById('chatWelcome');
const chatMessages = document.getElementById('chatMessages');
const chatMessagesInner = document.getElementById('chatMessagesInner');
const chatHistory = document.getElementById('chatHistory');
const clearChatBtn = document.getElementById('clearChatBtn');

document.addEventListener('DOMContentLoaded', () => { loadChatHistory(); setupInputHandlers(); handleQueryParam(); });

function setupInputHandlers() {
    let chatInputTimeout = null;
    chatInput.addEventListener('input', () => {
        clearTimeout(chatInputTimeout);
        chatInputTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
                chatSendBtn.disabled = !chatInput.value.trim() || isProcessing;
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
            });
        }, 300);
    });
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    document.querySelectorAll('.mode-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentMode = chip.dataset.mode;
        });
    });
}

function handleQueryParam() { const q = new URLSearchParams(window.location.search).get('q'); if (q) { chatInput.value = q; sendMessage(); } }
function toggleSidebar() { const s = document.getElementById('chatSidebar'); s.classList.toggle('collapsed'); s.classList.toggle('active'); }

function loadChatHistory() {
    const chats = ChatHistoryManager.getAll();
    chatHistory.innerHTML = chats.length ? chats.map(c => `<div class="chat-history-item ${c.id === currentChatId ? 'active' : ''}" onclick="loadChat('${c.id}')"><i class="fas fa-message"></i><span>${escapeHtml(c.title)}</span></div>`).join('') : '<div style="padding:var(--space-4);text-align:center;color:var(--text-tertiary);font-size:var(--fs-sm)">No chat history yet</div>';
}

function startNewChat() { currentChatId = null; chatMessagesInner.innerHTML = ''; chatMessages.style.display = 'none'; chatWelcome.style.display = 'flex'; clearChatBtn.style.display = 'none'; chatInput.value = ''; chatInput.style.height = 'auto'; chatSendBtn.disabled = true; loadChatHistory(); }

function loadChat(chatId) {
    const chat = ChatHistoryManager.getChat(chatId);
    if (!chat) return;
    currentChatId = chatId;
    chatWelcome.style.display = 'none'; chatMessages.style.display = 'flex'; clearChatBtn.style.display = 'inline-flex';
    chatMessagesInner.innerHTML = '';
    chat.messages.forEach(msg => appendMessage(msg.role, msg.content, false));
    scrollToBottom(); loadChatHistory();
}

function clearChat() { if (currentChatId) { ChatHistoryManager.deleteChat(currentChatId); startNewChat(); } }
function askSuggestion(text) { chatInput.value = text; sendMessage(); }

// ══════════ SEND MESSAGE ══════════
async function sendMessage() {
    // ── Auth Gate: require login before chatting ──
    if (typeof FirebaseAuth !== 'undefined' && !FirebaseAuth.isAuthenticated()) {
        FirebaseAuth.openModal('login');
        return;
    }

    const text = chatInput.value.trim();
    if (!text || isProcessing) return;
    isProcessing = true; chatSendBtn.disabled = true;
    if (!currentChatId) { currentChatId = ChatHistoryManager.create(text.slice(0, 60)).id; }
    chatWelcome.style.display = 'none'; chatMessages.style.display = 'flex'; clearChatBtn.style.display = 'inline-flex';
    appendMessage('user', text);
    ChatHistoryManager.addMessage(currentChatId, 'user', text);
    chatInput.value = ''; chatInput.style.height = 'auto';
    const loadingId = showLoading();
    try {
        const response = await generateResponse(text);
        removeLoading(loadingId);
        appendMessage('ai', response);
        ChatHistoryManager.addMessage(currentChatId, 'ai', response);

        // Save AI Chat Memory to Firestore (v12)
        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
            FirebaseDB.saveChatMessage(text, response).catch(e => console.warn(e));
        }
    } catch (err) {
        removeLoading(loadingId);
        appendMessage('ai', 'Sorry, I encountered an error. Please try again.');
        console.error('Response error:', err);
    }
    isProcessing = false; chatSendBtn.disabled = false; loadChatHistory(); scrollToBottom();
}

// ══════════ ENTITY-POWERED RESPONSE ROUTER ══════════
// Uses EntityDetector as a preprocessing layer before API calls.

async function generateResponse(query) {
    // ── Intercept quiz answers (v10: support both AnimeQuiz and legacy quizState) ──
    if ((typeof AnimeQuiz !== 'undefined' && AnimeQuiz.isActive()) && /^[a-d]$/i.test(query.trim())) {
        const result = AnimeQuiz.checkAnswer(query.trim());
        return result.message;
    }
    if (quizState && /^[a-d]$/i.test(query.trim())) {
        return checkQuizAnswer(query.trim().toUpperCase());
    }

    // ── Intercept personality test answers ──
    if (typeof PersonalityTest !== 'undefined' && PersonalityTest.isActive()) {
        const answerMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
        const idx = answerMap[query.trim().toLowerCase()];
        if (idx !== undefined) {
            const result = PersonalityTest.answerQuestion(idx);
            if (result) return result;
        }
    }

    // ── Step 1: Run Entity Detection ──
    const entities = EntityDetector.detect(query);
    const intent = entities.intent;
    console.log('[EntityDetector]', intent, entities);

    // Intent shortcuts
    if (intent === 'GREETING') return generateGreeting();
    if (intent === 'TRENDING') return await handleTrending(query);
    if (intent === 'UPCOMING') return await handleUpcoming();

    // ── v10 intents ──
    if (intent === 'PERSONALITY_TEST') {
        try {
            await DynamicLoader.load('js/personality-test.js');
            return PersonalityTest.startTest();
        } catch (e) { return '## 🎭 Personality Test\n\nFailed to load module.'; }
    }
    if (intent === 'QUIZ_STATS') {
        try {
            await DynamicLoader.load('js/anime-quiz.js');
            return AnimeQuiz.getStats();
        } catch (e) { return '## 📊 Quiz Stats\n\nFailed to load module.'; }
    }
    if (intent === 'QUIZ_MODE') {
        try {
            await DynamicLoader.load('js/anime-quiz.js');
            const result = await AnimeQuiz.startQuiz();
            return result.message;
        } catch (e) { return await handleQuizMode(query); /* fallback */ }
    }
    if (intent === 'WATCHLIST_ADD') return await handleWatchlistAdd(query, entities);
    if (intent === 'WATCHLIST_SHOW') return handleWatchlistShow();
    if (intent === 'DESCRIBE_ANIME') return await handleDescribeAnime(query);

    // ── Step 2: CHARACTER BATTLE MODE (v10: Power Arena) ──
    if (intent === 'CHARACTER_BATTLE' && entities.battleEntities.length >= 2) {
        // Track battle in memory
        userMemory.addBattle(
            entities.battleEntities[0]?.name || 'unknown',
            entities.battleEntities[1]?.name || 'unknown'
        );
        try {
            await DynamicLoader.load('js/power-arena.js');
            const arenaResult = await PowerArena.runBattle(query, entities);
            if (arenaResult) return arenaResult;
        } catch (e) { }
        return await handleCharacterBattle(query, entities);
    }

    // ── Step 3: Old-style anime comparison ("compare Naruto and One Piece") ──
    if (intent === 'CHARACTER_BATTLE' && entities.animeTitles.length >= 2) {
        return await handleComparison(query, entities.animeTitles[0], entities.animeTitles[1]);
    }

    // ── Step 4: SEASON QUERY ──
    if (intent === 'SEASON_QUERY' && entities.animeTitles.length > 0) {
        return await handleSeasonQuery(query, entities);
    }

    // Determine the primary anime title (from entity detection)
    const primaryTitle = entities.animeTitles[0] || null;

    // Watch order — use database first
    if (intent === 'WATCH_ORDER' && primaryTitle) {
        const woKey = Object.keys(WATCH_ORDERS).find(k => primaryTitle.includes(k) || k.includes(primaryTitle));
        if (woKey) return WATCH_ORDERS[woKey];
    }

    // Memory-powered recommendation
    if (intent === 'RECOMMENDATION' && !primaryTitle) return await handleSmartRecommendation(query);

    // ── Step 5: ANIME-SPECIFIC QUERIES (with validated fetch) ──
    if (primaryTitle) {
        try {
            // Use EntityDetector's validated fetch for better accuracy
            const anime = await EntityDetector.validateAndFetch(
                primaryTitle,
                entities.characterAnime[0] || null
            );

            if (anime) {
                // Update memory
                userMemory.trackInteraction(anime.title);
                userMemory.addGenres((anime.genres || []).map(g => g.name));

                const needsLLM = ['ENDING_EXPLANATION', 'ANALYSIS', 'ANIME_INFO', 'FACTUAL'].includes(intent) || currentMode === 'analysis';

                if (needsLLM) return await handleLLMQuery(query, intent, anime);

                switch (intent) {
                    case 'FACTUAL': return await handleLLMQuery(query, intent, anime);
                    case 'RELEASE': return buildReleaseResponse(anime, [anime]);
                    case 'EXPLAIN': case 'SEARCH': return await handleLLMDetail(query, anime);
                    case 'WATCH_ORDER': {
                        const sr = await AnimeAPI.searchAnime(primaryTitle, 1, 10);
                        return buildWatchOrderFallback(anime, sr.data || [anime]);
                    }
                    case 'CHARACTERS': return await buildCharacterResponse(anime);
                    case 'RECOMMENDATION': return await handleRecommendSimilar(anime);
                    default: return await handleLLMDetail(query, anime);
                }
            }
        } catch (e) { console.error('API error:', e); }
    }

    if (intent === 'RECOMMENDATION') return await handleSmartRecommend(query);

    // General question — send directly to LLM
    return await handleGeneralLLM(query);
}

// ══════════ CHARACTER BATTLE HANDLER ══════════

async function handleCharacterBattle(query, entities) {
    const e1 = entities.battleEntities[0];
    const e2 = entities.battleEntities[1];

    try {
        // Fetch anime data for both characters (use character map or search)
        const [anime1, anime2] = await Promise.all([
            EntityDetector.validateAndFetch(e1.anime, null),
            EntityDetector.validateAndFetch(e2.anime, null)
        ]);

        if (!anime1 || !anime2) {
            return `## ⚠️ Battle Setup Failed\n\nCouldn't identify one or both characters/anime.\n- ${e1.name} → ${anime1 ? '✅ ' + anime1.title : '❌ Not found'}\n- ${e2.name} → ${anime2 ? '✅ ' + anime2.title : '❌ Not found'}`;
        }

        // Track in memory
        userMemory.trackInteraction(anime1.title);
        userMemory.trackInteraction(anime2.title);
        // Sync battle to Firestore (fire-and-forget)
        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
            FirebaseDB.saveBattleHistory({
                fighter1: e1.name, fighter2: e2.name,
                anime1: anime1.title, anime2: anime2.title
            }).catch(() => { });
        }

        // Build battle header
        let response = `## ⚔️ ${e1.name.charAt(0).toUpperCase() + e1.name.slice(1)} vs ${e2.name.charAt(0).toUpperCase() + e2.name.slice(1)}\n\n`;
        response += `| Fighter | Anime | Score | Genres |\n|---|---|---|---|\n`;
        response += `| **${e1.name.charAt(0).toUpperCase() + e1.name.slice(1)}** | ${anime1.title} | ⭐ ${anime1.score || '?'} | ${(anime1.genres || []).map(g => g.name).join(', ') || '?'} |\n`;
        response += `| **${e2.name.charAt(0).toUpperCase() + e2.name.slice(1)}** | ${anime2.title} | ⭐ ${anime2.score || '?'} | ${(anime2.genres || []).map(g => g.name).join(', ') || '?'} |\n`;

        // LLM-powered battle analysis
        try {
            const ctx1 = LLMRouter.buildAnimeContext(anime1);
            const ctx2 = LLMRouter.buildAnimeContext(anime2);
            const messages = [
                { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
                { role: 'user', content: `Analyze this CHARACTER BATTLE: ${e1.name} (from ${anime1.title}) vs ${e2.name} (from ${anime2.title}).\n\nUser asked: "${query}"\n\nProvide a detailed breakdown covering:\n1. **Power Scaling** — Compare power levels, feats, and transformations\n2. **Abilities & Techniques** — Key attacks, special abilities, hax powers\n3. **Combat Style** — Fighting approach, strategy, adaptability\n4. **Universe Rules** — How each universe's power system works\n5. **Verdict** — Who would likely win and why\n\nBe analytical, specific, and reference actual feats from the anime. Provide a clear winner with reasoning.\n\n--- FIGHTER 1: ${e1.name} ---\nAnime: ${anime1.title}\n${ctx1}\n\n--- FIGHTER 2: ${e2.name} ---\nAnime: ${anime2.title}\n${ctx2}` }
            ];
            const result = await LLMRouter.chat(messages, { maxTokens: 2000, temperature: 0.7 });
            response += `\n\n### 🧠 Battle Analysis\n\n${result.content}`;
            response += `\n\n> 🤖 *Battle analysis by AnimeSense AI Analysis Engine*`;
        } catch (e) {
            response += `\n\n### 📊 Quick Take\n\nBoth ${e1.name} and ${e2.name} are iconic fighters from their respective universes. The outcome depends on which universe's rules apply — power scaling varies wildly across anime!`;
            response += `\n\n> 📊 *Character data from AnimeSense Knowledge System*`;
        }

        return response;
    } catch (e) {
        console.error('Battle error:', e);
        return `## ⚔️ Battle\n\nCouldn't set up this battle. Try: **"Goku vs Saitama"** or **"Naruto vs Luffy"**`;
    }
}

// ══════════ SEASON QUERY HANDLER ══════════

async function handleSeasonQuery(query, entities) {
    const baseTitle = entities.animeTitles[0];
    const seasonNum = entities.season;
    const isLatest = entities.seasonIsLatest;

    try {
        const result = await EntityDetector.resolveSeasonedAnime(baseTitle, seasonNum, isLatest);

        if (!result) {
            return `## ❓ Season Not Found\n\nCouldn't find information about ${baseTitle}${seasonNum ? ' Season ' + seasonNum : ''}. Try checking the anime title.`;
        }

        const anime = result.anime;
        userMemory.trackInteraction(anime.title);
        userMemory.addGenres((anime.genres || []).map(g => g.name));

        let response = '';

        if (!result.found && result.message) {
            // Season doesn't exist yet
            response += `## ⚠️ ${result.message}\n\n`;
            response += `### Latest Available: ${anime.title}\n\n`;
        } else {
            response += `## 📺 ${anime.title}\n\n`;
        }

        response += `| Detail | Info |\n|---|---|\n`;
        response += `| **Type** | ${anime.type || '?'} |\n`;
        response += `| **Episodes** | ${anime.episodes || 'TBA'} |\n`;
        response += `| **Status** | ${anime.status || '?'} |\n`;
        response += `| **Aired** | ${anime.aired?.string || 'TBA'} |\n`;
        response += `| **Studio** | ${(anime.studios || []).map(s => s.name).join(', ') || '?'} |\n`;
        response += `| **Score** | ⭐ ${anime.score || 'N/A'}/10 |\n`;
        response += `| **Genres** | ${(anime.genres || []).map(g => g.name).join(', ') || '?'} |\n`;

        if (anime.synopsis) {
            response += `\n${anime.synopsis.slice(0, 400)}${anime.synopsis.length > 400 ? '...' : ''}`;
        }

        response += `\n\n> 📺 *Live data from AnimeSense Data System*`;
        return response;
    } catch (e) {
        console.error('Season query error:', e);
        return `## ❓ Season Query\n\nCouldn't process that season query. Try: **"Dandadan season 2"** or **"Attack on Titan latest season"**`;
    }
}

async function handleDescribeAnime(query) {
    try {
        // Step 0: Check knowledge base for quick match by themes/keywords
        let knowledgeMatch = null;
        if (typeof AnimeKnowledge !== 'undefined') {
            const qLower = query.toLowerCase();
            const allEntries = Object.entries(AnimeKnowledge.DATABASE);
            let bestScore = 0;

            for (const [key, data] of allEntries) {
                let score = 0;
                // Check themes
                for (const theme of data.themes) {
                    if (qLower.includes(theme)) score += 3;
                }
                // Check power system keywords
                const powerWords = data.power_system.toLowerCase().split(/[\s,.\-—()]+/).filter(w => w.length >= 4);
                for (const pw of powerWords) {
                    if (qLower.includes(pw)) score += 2;
                }
                // Check character names
                for (const char of data.characters) {
                    if (qLower.includes(char.toLowerCase().split(' ')[0])) score += 5;
                }
                // Check notable arcs
                if (data.notable_arcs) {
                    for (const arc of data.notable_arcs) {
                        if (qLower.includes(arc.toLowerCase())) score += 4;
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    knowledgeMatch = { key, ...data };
                }
            }
            // Only use knowledge match if it has a reasonable score
            if (bestScore < 4) knowledgeMatch = null;
        }

        // Step 0b: Also check Knowledge Graph for character and theme matches
        if (typeof AnimeGraph !== 'undefined' && !knowledgeMatch) {
            const qLower = query.toLowerCase();

            // Try character-based matching via graph
            const words = qLower.split(/\s+/).filter(w => w.length >= 3);
            for (const word of words) {
                const charResults = AnimeGraph.findAnimeByCharacter(word);
                if (charResults.length > 0) {
                    const kbLookup = AnimeKnowledge ? AnimeKnowledge.lookup(charResults[0].key) : null;
                    if (kbLookup) {
                        knowledgeMatch = kbLookup;
                        break;
                    }
                }
            }

            // Try theme-based matching via graph if still no match
            if (!knowledgeMatch) {
                const themeKeywords = ['time travel', 'revenge', 'magic', 'mecha', 'isekai', 'virtual reality',
                    'zombie', 'demon', 'ghost', 'psychic', 'detective', 'sports', 'music', 'cooking',
                    'survival', 'post-apocalyptic', 'school', 'military', 'pirate', 'ninja', 'samurai'];
                for (const theme of themeKeywords) {
                    if (qLower.includes(theme)) {
                        const themeResults = AnimeGraph.findAnimeByTheme(theme);
                        if (themeResults.length > 0) {
                            const kbLookup = AnimeKnowledge ? AnimeKnowledge.lookup(themeResults[0].key) : null;
                            if (kbLookup) {
                                knowledgeMatch = kbLookup;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Step 1: Use LLM to extract keywords from the vague description
        const extractMessages = [
            { role: 'system', content: 'You are an anime identification expert. Given a user description, extract the most likely anime title and 3-5 search keywords. Respond in EXACTLY this JSON format: {"probable_title":"title or null","keywords":["keyword1","keyword2","keyword3"]}. Only respond with JSON, nothing else.' },
            { role: 'user', content: query }
        ];

        let keywords = [];
        let probableTitle = knowledgeMatch ? knowledgeMatch.title.split('(')[0].trim() : null;

        try {
            const llmResult = await LLMRouter.chat(extractMessages, { maxTokens: 200, temperature: 0.3 });
            const parsed = JSON.parse(llmResult.content.replace(/```json\n?|\n?```/g, '').trim());
            keywords = parsed.keywords || [];
            if (!probableTitle) probableTitle = parsed.probable_title;
        } catch (e) {
            // Fallback: extract nouns from the query
            keywords = query.toLowerCase()
                .replace(/anime\s+(where|about|with|that|in which)\s+/i, '')
                .replace(/\b(a|the|an|is|was|has|had|who|which|this|that|and|or|but)\b/g, '')
                .split(/\s+/)
                .filter(w => w.length >= 3)
                .slice(0, 5);
        }

        // Step 2: Search using probable title first, then keywords
        let bestMatch = null;
        const searchTerms = probableTitle ? [probableTitle, ...keywords] : keywords;

        for (const term of searchTerms) {
            if (term && term.length >= 2) {
                const result = await AnimeAPI.searchAnime(term, 1, 5);
                if (result.data && result.data.length > 0) {
                    // Pick by popularity
                    const sorted = [...result.data].sort((a, b) => (a.popularity || 99999) - (b.popularity || 99999));
                    bestMatch = sorted[0];
                    break;
                }
            }
        }

        if (!bestMatch) {
            // If knowledge base had a match but API didn't, still report the KB match
            if (knowledgeMatch) {
                const kbCtx = AnimeKnowledge.buildKnowledgeContext(knowledgeMatch);
                return `## 🔍 Identified: ${knowledgeMatch.title}\n\n**Based on your description, this is likely ${knowledgeMatch.title}!**\n\n| Detail | Info |\n|---|---|\n| **Author** | ${knowledgeMatch.author} |\n| **Studio** | ${knowledgeMatch.studio} |\n| **Years** | ${knowledgeMatch.years} |\n| **Themes** | ${knowledgeMatch.themes.join(', ')} |\n| **Power System** | ${knowledgeMatch.power_system.slice(0, 100)}... |\n\n${knowledgeMatch.ending_summary || ''}\n\n> 📚 *Identified from AnimeSense Knowledge Base*`;
            }
            return `## 🔍 Anime Identification\n\nI couldn't identify an anime from that description. Try being more specific:\n- Character abilities\n- Setting or time period\n- Key plot events\n\n**Example:** "Anime where a boy eats a cursed finger and fights curses at a school"`;
        }

        // Track in memory
        userMemory.trackInteraction(bestMatch.title);
        userMemory.addGenres((bestMatch.genres || []).map(g => g.name));

        // Step 3: Use LLM for a rich identification response (context now includes KB data automatically via buildAnimeContext)
        const context = LLMRouter.buildAnimeContext(bestMatch);
        const identifyMessages = [
            { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
            { role: 'user', content: `The user described an anime: "${query}"\n\nI identified it as the anime below. Confirm the match, explain WHY this anime matches their description, and provide key details including the power system and notable arcs. If the match might be wrong, suggest alternatives.\n\n${context}` }
        ];

        try {
            const result = await LLMRouter.chat(identifyMessages, { maxTokens: 1200, temperature: 0.6 });
            const kbTag = knowledgeMatch ? ' + Knowledge Base' : '';
            return `## 🔍 Found: ${bestMatch.title}\n\n${result.content}\n\n> 🤖 *Identified by AnimeSense Intelligence Engine${kbTag}*`;
        } catch (e) {
            // Fallback: data-only response
            const g = (bestMatch.genres || []).map(g => g.name).join(', ') || '?';
            const s = (bestMatch.studios || []).map(s => s.name).join(', ') || '?';
            return `## 🔍 Found: ${bestMatch.title}\n\n**This might be what you're looking for!**\n\n| Detail | Info |\n|---|---|\n| **Type** | ${bestMatch.type || '?'} |\n| **Episodes** | ${bestMatch.episodes || '?'} |\n| **Score** | ⭐ ${bestMatch.score || '?'}/10 |\n| **Genres** | ${g} |\n| **Studio** | ${s} |\n| **Year** | ${bestMatch.year || '?'} |\n\n${(bestMatch.synopsis || '').slice(0, 400)}\n\n> 🔍 *Identified by AnimeSense Knowledge System*`;
        }
    } catch (e) {
        console.error('Describe anime error:', e);
        return `## 🔍 Anime Identification\n\nSomething went wrong. Try describing the anime differently!`;
    }
}

// ══════════ ANIME QUIZ MODE ══════════

async function handleQuizMode(query) {
    // Check if user is answering an existing quiz
    if (quizState && /^[a-d]$/i.test(query.trim())) {
        return checkQuizAnswer(query.trim().toUpperCase());
    }

    try {
        // Fetch random anime for the quiz
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const result = await AnimeAPI.getTopAnime(randomPage, 25);
        const animePool = (result.data || []).filter(a => a.synopsis && a.synopsis.length > 50);

        if (animePool.length < 4) {
            return `## 🎮 Quiz Error\n\nCouldn't fetch enough anime for a quiz. Try again!`;
        }

        // Shuffle and pick 4 anime — 1 correct + 3 wrong
        const shuffled = animePool.sort(() => 0.5 - Math.random());
        const correct = shuffled[0];
        const wrongOptions = shuffled.slice(1, 4);

        // Randomly decide question type
        const questionTypes = ['synopsis', 'year', 'studio'];
        const qType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

        let questionText = '';
        let hint = '';

        switch (qType) {
            case 'synopsis':
                // Remove the title from synopsis to avoid giving it away
                let synText = (correct.synopsis || '').slice(0, 250);
                const titleWords = correct.title.split(/[\s:]+/).filter(w => w.length >= 3);
                for (const tw of titleWords) {
                    synText = synText.replace(new RegExp(tw, 'gi'), '***');
                }
                questionText = `**Guess the anime from this synopsis:**\n\n*"${synText}..."*`;
                break;
            case 'year':
                questionText = `**Which anime first aired in ${correct.year || correct.aired?.prop?.from?.year}?**`;
                hint = `\n\n*Hint: It has ${correct.episodes || '?'} episodes and is a ${(correct.genres || []).slice(0, 2).map(g => g.name).join('/')} series.*`;
                break;
            case 'studio':
                const studios = (correct.studios || []).map(s => s.name).join(', ') || 'Unknown Studio';
                questionText = `**Which anime was produced by ${studios}?**`;
                hint = `\n\n*Hint: Score ⭐ ${correct.score}/10 • ${correct.episodes || '?'} episodes • ${correct.year || '?'}*`;
                break;
        }

        // Build answer options (shuffled)
        const allOptions = [correct, ...wrongOptions].sort(() => 0.5 - Math.random());
        const correctIndex = allOptions.indexOf(correct);
        const letters = ['A', 'B', 'C', 'D'];

        // Store quiz state
        quizState = {
            correctAnswer: letters[correctIndex],
            correctTitle: correct.title,
            options: allOptions.map((a, i) => `${letters[i]}) ${a.title}`),
            score: parseInt(sessionStorage.getItem('as_quiz_score') || '0'),
            total: parseInt(sessionStorage.getItem('as_quiz_total') || '0')
        };

        let response = `## 🎮 Anime Quiz\n\n${questionText}${hint}\n\n`;
        response += quizState.options.join('\n') + '\n\n';
        response += `**Type A, B, C, or D to answer!**\n\n`;
        response += `> 📊 *Your score: ${quizState.score}/${quizState.total}*`;

        return response;
    } catch (e) {
        console.error('Quiz error:', e);
        return `## 🎮 Quiz\n\nCouldn't generate a quiz right now. Try again!`;
    }
}

function checkQuizAnswer(answer) {
    if (!quizState) return '## 🎮 Quiz\n\nNo active quiz! Say **"anime quiz"** to start one.';

    const correct = quizState.correctAnswer;
    const title = quizState.correctTitle;
    quizState.total++;
    let response;

    if (answer === correct) {
        quizState.score++;
        response = `## ✅ Correct!\n\nThe answer is **${correct}) ${title}** 🎉\n\n`;
        response += `**Score: ${quizState.score}/${quizState.total}** 🏆`;
    } else {
        response = `## ❌ Wrong!\n\nYou answered **${answer}**, but the correct answer was **${correct}) ${title}**.\n\n`;
        response += `**Score: ${quizState.score}/${quizState.total}**`;
    }

    // Save score
    sessionStorage.setItem('as_quiz_score', quizState.score.toString());
    sessionStorage.setItem('as_quiz_total', quizState.total.toString());
    // Sync to Firestore (fire-and-forget)
    if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
        FirebaseDB.saveQuizScore({
            correct: answer === correct,
            streak: parseInt(sessionStorage.getItem('as_quiz_streak') || '0')
        }).catch(() => { });
    }

    response += `\n\n> 💡 Say **"quiz"** for another question!`;
    quizState = null;
    return response;
}

// ══════════ WATCHLIST HANDLERS ══════════

async function handleWatchlistAdd(query, entities) {
    const title = entities.animeTitles[0] || null;
    if (!title) {
        // Try to extract title from "I watched [anime]" patterns
        const cleaned = query.replace(/\b(i\s+watched|i\s+finished|i\s+completed|i\s+saw|add|to\s+my\s+(?:watch)?list|mark\s+as\s+watched)\b/gi, '').trim();
        if (cleaned.length >= 2) {
            const anime = await EntityDetector.validateAndFetch(cleaned, null);
            if (anime) {
                const added = Watchlist.add(anime);
                userMemory.trackInteraction(anime.title);
                userMemory.addGenres((anime.genres || []).map(g => g.name));
                if (added) {
                    return `## ✅ Added to Watchlist\n\n**${anime.title}** has been added to your watchlist!\n\n| Detail | Info |\n|---|---|\n| **Type** | ${anime.type || '?'} |\n| **Episodes** | ${anime.episodes || '?'} |\n| **Score** | ⭐ ${anime.score || '?'}/10 |\n| **Genres** | ${(anime.genres || []).map(g => g.name).join(', ')} |\n\n> 📋 Say **"show my watchlist"** to see all tracked anime.`;
                } else {
                    return `## 📋 Already Tracked\n\n**${anime.title}** is already in your watchlist!\n\n> Say **"show my watchlist"** to see your list.`;
                }
            }
        }
        return `## ❓ Which Anime?\n\nI couldn't detect the anime to add. Try: **"I watched Attack on Titan"** or **"Add Naruto to my list"**`;
    }

    const anime = await EntityDetector.validateAndFetch(title, null);
    if (!anime) return `## ❓ Not Found\n\nCouldn't find "${title}". Check the title and try again.`;

    const added = Watchlist.add(anime);
    userMemory.trackInteraction(anime.title);
    userMemory.addGenres((anime.genres || []).map(g => g.name));

    if (added) {
        return `## ✅ Added to Watchlist\n\n**${anime.title}** has been added!\n\n| Detail | Info |\n|---|---|\n| **Type** | ${anime.type || '?'} |\n| **Episodes** | ${anime.episodes || '?'} |\n| **Score** | ⭐ ${anime.score || '?'}/10 |\n| **Status** | ${anime.status || '?'} |\n\n> 📋 *${Watchlist.getAll().length} anime in your watchlist*`;
    }
    return `## 📋 Already Tracked\n\n**${anime.title}** is already in your watchlist! (${Watchlist.getAll().length} total)`;
}

function handleWatchlistShow() {
    const list = Watchlist.getAll();
    if (list.length === 0) {
        return `## 📋 Your Watchlist\n\nYour watchlist is empty! Try:\n- **"I watched Naruto"**\n- **"Add Attack on Titan to my list"**\n- **"I finished Death Note"**`;
    }

    let response = `## 📋 Your Watchlist (${list.length} anime)\n\n`;
    response += `| # | Title | Type | Episodes | Score | Genres |\n|---|---|---|---|---|---|\n`;
    list.forEach((a, i) => {
        response += `| ${i + 1} | **${a.title}** | ${a.type} | ${a.episodes || '?'} | ⭐ ${a.score || '?'} | ${a.genres.slice(0, 2).join(', ')} |\n`;
    });

    const totalEps = list.reduce((sum, a) => sum + (a.episodes || 0), 0);
    const avgScore = (list.reduce((sum, a) => sum + (a.score || 0), 0) / list.length).toFixed(1);

    response += `\n### 📊 Stats\n- **Total anime:** ${list.length}\n- **Total episodes:** ${totalEps}\n- **Average score:** ⭐ ${avgScore}/10`;
    response += `\n\n> 💡 Add more with **"I watched [anime name]"**`;
    return response;
}

// ══════════ LLM-POWERED HANDLERS ══════════

async function handleLLMQuery(query, queryType, anime) {
    let charData = null;
    try { charData = (await AnimeAPI.getAnimeCharacters(anime.mal_id)).data; } catch (e) { }
    const context = LLMRouter.buildAnimeContext(anime, charData);
    const typeHints = {
        ENDING_EXPLANATION: 'Provide a detailed ending explanation with spoilers. Explain the themes, character arcs, and authorial intent. Reference specific scenes and plot twists.',
        ANALYSIS: 'Provide deep thematic analysis. Discuss symbolism, character psychology, narrative techniques, and the power system. Reference the author\'s storytelling approach.',
        CHARACTER_BATTLE: 'Compare and contrast the anime with others in its genre. Analyze power systems and character feats.',
        FACTUAL: 'Answer this factual question as concisely as possible in 1-2 sentences. Do NOT elaborate or add unnecessary sections.',
        ANIME_INFO: 'Provide comprehensive information about this anime including power system, key arcs, and notable aspects.'
    };
    const memoryCtx = userMemory.getContext();
    const messages = [
        { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
        { role: 'user', content: `${typeHints[queryType] || ''}\n\nUser question: "${query}"${memoryCtx ? '\n\nUser context:' + memoryCtx : ''}\n\n${context}` }
    ];
    try {
        const result = await LLMRouter.chat(messages, { maxTokens: 1500, temperature: 0.7 });
        const kbTag = (typeof AnimeKnowledge !== 'undefined' && AnimeKnowledge.lookup(anime.title)) ? ' + Knowledge Base' : '';
        return result.content + `\n\n> 🤖 *AI analysis by AnimeSense AI Analysis Engine${kbTag}*`;
    } catch (e) {
        console.error('LLM failed:', e);
        return await buildFullDetailResponse(anime, charData);
    }
}

async function handleLLMDetail(query, anime) {
    let charData = null;
    try { charData = (await AnimeAPI.getAnimeCharacters(anime.mal_id)).data; } catch (e) { }
    const context = LLMRouter.buildAnimeContext(anime, charData);
    const messages = [
        { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
        { role: 'user', content: `The user asked: "${query}"\n\nProvide a comprehensive, well-formatted response with all key details (title, synopsis, episodes, rating, studio, year, characters). Use tables for structured data.\n\n${context}` }
    ];
    try {
        const result = await LLMRouter.chat(messages, { maxTokens: 1800, temperature: 0.6 });
        return result.content + `\n\n> 🤖 *AnimeSense Intelligence Engine · Live data from AnimeSense Data System*`;
    } catch (e) {
        return await buildFullDetailResponse(anime, charData);
    }
}

async function handleTrending(query) {
    try {
        const results = await AnimeAPI.getTopAnime(1, 10, 'airing');
        if (results.data && results.data.length > 0) {
            const context = LLMRouter.buildTrendingContext(results.data);
            const messages = [
                { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
                { role: 'user', content: `User asked: "${query}"\n\nPresent the trending anime in a clean numbered list with scores, episodes, genres, and a short hook for each. Use a ## heading.\n\n${context}` }
            ];
            try {
                const result = await LLMRouter.chat(messages, { maxTokens: 1500, temperature: 0.6 });
                return result.content + `\n\n> 🤖 *AnimeSense Intelligence Engine · Live trending data from AnimeSense Data System*`;
            } catch (e) {
                return buildTrendingFallback(results.data);
            }
        }
    } catch (e) { }
    return '## 🔥 Trending\n\nCouldn\'t fetch trending data right now. Try the **Search** page!';
}

async function handleUpcoming() {
    try {
        const results = await AnimeAPI.getSeasonUpcoming(1, 10);
        if (results.data && results.data.length > 0) {
            const list = results.data.map((a, i) => `${i + 1}. **${a.title}**\n   - ${(a.genres || []).map(g => g.name).join(', ') || 'TBA'} | ${a.aired?.string || 'TBA'}\n   - Studio: ${(a.studios || []).map(s => s.name).join(', ') || 'TBA'}`).join('\n\n');
            return `## 📅 Upcoming Anime\n\n${list}\n\n> 💡 Add to your **Watchlist** to track releases!`;
        }
    } catch (e) { }
    return '## 📅 Upcoming\n\nCouldn\'t fetch upcoming anime. Try the **Search** page!';
}

async function handleRecommend(query) {
    const q = query.toLowerCase();
    const genreMap = { 'action': 1, 'adventure': 2, 'comedy': 4, 'drama': 8, 'fantasy': 10, 'horror': 14, 'mystery': 7, 'romance': 22, 'sci-fi': 24, 'psychological': 40, 'thriller': 41, 'slice of life': 36, 'sports': 30, 'supernatural': 37, 'isekai': 62, 'mecha': 18 };
    let genreId = null, genreName = '';
    for (const [k, id] of Object.entries(genreMap)) { if (q.includes(k)) { genreId = id; genreName = k; break; } }
    try {
        const results = genreId ? await AnimeAPI.getAnimeByGenre(genreId, 1, 10) : await AnimeAPI.getTopAnime(1, 10, 'bypopularity');
        if (results.data && results.data.length >= 3) {
            const context = LLMRouter.buildTrendingContext(results.data.slice(0, 8));
            const messages = [
                { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
                { role: 'user', content: `User asked: "${query}"\n\nRecommend the top 5 anime from this list. For each, give a compelling reason to watch. Format with ## heading.\n\n${context}` }
            ];
            try {
                const result = await LLMRouter.chat(messages, { maxTokens: 1200, temperature: 0.8 });
                return result.content + `\n\n> 🤖 *AnimeSense Intelligence Engine · AnimeSense Data System*`;
            } catch (e) {
                const list = results.data.slice(0, 5).map((a, i) => `${i + 1}. **${a.title}** — ⭐ ${a.score || '?'}/10 | ${a.episodes || '?'} eps\n   - ${(a.genres || []).map(g => g.name).join(', ')}`).join('\n\n');
                return `## 🎯 ${(genreName || 'Top').charAt(0).toUpperCase() + (genreName || 'top').slice(1)} Recommendations\n\n${list}`;
            }
        }
    } catch (e) { }
    return '## 🎯 Recommendations\n\nCouldn\'t fetch recommendations right now.';
}

async function handleRecommendSimilar(anime) {
    try {
        const recs = await AnimeAPI.getAnimeRecommendations(anime.mal_id);
        if (recs.data && recs.data.length >= 3) {
            const context = LLMRouter.buildRecommendationsContext(recs.data.slice(0, 8), anime);
            const messages = [
                { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
                { role: 'user', content: `Recommend anime similar to "${anime.title}". Pick the top 5 and explain why fans of ${anime.title} would enjoy each.\n\n${context}` }
            ];
            try {
                const result = await LLMRouter.chat(messages, { maxTokens: 1200, temperature: 0.8 });
                return result.content + `\n\n> 🤖 *AnimeSense Intelligence Engine · AnimeSense Data System*`;
            } catch (e) { }
            const list = recs.data.slice(0, 5).map((r, i) => `${i + 1}. **${r.entry.title}** (${r.votes} votes)`).join('\n');
            return `## Anime Similar to ${anime.title}\n\n${list}`;
        }
    } catch (e) { }
    return `## Similar to ${anime.title}\n\nCouldn't fetch recommendations. Try again!`;
}

// ══════════ SMART RECOMMENDATION ENGINE (v7) ══════════

async function handleSmartRecommendation(query) {
    const watchlist = Watchlist.getAll();
    const hasHistory = userMemory.watched.length > 0 || watchlist.length > 0;

    // If no history, fall back to genre detection
    if (!hasHistory) return await handleRecommend(query);

    try {
        // Step 1: Build user profile
        const allTitles = [...new Set([...userMemory.watched, ...watchlist.map(a => a.title)])];
        const topGenres = userMemory.genres.length > 0
            ? [...new Set(userMemory.genres)].slice(0, 5)
            : watchlist.flatMap(a => a.genres || []).slice(0, 5);

        // Step 2: Find a seed anime for Jikan recommendations
        let seedAnime = null;
        const recentTitle = allTitles[allTitles.length - 1];
        if (recentTitle) {
            seedAnime = await EntityDetector.validateAndFetch(recentTitle, null);
        }

        let recResults = [];

        // Step 3: Fetch /anime/{id}/recommendations from seed
        if (seedAnime) {
            try {
                const recs = await AnimeAPI.getAnimeRecommendations(seedAnime.mal_id);
                recResults = (recs.data || []).slice(0, 10).map(r => r.entry);
            } catch (e) { console.warn('Rec fetch failed:', e); }
        }

        // Step 4: Filter out already-watched titles
        const watchedTitles = new Set(allTitles.map(t => t.toLowerCase()));
        recResults = recResults.filter(r => !watchedTitles.has(r.title?.toLowerCase()));

        // Step 5: If not enough recs, supplement with genre-based search
        if (recResults.length < 3 && topGenres.length > 0) {
            const genreMap = { 'Action': 1, 'Adventure': 2, 'Comedy': 4, 'Drama': 8, 'Fantasy': 10, 'Horror': 14, 'Mystery': 7, 'Romance': 22, 'Sci-Fi': 24, 'Psychological': 40, 'Supernatural': 37, 'Slice of Life': 36 };
            const genreId = genreMap[topGenres[0]] || 1;
            try {
                const genreAnime = await AnimeAPI.getAnimeByGenre(genreId, 1, 10);
                const extra = (genreAnime.data || []).filter(a => !watchedTitles.has(a.title?.toLowerCase()));
                recResults = [...recResults, ...extra].slice(0, 8);
            } catch (e) { }
        }

        if (recResults.length === 0) return await handleRecommend(query);

        // Step 6: Format with LLM + Knowledge Base profile
        const profileCtx = LLMRouter.buildRecommendationProfile(userMemory, watchlist);
        const recList = recResults.slice(0, 8).map(r => `- ${r.title} (MAL ID: ${r.mal_id})`).join('\n');
        const messages = [
            { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
            { role: 'user', content: `${profileCtx}\n\nBased on this user profile, recommend the best 5 anime from this list and explain WHY each fits their taste. Reference their favorite themes and genres. Format with ## heading and numbered list.\n\nCandidate anime:\n${recList}` }
        ];

        try {
            const result = await LLMRouter.chat(messages, { maxTokens: 1200, temperature: 0.8 });
            return `${result.content}\n\n> 🧠 *Personalized by AnimeSense Intelligence Engine · Based on your ${allTitles.length} searches + ${watchlist.length} watchlist entries*`;
        } catch (e) {
            // Fallback: simple list
            const list = recResults.slice(0, 5).map((r, i) => `${i + 1}. **${r.title}**`).join('\n');
            return `## 🎯 Personalized Recommendations\n\nBased on your taste for **${topGenres.join(', ')}**:\n\n${list}\n\n> 🧠 *Based on ${allTitles.length} searches*`;
        }
    } catch (e) {
        console.error('Smart recommendation error:', e);
        return await handleRecommend(query);
    }
}

// ══════════ COMPARISON MODE ══════════

async function handleComparison(query, nameA, nameB) {
    try {
        // Fetch both anime in parallel
        const [resultA, resultB] = await Promise.all([
            AnimeAPI.searchAnime(nameA, 1, 5),
            AnimeAPI.searchAnime(nameB, 1, 5)
        ]);

        const animeA = resultA.data?.[0];
        const animeB = resultB.data?.[0];

        if (!animeA || !animeB) {
            return `## ⚠️ Comparison Error\n\nCouldn't find one or both anime. Please check the names and try again.\n- "${nameA}" → ${animeA ? '✅ Found' : '❌ Not found'}\n- "${nameB}" → ${animeB ? '✅ Found' : '❌ Not found'}`;
        }

        // Track both in memory
        userMemory.trackInteraction(animeA.title);
        userMemory.trackInteraction(animeB.title);
        userMemory.addGenres((animeA.genres || []).map(g => g.name));
        userMemory.addGenres((animeB.genres || []).map(g => g.name));

        const g = a => (a.genres || []).map(g => g.name).join(', ') || '?';
        const s = a => (a.studios || []).map(s => s.name).join(', ') || '?';

        // Build comparison table
        let response = `## ⚔️ ${animeA.title} vs ${animeB.title}\n\n`;
        response += `| Attribute | ${animeA.title} | ${animeB.title} |\n`;
        response += `|---|---|---|\n`;
        response += `| **Type** | ${animeA.type || '?'} | ${animeB.type || '?'} |\n`;
        response += `| **Episodes** | ${animeA.episodes || '?'} | ${animeB.episodes || '?'} |\n`;
        response += `| **Score** | ⭐ ${animeA.score || '?'}/10 | ⭐ ${animeB.score || '?'}/10 |\n`;
        response += `| **Rank** | #${animeA.rank || '?'} | #${animeB.rank || '?'} |\n`;
        response += `| **Popularity** | #${animeA.popularity || '?'} | #${animeB.popularity || '?'} |\n`;
        response += `| **Studio** | ${s(animeA)} | ${s(animeB)} |\n`;
        response += `| **Genres** | ${g(animeA)} | ${g(animeB)} |\n`;
        response += `| **Year** | ${animeA.year || animeA.aired?.prop?.from?.year || '?'} | ${animeB.year || animeB.aired?.prop?.from?.year || '?'} |\n`;
        response += `| **Status** | ${animeA.status || '?'} | ${animeB.status || '?'} |\n`;
        response += `| **Rating** | ${animeA.rating || '?'} | ${animeB.rating || '?'} |\n`;

        // Try LLM analysis for deeper comparison
        try {
            const contextA = LLMRouter.buildAnimeContext(animeA);
            const contextB = LLMRouter.buildAnimeContext(animeB);
            const messages = [
                { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
                { role: 'user', content: `Compare these two anime in detail. Discuss storytelling style, themes, power systems, character development, pacing, animation quality, and overall appeal. Reference specific arcs and the authors' approaches. Be specific and analytical. Do NOT repeat the comparison table — it's already shown above.\n\nUser question: "${query}"\n\n--- ANIME A ---\n${contextA}\n\n--- ANIME B ---\n${contextB}` }
            ];
            const result = await LLMRouter.chat(messages, { maxTokens: 1500, temperature: 0.7 });
            const kbTag = (typeof AnimeKnowledge !== 'undefined' && (AnimeKnowledge.lookup(animeA.title) || AnimeKnowledge.lookup(animeB.title))) ? ' + Knowledge Base' : '';
            response += `\n\n### 🧠 AI Analysis\n\n${result.content}`;
            response += `\n\n> 🤖 *AI comparison by AnimeSense AI Analysis Engine${kbTag}*`;
        } catch (e) {
            // Fallback — basic text comparison
            const winner = (animeA.score || 0) > (animeB.score || 0) ? animeA : animeB;
            response += `\n\n### 📊 Quick Take\n\n`;
            response += `**${winner.title}** leads with a higher MAL score (${winner.score}/10). `;
            response += `Both series have strong fan bases. ${animeA.title} leans toward *${g(animeA)}*, while ${animeB.title} focuses on *${g(animeB)}*.`;
            response += `\n\n> 📊 *Comparison data from AnimeSense Data System*`;
        }

        return response;
    } catch (e) {
        console.error('Comparison error:', e);
        return `## ⚔️ Comparison\n\nCouldn't compare those anime right now. Try: **"Naruto vs One Piece"**`;
    }
}

// ══════════ MEMORY-POWERED RECOMMENDATIONS ══════════

async function handleSmartRecommend(query) {
    const q = query.toLowerCase();
    const genreMap = { 'action': 1, 'adventure': 2, 'comedy': 4, 'drama': 8, 'fantasy': 10, 'horror': 14, 'mystery': 7, 'romance': 22, 'sci-fi': 24, 'psychological': 40, 'thriller': 41, 'slice of life': 36, 'sports': 30, 'supernatural': 37, 'isekai': 62, 'mecha': 18 };

    // Check if query mentions a specific genre
    let genreId = null, genreName = '';
    for (const [k, id] of Object.entries(genreMap)) {
        if (q.includes(k)) { genreId = id; genreName = k; break; }
    }

    // If no genre in query, use memory to find preferred genre
    if (!genreId && userMemory.genres.length > 0) {
        const preferredGenre = userMemory.getTopGenres(1)[0];
        const mapped = Object.entries(genreMap).find(([k]) => preferredGenre.toLowerCase().includes(k));
        if (mapped) { genreId = mapped[1]; genreName = mapped[0]; }
    }

    try {
        const results = genreId
            ? await AnimeAPI.getAnimeByGenre(genreId, 1, 15)
            : await AnimeAPI.getTopAnime(1, 15, 'bypopularity');

        if (results.data && results.data.length >= 3) {
            // Filter out already-watched anime from recommendations
            const filtered = results.data.filter(a =>
                !userMemory.watched.some(w => w.toLowerCase() === a.title.toLowerCase())
            );
            const animeList = (filtered.length >= 3 ? filtered : results.data).slice(0, 8);

            const context = LLMRouter.buildTrendingContext(animeList);
            const memoryCtx = userMemory.getContext();
            const personalNote = memoryCtx
                ? `\n\nThe user has these preferences:${memoryCtx}\n\nPersonalize recommendations based on their history. Explain why each pick matches their taste.`
                : '';

            const messages = [
                { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
                { role: 'user', content: `User asked: "${query}"${personalNote}\n\nRecommend the top 5 anime from this list. For each, give a compelling reason to watch. Use a ## heading and number the list.\n\n${context}` }
            ];
            try {
                const result = await LLMRouter.chat(messages, { maxTokens: 1500, temperature: 0.8 });
                let resp = result.content;
                if (userMemory.watched.length > 0) {
                    resp += `\n\n> 🧠 *Personalized based on your history: ${userMemory.watched.slice(-5).join(', ')}*`;
                }
                resp += `\n\n> 🤖 *AnimeSense Intelligence Engine · AnimeSense Data System*`;
                return resp;
            } catch (e) {
                const list = animeList.slice(0, 5).map((a, i) => `${i + 1}. **${a.title}** — ⭐ ${a.score || '?'}/10 | ${a.episodes || '?'} eps\n   - ${(a.genres || []).map(g => g.name).join(', ')}`).join('\n\n');
                return `## 🎯 ${(genreName || 'Top').charAt(0).toUpperCase() + (genreName || 'top').slice(1)} Recommendations\n\n${list}`;
            }
        }
    } catch (e) { }
    return '## 🎯 Recommendations\n\nCouldn\'t fetch recommendations right now.';
}

async function handleGeneralLLM(query) {
    // Try to inject knowledge context even for general queries
    let knowledgeCtx = '';
    if (typeof AnimeKnowledge !== 'undefined') {
        // Check if any known anime is mentioned in the query
        const words = query.toLowerCase();
        for (const key of AnimeKnowledge.getAllKeys()) {
            if (words.includes(key)) {
                const k = AnimeKnowledge.lookup(key);
                if (k) {
                    knowledgeCtx = AnimeKnowledge.buildKnowledgeContext(k);
                    break;
                }
            }
        }
    }
    const memoryCtx = userMemory.getContext();
    const messages = [
        { role: 'system', content: LLMRouter.ANIME_SYSTEM_PROMPT },
        { role: 'user', content: `${query}${memoryCtx ? '\n\nUser context:' + memoryCtx : ''}${knowledgeCtx}` }
    ];
    try {
        const result = await LLMRouter.chat(messages, { maxTokens: 1200, temperature: 0.7 });
        return result.content + `\n\n> 🤖 *AnimeSense Intelligence Engine*`;
    } catch (e) {
        return generateFallbackResponse(query);
    }
}

// ══════════ DATA-ONLY BUILDERS (fallback) ══════════

function buildEpisodeResponse(a) {
    return `## ${a.title}\n\n| Detail | Info |\n|---|---|\n| **Episodes** | ${a.episodes || 'Unknown (airing)'} |\n| **Status** | ${a.status} |\n| **Type** | ${a.type || 'TV'} |\n| **Aired** | ${a.aired?.string || 'Unknown'} |\n| **Studio** | ${(a.studios || []).map(s => s.name).join(', ') || 'Unknown'} |\n| **Score** | ⭐ ${a.score || 'N/A'}/10 |\n\n> 📺 *Live data from AnimeSense Data System*`;
}

function buildReleaseResponse(anime, all) {
    const airing = all.find(r => r.status === 'Currently Airing');
    const upcoming = all.find(r => r.status === 'Not yet aired');
    const a = airing || upcoming || anime;
    const statusIcon = airing ? '🟢 Currently Airing' : upcoming ? '🟡 Not Yet Aired' : a.status;
    return `## ${a.title}\n\n**Status:** ${statusIcon}\n**Episodes:** ${a.episodes || 'TBA'}\n**Aired:** ${a.aired?.string || 'TBA'}\n**Broadcast:** ${a.broadcast?.string || 'Check official sources'}\n**Studio:** ${(a.studios || []).map(s => s.name).join(', ') || 'Unknown'}\n**Score:** ⭐ ${a.score || 'N/A'}/10`;
}

async function buildFullDetailResponse(anime, existingChars) {
    const a = anime, studios = (a.studios || []).map(s => s.name).join(', ') || 'Unknown', genres = (a.genres || []).map(g => g.name).join(', ') || 'Unknown';
    let r = `## ${a.title}${a.title_japanese ? ' *(' + a.title_japanese + ')*' : ''}\n\n${(a.synopsis || 'No synopsis.').slice(0, 600)}\n\n### 📋 Key Details\n\n| Detail | Info |\n|---|---|\n| **Type** | ${a.type || 'TV'} |\n| **Episodes** | ${a.episodes || '?'} |\n| **Status** | ${a.status || '?'} |\n| **Aired** | ${a.aired?.string || '?'} |\n| **Studio** | ${studios} |\n| **Genres** | ${genres} |\n| **Score** | ⭐ ${a.score || 'N/A'}/10 |\n| **Rank** | #${a.rank || '?'} |\n\n`;

    // Parallel fetch: Community Reviews and Characters
    let revData = null;
    let charsData = existingChars;

    const promises = [];

    if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
        promises.push(
            FirebaseDB.getAnimeReviews(a.mal_id)
                .then(data => { revData = data; })
                .catch(e => console.warn('Could not fetch reviews:', e))
        );
    }

    if (!charsData) {
        promises.push(
            AnimeAPI.getAnimeCharacters(a.mal_id)
                .then(res => { charsData = res.data; })
                .catch(() => { })
        );
    }

    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }

    // Inject Community Reviews (v12)
    if (revData) {
        r += `### 💬 Community Reviews\n\n`;
        if (revData.count > 0) {
            r += `**Average Rating:** ⭐ ${revData.average}/5 (${revData.count} reviews)\n\n`;
            revData.top.forEach(rev => {
                r += `> **${rev.userName}** (⭐ ${rev.rating}/5): "${rev.reviewText}"\n\n`;
            });
        } else {
            r += `No reviews yet. Be the first to review **${a.title}**!\n\n`;
        }

        // Add review inline form
        r += `<div class="review-box" style="padding:10px; margin-top:10px; border-radius:8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
            <strong style="margin-bottom:8px; display:block; color:var(--primary-light);">Write a Review</strong>
            <div style="display:flex; gap:8px;">
                <input type="number" id="rating-${a.mal_id}" min="1" max="5" placeholder="1-5" style="width:60px; background: rgba(0,0,0,0.5); color:white; border:1px solid #444; padding:5px; border-radius:4px;" title="Rating (1-5)">
                <input type="text" id="reviewText-${a.mal_id}" placeholder="Short review..." style="flex:1; background: rgba(0,0,0,0.5); color:white; border:1px solid #444; padding:5px; border-radius:4px;">
                <button onclick="submitAnimeReview(${a.mal_id})" style="background:var(--primary); color:white; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Submit</button>
            </div>
        </div>\n\n`;
    }

    const chars = charsData;
    if (chars && chars.length > 0) {
        r += `### 👥 Characters\n\n`;
        r += chars.filter(c => c.role === 'Main').slice(0, 6).map(c => { const va = c.voice_actors?.find(v => v.language === 'Japanese'); return `- **${c.character.name}** (${c.role})${va ? ' — VA: ' + va.person?.name : ''}`; }).join('\n');
    }
    r += `\n\n> 🔗 *Live data from AnimeSense Data System*`;
    return r;
}

async function buildCharacterResponse(anime) {
    try {
        const d = await AnimeAPI.getAnimeCharacters(anime.mal_id);
        if (d.data && d.data.length > 0) {
            let r = `## ${anime.title} — Characters\n\n### 🌟 Main Characters\n\n`;
            r += d.data.filter(c => c.role === 'Main').slice(0, 8).map(c => { const va = c.voice_actors?.find(v => v.language === 'Japanese'); return `- **${c.character.name}**${va ? '\n  - 🎤 VA: **' + va.person?.name + '**' : ''}`; }).join('\n');
            const sup = d.data.filter(c => c.role === 'Supporting').slice(0, 6);
            if (sup.length) { r += `\n\n### 🎭 Supporting\n\n` + sup.map(c => `- **${c.character.name}**`).join('\n'); }
            r += `\n\n> 📊 ${d.data.length} characters total · AnimeSense Data System`;
            return r;
        }
    } catch (e) { }
    return `## ${anime.title}\n\nCouldn't fetch characters. Try again!`;
}

function buildWatchOrderFallback(anime, allResults) {
    const franchise = allResults.filter(r => r.title.toLowerCase().includes(anime.title.split(':')[0].split(' ')[0].toLowerCase())).sort((a, b) => (a.year || 9999) - (b.year || 9999));
    if (franchise.length > 1) {
        return `## ${anime.title} — Watch Order\n\n` + franchise.slice(0, 8).map((f, i) => `${i + 1}. **${f.title}** — ${f.type} | ${f.episodes || '?'} eps | ${f.year || '?'}`).join('\n') + `\n\n> 💡 Watch in **release order**.`;
    }
    return `## ${anime.title}\n\nStandalone series — ${anime.episodes || '?'} episodes. Start from Episode 1!`;
}

function buildTrendingFallback(data) {
    const list = data.map((a, i) => `${i + 1}. **${a.title}** — ⭐ ${a.score || 'N/A'}/10 | ${a.episodes || '?'} eps\n   - ${(a.genres || []).map(g => g.name).join(', ')}`).join('\n\n');
    return `## 🔥 Trending Anime\n\n${list}\n\n> 🔗 *AnimeSense Data System*`;
}

function generateGreeting() {
    const kbCount = (typeof AnimeKnowledge !== 'undefined') ? AnimeKnowledge.getCount() : 0;
    const graphStats = (typeof AnimeGraph !== 'undefined') ? AnimeGraph.getStats() : null;
    const graphInfo = graphStats ? ` **${graphStats.totalCharacters}** characters, **${graphStats.totalThemes}** themes, **${graphStats.totalEdges}** relationships` : '';
    return `## 👋 Hey there, anime fan!\n\nI'm **AnimeSense AI v10** — your expert anime companion powered by **live MyAnimeList data**, **${kbCount}-anime Knowledge Base**, **Knowledge Graph**,${graphInfo ? graphInfo + ',' : ''} **AI analysis**, and **smart entity detection**.\n\n**What I can do:**\n- 🔍 **Details** — "Tell me about Jujutsu Kaisen"\n- 🔎 **Identify** — "Anime where a boy eats a cursed finger" *(AI-powered!)*\n- 🎮 **Quiz** — "Anime quiz" *(test your knowledge!)*\n- 🎭 **Personality** — "Personality test" *(find your anime match!)*\n- 📋 **Watchlist** — "I watched Naruto" or "Show my watchlist"\n- ⚔️ **Power Arena** — "Goku vs Saitama" *(deep power scaling analysis!)*\n- 📺 **Seasons** — "Dandadan season 3" or "latest season"\n- 🎯 **Recommend** — "Recommend dark psychological anime" *(personalized!)*\n- 📖 **Endings** — "Explain the ending of Death Note" *(AI-powered!)*\n- 🔄 **Watch Order** — "Fate series watch order"\n- 🔥 **Trending** — "What's trending right now?"\n- 🧠 **Analysis** — "Analyze the themes of Evangelion"\n- 📚 **Knowledge** — Deep power system, arc, and theme knowledge for ${kbCount}+ anime\n- 📊 **Quiz Stats** — "Quiz stats" *(see your record!)*\n\n> 🧠 I **remember** your history, **track** your watchlist, **analyze battles**, and **auto-detect** characters, seasons, and titles!\n\nJust ask anything! ✨`;
}

function generateFallbackResponse() {
    return `Try asking me:\n\n- **"Tell me about [anime]"**\n- **"Explain the ending of [anime]"**\n- **"Recommend [genre] anime"**\n- **"Fate series watch order"**\n- **"What's trending?"**\n\n> All data from AnimeSense Knowledge System · AI analysis via AnimeSense Intelligence Engine`;
}

// ══════════ UI HELPERS ══════════

function appendMessage(role, content, animate = true) {
    const div = document.createElement('div');
    div.className = `message ${role} ${animate ? 'msg-type-in' : ''}`;
    div.innerHTML = `<div class="message-avatar">${role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-bolt"></i>'}</div><div class="message-content"><div class="message-sender">${role === 'user' ? 'You' : 'AnimeSense AI'}</div><div class="message-text">${formatMarkdown(content)}</div>${role === 'ai' ? '<div class="message-actions"><button class="message-action-btn" onclick="copyMessage(this)" title="Copy"><i class="fas fa-copy"></i> Copy</button></div>' : ''}</div>`;
    chatMessagesInner.appendChild(div); scrollToBottom();
}

function showLoading() {
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id; div.className = 'message ai ai-loading msg-type-in';
    div.innerHTML = `<div class="message-avatar pulse-glow"><i class="fas fa-bolt"></i></div><div class="message-content"><div class="message-sender">AnimeSense AI</div><div class="message-text"><div class="loading-dots"><span></span><span></span><span></span></div> Analyzing with AI...</div></div>`;
    chatMessagesInner.appendChild(div); scrollToBottom();
    return id;
}

function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }
function scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }

function copyMessage(btn) {
    const text = btn.closest('.message-content').querySelector('.message-text').textContent;
    navigator.clipboard.writeText(text);
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i> Copy', 2000);
}

function formatMarkdown(text) {
    text = text.replace(/\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)*)/g, (m, header, rows) => {
        const ths = header.split('|').map(h => h.trim()).filter(h => h).map(h => `<th>${h}</th>`).join('');
        const trs = rows.trim().split('\n').filter(r => r.trim()).map(row => `<tr>${row.split('|').map(c => c.trim()).filter(c => c).map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
        return `<table class="chat-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    });
    return text
        .replace(/^### (.*$)/gm, '<h4 class="chat-h4">$1</h4>')
        .replace(/^## (.*$)/gm, '<h3 class="chat-h3">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\d+\.\s(.*)$/gm, '<li>$1</li>')
        .replace(/^- (.*)$/gm, '<li>$1</li>')
        .replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>')
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--primary-light)">$1</a>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

// Review Submit Handler (Global)
window.submitAnimeReview = async function (malId) {
    if (typeof FirebaseDB === 'undefined' || !FirebaseDB.isReady()) {
        alert("Please login first to submit a review.");
        return;
    }
    const rInput = document.getElementById(`rating-${malId}`);
    const tInput = document.getElementById(`reviewText-${malId}`);
    const rating = parseInt(rInput.value, 10);
    const text = tInput.value.trim();
    if (!rating || rating < 1 || rating > 5) { alert("Please enter a valid rating 1-5."); return; }

    const btn = event.target;
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const success = await FirebaseDB.saveAnimeReview(malId, rating, text);
    if (success) {
        alert("Review submitted successfully! It will appear when you reload details.");
        rInput.value = ''; tInput.value = '';
    } else {
        alert("Failed to submit review. Please try again.");
    }
    btn.disabled = false;
    btn.innerHTML = oldHtml;
};
