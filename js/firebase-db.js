/* ═══════════ AnimeSense AI — Firebase Cloud Firestore Database Module ═══════════ */
/* Syncs user data (watchlist, quiz scores, battle history, genres) to Firestore  */

const FirebaseDB = (() => {
    let db = null;
    let _uid = null;
    let _profileCache = null;
    let _initialized = false;

    // ═══════════ INITIALIZATION ═══════════
    function init() {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
                console.warn('[FirebaseDB] Firebase app not initialized yet');
                return false;
            }
            db = firebase.firestore();
            _initialized = true;

            // Listen for auth state changes to auto-create profile
            if (typeof FirebaseAuth !== 'undefined') {
                FirebaseAuth.onAuthStateChange(async (user) => {
                    if (user) {
                        _uid = user.uid;
                        await ensureUserProfile(user);
                    } else {
                        _uid = null;
                        _profileCache = null;
                    }
                });
            }

            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    // ═══════════ HELPER: Get current UID ═══════════
    function getUID() {
        if (_uid) return _uid;
        if (typeof FirebaseAuth !== 'undefined') {
            const user = FirebaseAuth.getCurrentUser();
            if (user) { _uid = user.uid; return _uid; }
        }
        return null;
    }

    // ═══════════ HELPER: Get user doc reference ═══════════
    function getUserDoc() {
        const uid = getUID();
        if (!db || !uid) return null;
        return db.collection('users').doc(uid);
    }

    // ═══════════ AUTO-CREATE USER PROFILE ═══════════
    async function ensureUserProfile(user) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return null;

            const doc = await docRef.get();
            if (doc.exists) {
                _profileCache = doc.data();
                return _profileCache;
            }

            // Create new profile
            const profile = {
                email: user.email || '',
                displayName: user.displayName || user.email?.split('@')[0] || 'Anime Fan',
                photoURL: user.photoURL || null,
                watchlist: [],
                favoriteGenres: [],
                quizScore: 0,
                quizTotal: 0,
                quizBestStreak: 0,
                battleHistory: [],
                searchedAnime: [],
                personalityResult: null,
                tasteProfile: {
                    favoriteGenres: [],
                    favoriteThemes: [],
                    searchHistory: [],
                    recommendationScore: {}
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            };

            await docRef.set(profile);
            _profileCache = profile;
            return profile;
        } catch (err) {
            console.error("Failed to load data");
            return null;
        }
    }

    // ═══════════ GET USER PROFILE ═══════════
    async function getUserProfile() {
        try {
            if (_profileCache) return _profileCache;
            const docRef = getUserDoc();
            if (!docRef) return null;
            const doc = await docRef.get();
            if (doc.exists) {
                let data = doc.data();
                if (!data.tasteProfile) {
                    data.tasteProfile = {
                        favoriteGenres: [],
                        favoriteThemes: [],
                        searchHistory: [],
                        recommendationScore: {}
                    };
                    docRef.update({ tasteProfile: data.tasteProfile }).catch(e => console.warn(e));
                }
                _profileCache = data;
                return _profileCache;
            }
            return null;
        } catch (err) {
            console.error("Failed to load data");
            return null;
        }
    }

    // ═══════════ UPDATE LAST ACTIVE ═══════════
    async function updateLastActive() {
        try {
            const docRef = getUserDoc();
            if (!docRef) return;
            await docRef.update({
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) { /* silent */ }
    }

    // ═══════════════════════════════════════════
    //  WATCHLIST FUNCTIONS
    // ═══════════════════════════════════════════

    async function addToWatchlist(animeData) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return { success: false, error: 'Not logged in' };

            // Normalize anime data for storage
            const entry = {
                mal_id: animeData.mal_id || null,
                title: animeData.title || 'Unknown',
                score: animeData.score || null,
                episodes: animeData.episodes || null,
                genres: (animeData.genres || []).map(g => typeof g === 'string' ? g : g.name),
                image: animeData.images?.jpg?.image_url || animeData.image || '',
                type: animeData.type || 'TV',
                status: animeData.status || 'Unknown',
                addedAt: new Date().toISOString()
            };

            // Check for duplicates
            const profile = await getUserProfile();
            if (profile && profile.watchlist) {
                const exists = profile.watchlist.some(a =>
                    (a.mal_id && a.mal_id === entry.mal_id) ||
                    a.title.toLowerCase() === entry.title.toLowerCase()
                );
                if (exists) return { success: false, error: 'already_exists' };
            }

            await docRef.update({
                watchlist: firebase.firestore.FieldValue.arrayUnion(entry),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update cache
            if (_profileCache) {
                if (!_profileCache.watchlist) _profileCache.watchlist = [];
                _profileCache.watchlist.push(entry);
            }

            // Also sync genres and taste profile
            if (entry.genres.length > 0) {
                await addFavoriteGenres(entry.genres);
                await updateTasteProfile('genre', { genres: entry.genres });
            }

            return { success: true, entry };
        } catch (err) {
            console.error("Failed to load data");
            return { success: false, error: err.message };
        }
    }

    async function removeFromWatchlist(malId) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return false;

            const profile = await getUserProfile();
            if (!profile || !profile.watchlist) return false;

            const updated = profile.watchlist.filter(a => a.mal_id !== malId);
            await docRef.update({ watchlist: updated });

            if (_profileCache) _profileCache.watchlist = updated;
            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    async function getWatchlist() {
        try {
            const profile = await getUserProfile();
            return (profile && profile.watchlist) ? profile.watchlist : [];
        } catch (err) {
            console.error("Failed to load data");
            return [];
        }
    }

    async function isInWatchlist(title) {
        try {
            const watchlist = await getWatchlist();
            return watchlist.some(a => a.title.toLowerCase() === title.toLowerCase());
        } catch (err) {
            return false;
        }
    }

    // ═══════════════════════════════════════════
    //  QUIZ SCORE FUNCTIONS
    // ═══════════════════════════════════════════

    async function saveQuizScore(scoreData) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return false;

            const updateData = {
                quizScore: firebase.firestore.FieldValue.increment(scoreData.correct ? 1 : 0),
                quizTotal: firebase.firestore.FieldValue.increment(1),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Update best streak if provided
            if (scoreData.streak) {
                const profile = await getUserProfile();
                if (profile && (scoreData.streak > (profile.quizBestStreak || 0))) {
                    updateData.quizBestStreak = scoreData.streak;
                }
            }

            await docRef.update(updateData);

            // Update cache
            if (_profileCache) {
                if (scoreData.correct) _profileCache.quizScore = (_profileCache.quizScore || 0) + 1;
                _profileCache.quizTotal = (_profileCache.quizTotal || 0) + 1;
                if (scoreData.streak && scoreData.streak > (_profileCache.quizBestStreak || 0)) {
                    _profileCache.quizBestStreak = scoreData.streak;
                }
            }

            // Update taste (general quiz interaction)
            await updateTasteProfile('quiz', { tags: ['Trivia'] });

            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    async function getQuizStats() {
        try {
            const profile = await getUserProfile();
            if (!profile) return { score: 0, total: 0, bestStreak: 0 };
            return {
                score: profile.quizScore || 0,
                total: profile.quizTotal || 0,
                bestStreak: profile.quizBestStreak || 0
            };
        } catch (err) {
            return { score: 0, total: 0, bestStreak: 0 };
        }
    }

    // ═══════════════════════════════════════════
    //  BATTLE HISTORY FUNCTIONS
    // ═══════════════════════════════════════════

    async function saveBattleHistory(battleData) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return false;

            const entry = {
                fighter1: battleData.fighter1 || 'Unknown',
                fighter2: battleData.fighter2 || 'Unknown',
                anime1: battleData.anime1 || '',
                anime2: battleData.anime2 || '',
                timestamp: new Date().toISOString()
            };

            await docRef.update({
                battleHistory: firebase.firestore.FieldValue.arrayUnion(entry),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update cache (keep last 50)
            if (_profileCache) {
                if (!_profileCache.battleHistory) _profileCache.battleHistory = [];
                _profileCache.battleHistory.push(entry);
                if (_profileCache.battleHistory.length > 50) {
                    _profileCache.battleHistory = _profileCache.battleHistory.slice(-50);
                }
            }

            // Update taste for battles
            await updateTasteProfile('battle', { tags: ['Action', 'Battle'] });

            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    async function getBattleHistory() {
        try {
            const profile = await getUserProfile();
            return (profile && profile.battleHistory) ? profile.battleHistory : [];
        } catch (err) {
            return [];
        }
    }

    // ═══════════════════════════════════════════
    //  FAVORITE GENRES FUNCTIONS
    // ═══════════════════════════════════════════

    async function addFavoriteGenres(genres) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return false;

            const genreArray = Array.isArray(genres) ? genres : [genres];
            const cleanGenres = genreArray.filter(g => g && typeof g === 'string');

            if (cleanGenres.length === 0) return false;

            // Firestore arrayUnion handles dedup automatically
            await docRef.update({
                favoriteGenres: firebase.firestore.FieldValue.arrayUnion(...cleanGenres)
            });

            // Update cache
            if (_profileCache) {
                if (!_profileCache.favoriteGenres) _profileCache.favoriteGenres = [];
                cleanGenres.forEach(g => {
                    if (!_profileCache.favoriteGenres.includes(g)) {
                        _profileCache.favoriteGenres.push(g);
                    }
                });
            }

            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    async function getFavoriteGenres() {
        try {
            const profile = await getUserProfile();
            return (profile && profile.favoriteGenres) ? profile.favoriteGenres : [];
        } catch (err) {
            return [];
        }
    }

    // ═══════════════════════════════════════════
    //  SEARCHED ANIME TRACKING
    // ═══════════════════════════════════════════

    async function trackSearchedAnime(title) {
        try {
            const docRef = getUserDoc();
            if (!docRef || !title) return false;

            await docRef.update({
                searchedAnime: firebase.firestore.FieldValue.arrayUnion(title),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (_profileCache) {
                if (!_profileCache.searchedAnime) _profileCache.searchedAnime = [];
                if (!_profileCache.searchedAnime.includes(title)) {
                    _profileCache.searchedAnime.push(title);
                }
            }

            // Update taste profile
            await updateTasteProfile('search', { title: title });

            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    // ═══════════════════════════════════════════
    //  PERSONALITY TEST RESULT
    // ═══════════════════════════════════════════

    async function savePersonalityResult(result) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return false;

            await docRef.update({
                personalityResult: result,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (_profileCache) _profileCache.personalityResult = result;
            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    async function getPersonalityResult() {
        try {
            const profile = await getUserProfile();
            return profile ? profile.personalityResult : null;
        } catch (err) {
            return null;
        }
    }

    // ═══════════════════════════════════════════
    //  TASTE LEARNING & SMART RECOMMENDATIONS
    // ═══════════════════════════════════════════

    async function updateTasteProfile(action, data) {
        try {
            const docRef = getUserDoc();
            if (!docRef) return;
            const profile = await getUserProfile();
            if (!profile || !profile.tasteProfile) return;

            let tp = profile.tasteProfile;
            let dirty = false;

            if (action === 'search' && data.title) {
                if (!tp.searchHistory.includes(data.title)) {
                    tp.searchHistory.push(data.title);
                    if (tp.searchHistory.length > 50) tp.searchHistory.shift();
                    dirty = true;
                }
            }

            if (data.genres && Array.isArray(data.genres)) {
                data.genres.forEach(g => {
                    const genre = typeof g === 'string' ? g : g.name;
                    if (!tp.favoriteGenres.includes(genre)) {
                        tp.favoriteGenres.push(genre);
                        dirty = true;
                    }
                    tp.recommendationScore[genre] = (tp.recommendationScore[genre] || 0) + 1;
                    dirty = true;
                });
            }

            if (action === 'quiz' || action === 'battle') {
                if (data.tags) {
                    data.tags.forEach(t => {
                        tp.recommendationScore[t] = (tp.recommendationScore[t] || 0) + 0.5;
                        dirty = true;
                    });
                }
            }

            if (dirty) {
                await docRef.update({ tasteProfile: tp });
                _profileCache.tasteProfile = tp;
            }
        } catch (err) {
            console.warn('[FirebaseDB] Taste update error:', err);
        }
    }

    // Smart Recommendation Engine based on Taste Profile
    async function generatePersonalizedRecommendations(uid) {
        try {
            const profile = await getUserProfile();
            if (!profile) throw new Error('No profile to recommend for');

            const tp = profile.tasteProfile || { favoriteGenres: [], recommendationScore: {} };
            const watchlist = profile.watchlist || [];

            // Sort top genres
            const topGenres = Object.entries(tp.recommendationScore)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(e => e[0]);

            const searchHistory = tp.searchHistory || [];

            // Attempt to get an explanation based on data
            let explanation = 'Based on your recent activity.';
            if (topGenres.length > 0 && searchHistory.length > 0) {
                explanation = `You might like these because you enjoy ${topGenres.join(' and ')} anime like ${searchHistory[searchHistory.length - 1]}.`;
            } else if (topGenres.length > 0) {
                explanation = `Based on your favorite genres: ${topGenres.join(', ')}.`;
            }

            // Fetch from AnimeSense based on a top genre if available
            let recs = [];
            if (topGenres.length > 0) {
                // Map string genre to typical API ID. Let's do a loose matching or fallback to generic discovery
                const genreMap = { 'Action': 1, 'Adventure': 2, 'Comedy': 4, 'Fantasy': 10, 'Drama': 8, 'Sci-Fi': 24, 'Romance': 22 };
                let gId = genreMap[topGenres[0]] || 1;

                try {
                    const resp = await fetch(`https://api.jikan.moe/v4/anime?genres=${gId}&order_by=score&sort=desc&limit=15`);
                    if (resp.ok) {
                        const data = await resp.json();
                        // Filter out watchlist
                        recs = (data.data || []).filter(a => !watchlist.some(w => w.mal_id === a.mal_id));
                    }
                } catch (e) { }
            }

            // If we don't have enough from AnimeSense, just use some trending
            if (recs.length < 5) {
                try {
                    const resp2 = await fetch('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=10');
                    if (resp2.ok) {
                        const data2 = await resp2.json();
                        const more = (data2.data || []).filter(a => !watchlist.some(w => w.mal_id === a.mal_id) && !recs.some(r => r.mal_id === a.mal_id));
                        recs = recs.concat(more);
                    }
                } catch (e) { }
            }

            // Fallback knowledge graph use
            if (recs.length < 5 && typeof AnimeGraph !== 'undefined') {
                const kgFallback = AnimeGraph.getKnowledgeGraph ? Object.values(AnimeGraph.getKnowledgeGraph()).slice(0, 5) : [];
                recs = recs.concat(kgFallback.map(k => ({ title: k.name || k.title, score: 8.5, genres: k.genres.map(name => ({ name })), images: { jpg: { large_image_url: '' } } })));
            }

            return {
                explanation,
                recommendations: recs.slice(0, 5)
            };
        } catch (err) {
            console.error("Failed to load data");
            return {
                explanation: 'A great selection of popular anime:',
                recommendations: []
            };
        }
    }

    // ═══════════════════════════════════════════
    //  AI CHAT MEMORY (v12)
    // ═══════════════════════════════════════════

    async function saveChatMessage(message, response) {
        try {
            const uid = getUID();
            if (!uid || !db || !message || !response) return false;

            const docRef = db.collection('users').doc(uid).collection('chatMemory').doc();
            await docRef.set({
                message: message.substring(0, 1000), // Limit length
                response: response.substring(0, 4000),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Keep only last 20 messages by cleaning up old ones
            const snap = await db.collection('users').doc(uid).collection('chatMemory')
                .orderBy('timestamp', 'desc').limit(25).get();

            if (snap.docs.length > 20) {
                const toDelete = snap.docs.slice(20);
                const batch = db.batch();
                toDelete.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
            return true;
        } catch (err) {
            console.warn('[FirebaseDB] Chat memory save error:', err);
            return false;
        }
    }

    async function getChatHistory(limitCount = 5) {
        try {
            const uid = getUID();
            if (!uid || !db) return [];

            const snap = await db.collection('users').doc(uid).collection('chatMemory')
                .orderBy('timestamp', 'desc').limit(limitCount).get();

            // Reverse so oldest is first
            const history = [];
            snap.forEach(doc => history.push(doc.data()));
            return history.reverse();
        } catch (err) {
            console.warn('[FirebaseDB] Chat history fetch error:', err);
            return [];
        }
    }

    // ═══════════════════════════════════════════
    //  ANIME REVIEW SYSTEM (v12)
    // ═══════════════════════════════════════════

    async function saveAnimeReview(animeId, rating, reviewText) {
        try {
            const uid = getUID();
            const profile = await getUserProfile();
            if (!uid || !db || !animeId || typeof rating !== 'number') return false;

            const safeRating = Math.max(1, Math.min(5, rating));
            const docRef = db.collection('animeReviews').doc(animeId.toString()).collection('reviews').doc(uid);

            await docRef.set({
                userId: uid,
                userName: profile?.displayName || 'Anonymous',
                rating: safeRating,
                reviewText: reviewText ? reviewText.substring(0, 500) : '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (err) {
            console.warn('[FirebaseDB] Review save error:', err);
            return false;
        }
    }

    async function getAnimeReviews(animeId) {
        try {
            if (!db || !animeId) return { average: 0, count: 0, top: [] };

            const snap = await db.collection('animeReviews').doc(animeId.toString()).collection('reviews')
                .orderBy('createdAt', 'desc').limit(10).get();

            let totalRating = 0;
            let count = 0;
            const top = [];

            snap.forEach(doc => {
                const data = doc.data();
                if (data.rating) {
                    totalRating += data.rating;
                    count++;
                }
                if (top.length < 3 && data.reviewText && data.reviewText.trim().length > 0) {
                    top.push(data);
                }
            });

            return {
                average: count > 0 ? (totalRating / count).toFixed(1) : 0,
                count: count,
                top: top
            };
        } catch (err) {
            console.warn('[FirebaseDB] Review fetch error:', err);
            return { average: 0, count: 0, top: [] };
        }
    }

    // ═══════════════════════════════════════════
    //  UTILITY: Check if Firestore is ready
    // ═══════════════════════════════════════════

    function isReady() {
        return _initialized && db !== null && getUID() !== null;
    }

    // ═══════════ AUTO INIT ═══════════
    document.addEventListener('DOMContentLoaded', () => {
        // Slight delay to ensure firebase-auth.js has initialized first
        setTimeout(() => init(), 300);
    });

    // ═══════════ PUBLIC API ═══════════
    return {
        init,
        isReady,
        getUserProfile,
        ensureUserProfile,
        updateLastActive,

        // Watchlist
        addToWatchlist,
        removeFromWatchlist,
        getWatchlist,
        isInWatchlist,

        // Quiz
        saveQuizScore,
        getQuizStats,

        // Battles
        saveBattleHistory,
        getBattleHistory,

        // Genres
        addFavoriteGenres,
        getFavoriteGenres,

        // Tracking
        trackSearchedAnime,

        // Taste Learning
        updateTasteProfile,
        generatePersonalizedRecommendations,

        // AI Chat Memory
        saveChatMessage,
        getChatHistory,

        // Anime Reviews
        saveAnimeReview,
        getAnimeReviews,

        // Personality
        savePersonalityResult,
        getPersonalityResult
    };
})();
