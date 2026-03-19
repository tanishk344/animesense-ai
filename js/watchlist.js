/* AnimeSense AI — Watchlist Page */

const watchlistGrid = document.getElementById('watchlistGrid');
const emptyState = document.getElementById('emptyState');
const watchlistTabs = document.getElementById('watchlistTabs');
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    renderWatchlist();
    setupTabs();
});

function setupTabs() {
    watchlistTabs.addEventListener('click', e => {
        const tab = e.target.closest('.wl-tab');
        if (!tab) return;
        watchlistTabs.querySelectorAll('.wl-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderWatchlist();
    });
}

function renderWatchlist() {
    updateStats();
    const items = WatchlistManager.getByStatus(currentFilter);

    if (items.length === 0) {
        watchlistGrid.style.display = 'none';
        emptyState.style.display = 'flex';
        emptyState.querySelector('h3').textContent = currentFilter === 'all'
            ? 'Your watchlist is empty'
            : `No anime in "${currentFilter.replace(/-/g, ' ')}"`;
        return;
    }

    emptyState.style.display = 'none';
    watchlistGrid.style.display = 'grid';
    watchlistGrid.innerHTML = items.map(a => createWatchlistCard(a)).join('');
}

function updateStats() {
    const stats = WatchlistManager.getStats();
    document.getElementById('watchingCount').textContent = stats.watching;
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('plannedCount').textContent = stats.planned;
    document.getElementById('totalCount').textContent = stats.total;
}

function createWatchlistCard(anime) {
    const progress = anime.progress || 0;
    const total = anime.episodes === '?' ? 0 : parseInt(anime.episodes) || 0;
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
    const statusLabel = anime.status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return `
    <div class="wl-card">
        <img class="wl-card-poster" src="${anime.image}" alt="${escapeHtml(anime.title)}" loading="lazy" onerror="this.src='fallback.jpg'">
        <div class="wl-card-gradient"></div>
        <div class="wl-card-info">
            <div class="wl-card-title" title="${escapeHtml(anime.title)}">${escapeHtml(anime.title)}</div>
            <div class="wl-card-meta">${anime.type} • ${anime.episodes} episodes • ⭐ ${anime.score}</div>
            <span class="wl-status-badge ${anime.status}">${statusLabel}</span>
            <div class="wl-progress">
                <div class="wl-progress-text">Progress: ${progress}/${total || '?'} episodes</div>
                <div class="wl-progress-bar"><div class="wl-progress-fill" style="width:${pct}%"></div></div>
            </div>
            <div class="wl-card-actions">
                ${anime.status !== 'completed' ? `<button class="wl-action-btn" onclick="incrementProgress(${anime.mal_id})" title="Watch next episode"><i class="fas fa-plus"></i> +1 Ep</button>` : ''}
                <select class="wl-action-btn" onchange="changeStatus(${anime.mal_id}, this.value)" style="cursor:pointer;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px 4px;color:var(--text-secondary)">
                    <option value="watching" ${anime.status === 'watching' ? 'selected' : ''}>Watching</option>
                    <option value="completed" ${anime.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="plan-to-watch" ${anime.status === 'plan-to-watch' ? 'selected' : ''}>Plan to Watch</option>
                    <option value="dropped" ${anime.status === 'dropped' ? 'selected' : ''}>Dropped</option>
                </select>
                <button class="wl-action-btn" onclick="removeFromWatchlist(${anime.mal_id})" title="Remove" style="color:var(--anime-red)"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    </div>`;
}

function incrementProgress(malId) {
    const list = WatchlistManager.getAll();
    const item = list.find(a => a.mal_id === malId);
    if (!item) return;
    const total = item.episodes === '?' ? Infinity : parseInt(item.episodes) || Infinity;
    if (item.progress < total) {
        WatchlistManager.updateProgress(malId, item.progress + 1);
        if (item.progress + 1 >= total && total !== Infinity) {
            WatchlistManager.updateStatus(malId, 'completed');
            showToast('Completed! 🎉', `You finished watching ${item.title}!`, 'success');
        }
    }
    renderWatchlist();
}

function changeStatus(malId, status) {
    WatchlistManager.updateStatus(malId, status);
    renderWatchlist();
    showToast('Updated', 'Status updated successfully.', 'info');
}

function removeFromWatchlist(malId) {
    WatchlistManager.remove(malId);
    renderWatchlist();
    showToast('Removed', 'Anime removed from watchlist.', 'info');
}

function exportWatchlist() {
    const list = WatchlistManager.getAll();
    if (list.length === 0) {
        showToast('Empty', 'Nothing to export yet.', 'info');
        return;
    }
    const csv = 'Title,Status,Progress,Episodes,Score,Type\n' +
        list.map(a => `"${a.title}","${a.status}",${a.progress},"${a.episodes}","${a.score}","${a.type}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'animesense_watchlist.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported!', 'Watchlist downloaded as CSV.', 'success');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
