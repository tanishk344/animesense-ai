/* ═══════════ ANIME DISCOVERY FEED v2 ═══════════ */
/* Loads on index.html — Trending, Top Rated, Hidden Gems, Upcoming & Genre Highlights */

const DiscoveryFeed = (() => {
    const API_BASE = 'https://api.jikan.moe/v4';
    const RATE_DELAY = 400; // ms between API calls (rate limit)

    // ── Helpers ──
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function createCardHTML(anime) {
        const score = anime.score || 'N/A';
        const img = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '/fallback.jpg';
        const synopsis = (anime.synopsis || 'No synopsis available.').slice(0, 120);
        const genres = (anime.genres || []).slice(0, 3);
        const studio = (anime.studios || []).map(s => s.name).join(', ') || 'Unknown';
        const eps = anime.episodes || '?';
        const type = anime.type || 'TV';
        const year = anime.year || anime.aired?.prop?.from?.year || '?';
        const title = anime.title || 'Unknown';

        return `
            <div class="discovery-card" onclick="window.location.href='/chat?q=Tell+me+about+${encodeURIComponent(title)}'" title="${title}">
                <div class="discovery-card-img-wrap">
                    <img class="discovery-card-img" src="${img}" alt="${title}" loading="lazy" onerror="this.src='/fallback.jpg'">
                    <span class="discovery-card-score"><i class="fas fa-star"></i> ${score}</span>
                    <span class="discovery-card-type">${type}</span>
                    <div class="discovery-card-gradient"></div>
                </div>
                <div class="discovery-card-body">
                    <div class="discovery-card-title">${title}</div>
                    <div class="discovery-card-meta">
                        <span><i class="fas fa-film"></i> ${eps} eps</span>
                        <span><i class="fas fa-calendar"></i> ${year}</span>
                        <span><i class="fas fa-building"></i> ${studio}</span>
                    </div>
                    <div class="discovery-card-synopsis">${synopsis}</div>
                    <div class="discovery-card-genres">
                        ${genres.map(g => `<span class="discovery-genre-tag">${g.name}</span>`).join('')}
                    </div>
                </div>
            </div>`;
    }

    function createSkeletonHTML(count = 6) {
        return Array(count).fill(`
            <div class="discovery-skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>`).join('');
    }

    // ── Section builder ──
    function buildSection(id, icon, iconClass, title, cta, ctaLink) {
        return `
            <div class="discovery-category" id="cat-${id}">
                <div class="category-header">
                    <div>
                        <h3><i class="fas fa-${icon} cat-icon-${iconClass}"></i> ${title}</h3>
                        <p class="section-explanation" id="${id}-explanation" style="font-size: 0.9em; color: var(--text-tertiary); margin-top: 4px; display: none;"></p>
                    </div>
                    <div class="category-scroll-btn">
                        <button onclick="DiscoveryFeed.scroll('${id}-scroll', -1)" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button>
                        <button onclick="DiscoveryFeed.scroll('${id}-scroll', 1)" aria-label="Scroll right"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <div class="discovery-scroll" id="${id}-scroll">${createSkeletonHTML(6)}</div>
                <a href="${ctaLink}" class="category-cta">${cta} <i class="fas fa-arrow-right"></i></a>
            </div>`;
    }

    // ── Local Cache ──
    function getCachedData(key) {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
    }

    function setCachedData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // ── Data Fetchers ──
    async function fetchWithRetry(url, retries = 2, delay = 1000) {
        try {
            await new Promise(res => setTimeout(res, delay)); // prevent rate limit
            const res = await fetch(url);
            const data = await res.json();
            
            console.log("Data loaded successfully");
            return data;
        } catch (err) {
            console.error("Failed to load data");
            
            if (retries > 0) {
                console.log(`Retrying... (${retries} left)`);
                return fetchWithRetry(url, retries - 1, delay * 2);
            }
            
            return { data: [] };
        }
    }

    async function getAnimeData(url, cacheKey) {
        const cached = getCachedData(cacheKey);

        if (cached) {
            console.log("Using cached data");
            return cached;
        }

        const data = await fetchWithRetry(url);

        if (data && data.data && data.data.length > 0) {
            setCachedData(cacheKey, data);
            return data;
        }

        return { data: [] };
    }

    async function fetchTrending() {
        const data = await getAnimeData(`${API_BASE}/seasons/now?limit=12`, 'cache_trending');
        return (data && data.data && data.data.length > 0) ? data.data : [];
    }

    async function fetchTopRated() {
        const data = await getAnimeData(`${API_BASE}/top/anime?limit=12`, 'cache_topRated');
        return (data && data.data && data.data.length > 0) ? data.data : [];
    }

    async function fetchHiddenGems() {
        const data = await getAnimeData(`${API_BASE}/top/anime?limit=25&filter=bypopularity&page=3`, 'cache_hiddenGems');
        if (!data || !data.data || data.data.length === 0) return [];
        const gems = data.data.filter(a =>
            a.score && a.score >= 7.5 &&
            a.popularity && a.popularity > 400
        ).slice(0, 12);
        return gems.length >= 4 ? gems : data.data.slice(0, 12);
    }

    async function fetchUpcoming() {
        const data = await getAnimeData(`${API_BASE}/seasons/upcoming?limit=12`, 'cache_upcoming');
        return (data && data.data && data.data.length > 0) ? data.data : [];
    }

    async function fetchByGenre(genreId, genreName) {
        const data = await getAnimeData(`${API_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=12`, `cache_genre_${genreId}`);
        return { name: genreName, data: (data && data.data && data.data.length > 0) ? data.data : [] };
    }

    // ── Scroll Controls ──
    function scrollRow(containerId, direction) {
        const el = document.getElementById(containerId);
        if (el) el.scrollBy({ left: direction * 260, behavior: 'smooth' });
    }

    // ── Genre picker (random from set) ──
    function pickGenres() {
        const allGenres = [
            { id: 1, name: 'Action' }, { id: 10, name: 'Fantasy' },
            { id: 24, name: 'Sci-Fi' }, { id: 8, name: 'Drama' },
            { id: 22, name: 'Romance' }, { id: 4, name: 'Comedy' },
            { id: 7, name: 'Mystery' }, { id: 14, name: 'Horror' },
            { id: 37, name: 'Supernatural' }, { id: 36, name: 'Slice of Life' },
            { id: 30, name: 'Sports' }, { id: 40, name: 'Psychological' }
        ];
        const shuffled = allGenres.sort(() => 0.5 - Math.random());
        return shuffled[0];
    }

    // ── Main Render ──
    async function init() {
        const container = document.getElementById('discoveryFeed');
        if (!container) return;

        // Render skeletons immediately without blocking
        requestAnimationFrame(() => {
            const genrePick = pickGenres();
            container.dataset.genreId = genrePick.id;
            container.dataset.genreName = genrePick.name;

            container.innerHTML =
                buildSection('recommended', 'magic', 'purple', 'Recommended For You', 'Refresh recommendations', 'javascript:DiscoveryFeed.refreshRecommendations()') +
                buildSection('trending', 'fire', 'fire', 'Trending Now', 'Browse all trending', '/search.html') +
                buildSection('top-rated', 'trophy', 'trophy', 'Top Rated of All Time', 'See full rankings', '/search.html') +
                buildSection('hidden-gems', 'gem', 'gem', 'Hidden Gems', 'Discover more gems', '/chat.html?q=Recommend+underrated+anime') +
                buildSection('upcoming', 'calendar-alt', 'calendar', 'Upcoming Anime', 'See all upcoming', '/chat.html?q=What+anime+is+upcoming') +
                buildSection('genre', 'star', 'star', `${genrePick.name} Highlights`, `More ${genrePick.name} anime`, `/chat.html?q=Recommend+${encodeURIComponent(genrePick.name)}+anime`);

            // Hide recommended initially
            const recSection = document.getElementById('cat-recommended');
            if (recSection) recSection.style.display = 'none';
        });

        // ── Auth initialization for Personalized Recs ──
        setTimeout(async () => {
            if (typeof FirebaseDB !== 'undefined' && FirebaseDB.isReady()) {
                await loadRecommendations();
            } else if (typeof FirebaseAuth !== 'undefined') {
                FirebaseAuth.onAuthStateChange(async (u) => {
                    const recSection = document.getElementById('cat-recommended');
                    if (u) await loadRecommendations();
                    else if (recSection) recSection.style.display = 'none';
                });
            }
        }, 800);

        // Define fetchers that use the cached AnimeAPI rather than straight raw fetch
        const renderData = (selector, data) => requestAnimationFrame(() => {
            const el = document.getElementById(selector);
            if (el) {
                el.innerHTML = ''; // Always clear skeleton before rendering

                const list = (data && data.length > 0) ? data : [];
                
                if (list.length > 0) {
                    el.innerHTML = list.map(createCardHTML).join('');
                } else {
                    el.innerHTML = `
                        <div class="empty-state">
                          <p>⚠️ Anime data is temporarily unavailable</p>
                          <button onclick="location.reload()">Retry</button>
                        </div>
                    `;
                }
            }
        });

        // Parallelize fetching
        try {
            console.time('[Perf] Discovery Load');

            const genreId = parseInt(container.dataset.genreId || '1');

            await Promise.allSettled([
                fetchTrending().then(d => renderData('trending-scroll', d)),
                fetchTopRated().then(d => renderData('top-rated-scroll', d)),
                fetchHiddenGems().then(d => renderData('hidden-gems-scroll', d)),
                fetchUpcoming().then(d => renderData('upcoming-scroll', d)),
                fetchByGenre(genreId, container.dataset.genreName || 'Action').then(res => renderData('genre-scroll', res.data))
            ]);

            console.timeEnd('[Perf] Discovery Load');
        } catch (e) {
            console.warn('[Discovery] Parallel fetch failed:', e);
        }
    }

    async function loadRecommendations() {
        const recSection = document.getElementById('cat-recommended');
        if (!recSection || typeof FirebaseDB === 'undefined') return;

        recSection.style.display = 'block';
        const el = document.getElementById('recommended-scroll');
        const expl = document.getElementById('recommended-explanation');
        if (el) el.innerHTML = createSkeletonHTML(5);

        try {
            const result = await FirebaseDB.generatePersonalizedRecommendations();
            if (result.recommendations && result.recommendations.length > 0) {
                el.innerHTML = result.recommendations.map(createCardHTML).join('');
                if (expl) {
                    expl.innerText = result.explanation;
                    expl.style.display = 'block';
                }
            } else {
                recSection.style.display = 'none';
            }
        } catch (e) {
            console.warn('[Discovery] Rec engine failed:', e);
            recSection.style.display = 'none';
        }
    }

    return { init, scroll: scrollRow, refreshRecommendations: loadRecommendations };
})();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    DiscoveryFeed.init();
});
