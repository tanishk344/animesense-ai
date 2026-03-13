/* AnimeSense AI — Search Page (Enhanced with Characters) */

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const trendingSection = document.getElementById('trendingSection');
const searchResultsSection = document.getElementById('searchResultsSection');
const trendingGrid = document.getElementById('trendingGrid');
const searchResultsGrid = document.getElementById('searchResultsGrid');
const resultsCount = document.getElementById('resultsCount');
const genreFilters = document.getElementById('genreFilters');
let activeGenre = 'all';

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadTrending();
    setupSearchHandlers();
});

function setupSearchHandlers() {
    let searchTimeout = null;

    // Add 300ms debounce for auto-search
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (searchInput.value.trim()) {
                performSearch();
            } else {
                // If cleared, go back to trending
                trendingSection.style.display = 'block';
                searchResultsSection.style.display = 'none';
            }
        }, 300);
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimeout);
            performSearch();
        }
    });

    genreFilters.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        genreFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeGenre = chip.dataset.genre;
        if (activeGenre !== 'all') {
            searchByGenre(activeGenre);
        } else {
            searchInput.value = '';
            trendingSection.style.display = 'block';
            searchResultsSection.style.display = 'none';
            loadTrending();
        }
    });
}

async function loadTrending() {
    try {
        const data = await AnimeAPI.getTopAnime(1, 20, 'airing');
        trendingGrid.innerHTML = data.data.map(a => createAnimeCard(a)).join('');
    } catch (e) {
        trendingGrid.innerHTML = '<p style="color:var(--text-tertiary);grid-column:1/-1;text-align:center;padding:var(--space-8)">Failed to load trending anime. Please try again.</p>';
    }
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    trendingSection.style.display = 'none';
    searchResultsSection.style.display = 'block';
    searchResultsGrid.innerHTML = Array(6).fill('<div class="skeleton skeleton-card"></div>').join('');
    try {
        const data = await AnimeAPI.searchAnime(query, 1, 24);
        resultsCount.textContent = `${data.pagination?.items?.total || data.data.length} results`;
        searchResultsGrid.innerHTML = data.data.length
            ? data.data.map(a => createAnimeCard(a)).join('')
            : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><i class="fas fa-search"></i></div><h3>No results found</h3><p>Try a different search term.</p></div>';
    } catch (e) {
        searchResultsGrid.innerHTML = '<p style="color:var(--anime-red);text-align:center;grid-column:1/-1;padding:var(--space-8)">Search failed. Please try again.</p>';
    }
}

async function searchByGenre(genreId) {
    trendingSection.style.display = 'none';
    searchResultsSection.style.display = 'block';
    searchResultsGrid.innerHTML = Array(6).fill('<div class="skeleton skeleton-card"></div>').join('');
    try {
        const data = await AnimeAPI.getAnimeByGenre(genreId, 1, 24);
        resultsCount.textContent = `${data.data.length} results`;
        searchResultsGrid.innerHTML = data.data.map(a => createAnimeCard(a)).join('');
    } catch (e) {
        searchResultsGrid.innerHTML = '<p style="color:var(--anime-red);text-align:center;grid-column:1/-1">Failed to load. Try again.</p>';
    }
}

function createAnimeCard(anime) {
    const img = anime.images?.jpg?.image_url || '';
    const score = anime.score || 'N/A';
    const scoreClass = score >= 8 ? 'score-high' : score >= 6 ? 'score-mid' : 'score-low';
    const genres = (anime.genres || []).slice(0, 3).map(g =>
        `<span class="badge badge-primary">${g.name}</span>`
    ).join('');

    return `
    <div class="anime-card" onclick="openAnimeDetail(${anime.mal_id})">
        <div style="position:relative">
            <img class="anime-card-image" src="${img}" alt="${escapeHtml(anime.title)}" loading="lazy" onerror="this.style.background='var(--surface-2)'">
            <div style="position:absolute;top:var(--space-3);right:var(--space-3)">
                <div class="score-circle ${scoreClass}">${score}</div>
            </div>
        </div>
        <div class="anime-card-body">
            <div class="anime-card-title">${escapeHtml(anime.title)}</div>
            <div class="anime-card-meta">
                <span><i class="fas fa-tv"></i> ${anime.type || 'TV'}</span>
                <span><i class="fas fa-film"></i> ${anime.episodes || '?'} eps</span>
                <span><i class="fas fa-calendar"></i> ${anime.year || '?'}</span>
            </div>
            <div class="anime-card-genres">${genres}</div>
        </div>
    </div>`;
}

async function openAnimeDetail(malId) {
    const overlay = document.getElementById('animeDetailOverlay');
    const detail = document.getElementById('animeDetail');
    overlay.classList.add('active');
    detail.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:var(--space-16)"><div class="loading-dots"><span></span><span></span><span></span></div></div>';

    try {
        // Fetch anime details and characters in parallel
        const [animeData, charData] = await Promise.all([
            AnimeAPI.getAnimeById(malId),
            AnimeAPI.getAnimeCharacters(malId)
        ]);

        const a = animeData.data;
        const inWL = WatchlistManager.isInWatchlist(a.mal_id);
        const genres = (a.genres || []).map(g => `<span class="badge badge-primary">${g.name}</span>`).join('');
        const themes = (a.themes || []).map(t => `<span class="badge badge-accent">${t.name}</span>`).join('');
        const studios = (a.studios || []).map(s => s.name).join(', ') || 'Unknown';

        // Build characters section
        let charactersHtml = '';
        if (charData.data && charData.data.length > 0) {
            const mainChars = charData.data.filter(c => c.role === 'Main').slice(0, 6);
            const supportChars = charData.data.filter(c => c.role === 'Supporting').slice(0, 4);

            if (mainChars.length > 0) {
                charactersHtml += `<h3 style="margin-top:var(--space-6)"><i class="fas fa-users" style="margin-right:var(--space-2);color:var(--primary-light)"></i>Main Characters</h3>`;
                charactersHtml += `<div class="characters-grid">`;
                charactersHtml += mainChars.map(c => {
                    const charImg = c.character?.images?.jpg?.image_url || '';
                    const va = c.voice_actors?.find(v => v.language === 'Japanese');
                    return `
                        <div class="character-card">
                            <img class="character-avatar" src="${charImg}" alt="${escapeHtml(c.character.name)}" loading="lazy" onerror="this.style.background='var(--surface-2)'">
                            <div class="character-info">
                                <div class="character-name">${escapeHtml(c.character.name)}</div>
                                <div class="character-role">${c.role}</div>
                                ${va ? `<div class="character-va"><i class="fas fa-microphone-alt"></i> ${escapeHtml(va.person?.name || 'Unknown')}</div>` : ''}
                            </div>
                        </div>`;
                }).join('');
                charactersHtml += `</div>`;
            }

            if (supportChars.length > 0) {
                charactersHtml += `<h3 style="margin-top:var(--space-6)">Supporting Characters</h3>`;
                charactersHtml += `<div class="characters-grid characters-grid-small">`;
                charactersHtml += supportChars.map(c => {
                    const charImg = c.character?.images?.jpg?.image_url || '';
                    return `
                        <div class="character-card character-card-small">
                            <img class="character-avatar character-avatar-small" src="${charImg}" alt="${escapeHtml(c.character.name)}" loading="lazy" onerror="this.style.background='var(--surface-2)'">
                            <div class="character-info">
                                <div class="character-name">${escapeHtml(c.character.name)}</div>
                                <div class="character-role">${c.role}</div>
                            </div>
                        </div>`;
                }).join('');
                charactersHtml += `</div>`;
            }
        }

        detail.innerHTML = `
            <div class="anime-detail-header">
                <img class="anime-detail-poster" src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || ''}" alt="${escapeHtml(a.title)}">
                <div class="anime-detail-info">
                    <h2>${escapeHtml(a.title)}</h2>
                    ${a.title_japanese ? `<p style="color:var(--text-tertiary);font-size:var(--fs-sm);margin-bottom:var(--space-3)">${escapeHtml(a.title_japanese)}</p>` : ''}
                    <div class="anime-detail-meta">${genres} ${themes}</div>
                    <div style="display:flex;gap:var(--space-3);align-items:center;margin-bottom:var(--space-4)">
                        <div class="score-circle ${(a.score || 0) >= 8 ? 'score-high' : (a.score || 0) >= 6 ? 'score-mid' : 'score-low'}">${a.score || 'N/A'}</div>
                        <div><div style="font-weight:600">${a.scored_by?.toLocaleString() || '?'} ratings</div><div style="font-size:var(--fs-xs);color:var(--text-tertiary)">Rank #${a.rank || '?'} | Popularity #${a.popularity || '?'}</div></div>
                    </div>
                    <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
                        <button class="btn ${inWL ? 'btn-glass' : 'btn-primary'} btn-sm" onclick="toggleWatchlistFromDetail(${a.mal_id}, this)" id="wlBtn-${a.mal_id}">
                            <i class="fas ${inWL ? 'fa-check' : 'fa-plus'}"></i> ${inWL ? 'In Watchlist' : 'Add to Watchlist'}
                        </button>
                        <a href="chat.html?q=Tell+me+about+${encodeURIComponent(a.title)}" class="btn btn-glass btn-sm"><i class="fas fa-robot"></i> Ask AI</a>
                    </div>
                </div>
            </div>
            <div class="anime-detail-body">
                <h3>Synopsis</h3>
                <p>${a.synopsis || 'No synopsis available.'}</p>

                <h3>Details</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);font-size:var(--fs-sm)">
                    <div><strong>Type:</strong> ${a.type || 'Unknown'}</div>
                    <div><strong>Episodes:</strong> ${a.episodes || '?'}</div>
                    <div><strong>Status:</strong> ${a.status || 'Unknown'}</div>
                    <div><strong>Aired:</strong> ${a.aired?.string || 'Unknown'}</div>
                    <div><strong>Studio:</strong> ${studios}</div>
                    <div><strong>Source:</strong> ${a.source || 'Unknown'}</div>
                    <div><strong>Duration:</strong> ${a.duration || 'Unknown'}</div>
                    <div><strong>Rating:</strong> ${a.rating || 'Unknown'}</div>
                </div>

                ${charactersHtml}

                ${a.background ? `<h3 style="margin-top:var(--space-6)">Background</h3><p>${a.background}</p>` : ''}

                <div class="detail-api-badge">
                    <i class="fas fa-database"></i> Live data from AnimeSense Knowledge System
                </div>
            </div>
        `;
    } catch (e) {
        detail.innerHTML = '<div style="padding:var(--space-8);text-align:center"><p style="color:var(--anime-red)">Failed to load anime details.</p><button class="btn btn-glass btn-sm" onclick="closeAnimeDetail()">Close</button></div>';
    }
}

function closeAnimeDetail(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('animeDetailOverlay').classList.remove('active');
}

function toggleWatchlistFromDetail(malId, btn) {
    if (WatchlistManager.isInWatchlist(malId)) {
        WatchlistManager.remove(malId);
        btn.innerHTML = '<i class="fas fa-plus"></i> Add to Watchlist';
        btn.className = 'btn btn-primary btn-sm';
        showToast('Removed', 'Anime removed from watchlist.', 'info');
    } else {
        AnimeAPI.getAnimeById(malId).then(data => {
            WatchlistManager.add(data.data, 'plan-to-watch');
            btn.innerHTML = '<i class="fas fa-check"></i> In Watchlist';
            btn.className = 'btn btn-glass btn-sm';
            showToast('Added!', 'Anime added to your watchlist.', 'success');
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAnimeDetail({ target: document.getElementById('animeDetailOverlay'), currentTarget: document.getElementById('animeDetailOverlay') });
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); searchInput.focus(); }
});
