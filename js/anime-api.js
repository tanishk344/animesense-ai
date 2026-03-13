/* AnimeSense AI — Anime API Service (Jikan v4) */

const AnimeAPI = {
    BASE_URL: 'https://api.jikan.moe/v4',
    cache: new Map(),
    lastRequest: 0,
    RATE_LIMIT: 400,

    async _fetch(endpoint, useSessionCache = false) {
        const cacheKey = `jikan_${endpoint}`;
        const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

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

        // 3. Rate limiting
        const now = Date.now();
        const wait = this.RATE_LIMIT - (now - this.lastRequest);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        this.lastRequest = Date.now();

        // 4. Performance Logging
        const t0 = performance.now();

        try {
            const res = await fetch(`${this.BASE_URL}${endpoint}`);
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 1500));
                return this._fetch(endpoint, useSessionCache);
            }
            if (!res.ok) throw new Error(`API Error: ${res.status}`);

            const data = await res.json();

            const t1 = performance.now();
            console.log(`[Perf] AnimeSense Data System: ${endpoint} - ${(t1 - t0).toFixed(2)}ms`);

            // 5. Save to caches (strip unnecessary pagination data if it's large, but let's keep it safe)
            this.cache.set(cacheKey, data);
            try {
                storage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
            } catch (e) {
                // If quota exceeded, clear some storage
                if (e.name === 'QuotaExceededError') {
                    if (useSessionCache) sessionStorage.clear();
                    else localStorage.clear();
                }
            }

            setTimeout(() => this.cache.delete(cacheKey), CACHE_TIME);
            return data;
        } catch (err) {
            console.error('AnimeAPI Error:', err);
            throw err;
        }
    },

    async searchAnime(query, page = 1, limit = 20) {
        const q = encodeURIComponent(query);
        return this._fetch(`/anime?q=${q}&page=${page}&limit=${limit}&sfw=true`, true); // use sessionStorage
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
