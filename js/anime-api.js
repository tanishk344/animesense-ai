/* AnimeSense AI — Anime API Service (Jikan v4) */

const AnimeAPI = {
    BASE_URL: 'https://api.jikan.moe/v4',
    cache: new Map(),
    popularAnimeCache: new Map(), // Stores top 200 explicitly
    lastCacheRefresh: 0,
    queue: [],
    isProcessingQueue: false,
    lastRequest: 0,
    RATE_LIMIT: 400, // Safe delay between requests

    async _fetch(endpoint, useSessionCache = false) {
        const cacheKey = `jikan_${endpoint}`;
        const CACHE_TIME = 60 * 60 * 1000; // 1 hour cache

        // 1. Check local memory cache
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        // 2. Check Storage cache
        const storage = useSessionCache ? sessionStorage : localStorage;
        try {
            const cached = storage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < CACHE_TIME) {
                    this.cache.set(cacheKey, parsed.data);
                    return parsed.data;
                }
            }
        } catch (e) { /* Ignore parsing/quota errors */ }

        // 3. Queue the request to avoid bursts
        return new Promise((resolve, reject) => {
            this.queue.push({ endpoint, useSessionCache, cacheKey, resolve, reject });
            this._processQueue();
        });
    },

    async _processQueue() {
        if (this.isProcessingQueue || this.queue.length === 0) return;
        this.isProcessingQueue = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const wait = this.RATE_LIMIT - (now - this.lastRequest);
            if (wait > 0) await new Promise(r => setTimeout(r, wait));

            const task = this.queue.shift();
            this.lastRequest = Date.now();

            const t0 = performance.now();
            try {
                const res = await fetch(`${this.BASE_URL}${task.endpoint}`);
                if (res.status === 429) {
                    await new Promise(r => setTimeout(r, 1500));
                    this.queue.unshift(task); // Req retry
                    continue;
                }
                if (!res.ok) throw new Error(`API Error: ${res.status}`);

                const data = await res.json();
                const t1 = performance.now();
                console.log(`[Perf] AnimeSense Data System: ${task.endpoint} - ${(t1 - t0).toFixed(2)}ms`);

                this.cache.set(task.cacheKey, data);
                try {
                    const storage = task.useSessionCache ? sessionStorage : localStorage;
                    storage.setItem(task.cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
                } catch (e) {
                    if (e.name === 'QuotaExceededError') {
                        if (task.useSessionCache) sessionStorage.clear();
                        else localStorage.clear();
                    }
                }
                setTimeout(() => this.cache.delete(task.cacheKey), 60 * 60 * 1000); // 1 hr

                task.resolve(data);
            } catch (err) {
                console.error('AnimeAPI Error:', err);
                task.reject(err);
            }
        }
        this.isProcessingQueue = false;
    },

    // End of queue processor

    // ══════════ POPULAR ANIME CACHE SYSTEM ══════════
    async initPopularCache() {
        const CACHE_LIFESPAN = 6 * 60 * 60 * 1000; // 6 hours
        const forceRefresh = (Date.now() - this.lastCacheRefresh) > CACHE_LIFESPAN;

        // Attempt to load from localStorage first if not forced
        if (!forceRefresh) {
            try {
                const stored = localStorage.getItem('animesense_popular_cache');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if ((Date.now() - parsed.timestamp) < CACHE_LIFESPAN) {
                        this.popularAnimeCache = new Map(parsed.data);
                        this.lastCacheRefresh = parsed.timestamp;
                        console.log(`[Cache] Loaded ${this.popularAnimeCache.size} popular anime from memory`);
                        return;
                    }
                }
            } catch (e) { }
        }

        console.log(`[Cache] Fetching Top 200 Anime for Memory Cache...`);
        let allAnime = [];
        try {
            // Fetch 8 pages of 25 = 200 top anime
            for (let page = 1; page <= 8; page++) {
                const res = await this._fetch(`/top/anime?page=${page}&limit=25`, true);
                if (res && res.data) {
                    allAnime = allAnime.concat(res.data);
                }
            }

            // Map structure
            allAnime.forEach(anime => {
                const titleKey = anime.title.toLowerCase();
                const engKey = anime.title_english ? anime.title_english.toLowerCase() : null;

                const cachedObject = {
                    title: anime.title,
                    episodes: anime.episodes,
                    score: anime.score,
                    studios: anime.studios, // Object array
                    aired: anime.aired,
                    type: anime.type,
                    status: anime.status,
                    genres: anime.genres,
                    images: anime.images,
                    synopsis: anime.synopsis,
                    mal_id: anime.mal_id,
                    main_characters: [] // Fetched dynamically when needed
                };

                this.popularAnimeCache.set(titleKey, cachedObject);
                if (engKey && engKey !== titleKey) this.popularAnimeCache.set(engKey, cachedObject);
            });

            this.lastCacheRefresh = Date.now();
            localStorage.setItem('animesense_popular_cache', JSON.stringify({
                timestamp: this.lastCacheRefresh,
                data: Array.from(this.popularAnimeCache.entries())
            }));
            console.log(`[Cache] Top 200 caching complete. Indexed ${this.popularAnimeCache.size} keys.`);

        } catch (e) { console.warn('[Cache] Failed to hydrate popular anime cache', e); }
    },

    async _dynamicallyCacheCharacters(titleKey, animeId) {
        try {
            const charRes = await this.getAnimeCharacters(animeId);
            const mainChars = (charRes.data || []).filter(c => c.role === 'Main').map(c => c.character.name);
            const cached = this.popularAnimeCache.get(titleKey);
            if (cached) {
                cached.main_characters = mainChars;
                this.popularAnimeCache.set(titleKey, cached);
                // Resave
                localStorage.setItem('animesense_popular_cache', JSON.stringify({
                    timestamp: this.lastCacheRefresh,
                    data: Array.from(this.popularAnimeCache.entries())
                }));
            }
        } catch (e) { }
    },

    async searchAnime(query, page = 1, limit = 20) {
        const q = query.toLowerCase();

        // Check Popular Cache First
        if (page === 1 && this.popularAnimeCache.has(q)) {
            console.log(`[Cache Hit] Instant retrieval for: ${query}`);
            const cachedItem = this.popularAnimeCache.get(q);

            // Dynamically fetch and background-cache characters if we haven't yet
            if (!cachedItem.main_characters || cachedItem.main_characters.length === 0) {
                this._dynamicallyCacheCharacters(q, cachedItem.mal_id);
            }

            return { data: [cachedItem] };
        }

        console.log(`[Cache Miss] Falling back to remote API for: ${query}`);
        const encodedQ = encodeURIComponent(query);
        const result = await this._fetch(`/anime?q=${encodedQ}&page=${page}&limit=${limit}&sfw=true`, true); // use sessionStorage

        // Dynamically store the remote hit in our popular cache for next time
        if (result && result.data && result.data.length > 0) {
            const firstHit = result.data[0];
            const titleKey = firstHit.title.toLowerCase();
            if (!this.popularAnimeCache.has(titleKey)) {
                firstHit.main_characters = []; // Init
                this.popularAnimeCache.set(titleKey, firstHit);
                this._dynamicallyCacheCharacters(titleKey, firstHit.mal_id);
            }
        }

        return result;
    },

    async getAnimeById(id) {
        return this._fetch(`/anime/${id}/full`, false); // use localStorage
    },

    async getTopAnime(page = 1, limit = 20, filter = 'airing') {
        return this._fetch(`/top/anime?page=${page}&limit=${limit}&filter=${filter}`);
    },

    async getAnimeByGenre(genreId, page = 1, limit = 20) {
        return this._fetch(`/anime?genres=${genreId}&page=${page}&limit=${limit}&sfw=true&order_by=popularity&sort=asc`);
    },

    async getAnimeCharacters(id) {
        return this._fetch(`/anime/${id}/characters`);
    },

    async getAnimeRecommendations(id) {
        return this._fetch(`/anime/${id}/recommendations`);
    },

    async getSeasonNow(page = 1, limit = 20) {
        return this._fetch(`/seasons/now?page=${page}&limit=${limit}`);
    },

    async getSeasonUpcoming(page = 1, limit = 20) {
        return this._fetch(`/seasons/upcoming?page=${page}&limit=${limit}`);
    },

    async getRandomAnime() {
        return this._fetch('/random/anime');
    }
};

/* Watchlist Manager (localStorage) */
const WatchlistManager = {
    STORAGE_KEY: 'animesense_watchlist',

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch { return []; }
    },

    save(list) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    },

    add(anime, status = 'plan-to-watch') {
        const list = this.getAll();
        if (list.find(a => a.mal_id === anime.mal_id)) return false;
        list.push({
            mal_id: anime.mal_id,
            title: anime.title,
            image: anime.images?.jpg?.image_url || '',
            episodes: anime.episodes || '?',
            score: anime.score || 'N/A',
            type: anime.type || 'TV',
            status: status,
            progress: 0,
            addedAt: new Date().toISOString()
        });
        this.save(list);
        return true;
    },

    remove(malId) {
        const list = this.getAll().filter(a => a.mal_id !== malId);
        this.save(list);
    },

    updateStatus(malId, status) {
        const list = this.getAll();
        const item = list.find(a => a.mal_id === malId);
        if (item) {
            item.status = status;
            if (status === 'completed') item.progress = item.episodes;
            this.save(list);
        }
    },

    updateProgress(malId, progress) {
        const list = this.getAll();
        const item = list.find(a => a.mal_id === malId);
        if (item) {
            item.progress = progress;
            this.save(list);
        }
    },

    isInWatchlist(malId) {
        return this.getAll().some(a => a.mal_id === malId);
    },

    getByStatus(status) {
        if (status === 'all') return this.getAll();
        return this.getAll().filter(a => a.status === status);
    },

    getStats() {
        const list = this.getAll();
        return {
            total: list.length,
            watching: list.filter(a => a.status === 'watching').length,
            completed: list.filter(a => a.status === 'completed').length,
            planned: list.filter(a => a.status === 'plan-to-watch').length,
            dropped: list.filter(a => a.status === 'dropped').length
        };
    }
};

/* Chat History Manager */
const ChatHistoryManager = {
    STORAGE_KEY: 'animesense_chats',

    getAll() {
        try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || []; }
        catch { return []; }
    },

    save(chats) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chats));
    },

    create(title) {
        const chats = this.getAll();
        const chat = { id: Date.now().toString(), title, messages: [], createdAt: new Date().toISOString() };
        chats.unshift(chat);
        this.save(chats);
        return chat;
    },

    addMessage(chatId, role, content) {
        const chats = this.getAll();
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.messages.push({ role, content, timestamp: new Date().toISOString() });
            this.save(chats);
        }
    },

    getChat(chatId) {
        return this.getAll().find(c => c.id === chatId);
    },

    deleteChat(chatId) {
        const chats = this.getAll().filter(c => c.id !== chatId);
        this.save(chats);
    }
};

/* Toast helper */
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Initialize AnimeSense Analytics Cache Array
document.addEventListener('DOMContentLoaded', () => {
    if (typeof AnimeAPI !== 'undefined' && typeof AnimeAPI.initPopularCache === 'function') {
        AnimeAPI.initPopularCache();
    }
});
