/* ═══════════════════════════════════════════════════════════════════
   AnimeSense AI v10 — Anime Quiz Mode (Enhanced)
   ═══════════════════════════════════════════════════════════════════
   Interactive quiz with multiple question types, difficulty levels,
   streak tracking, and session scoring. Fetches from Jikan API
   and Knowledge Base.
   ═══════════════════════════════════════════════════════════════════ */

const AnimeQuiz = (() => {

    // ══════════ QUIZ STATE ══════════

    let state = null;

    const QUESTION_TYPES = ['synopsis', 'year', 'studio', 'character', 'theme', 'genre'];

    // ══════════ START QUIZ ══════════

    async function startQuiz(difficulty = 'normal') {
        try {
            // Fetch random anime from top lists
            const randomPage = Math.floor(Math.random() * 8) + 1;
            const result = await AnimeAPI.getTopAnime(randomPage, 25);
            const animePool = (result.data || []).filter(a =>
                a.synopsis && a.synopsis.length > 50 && a.title
            );

            if (animePool.length < 4) {
                return { error: true, message: "Couldn't fetch enough anime for a quiz. Try again!" };
            }

            // Shuffle and pick
            const shuffled = animePool.sort(() => 0.5 - Math.random());
            const correct = shuffled[0];
            const wrongOptions = shuffled.slice(1, 4);

            // Pick question type (prefer knowledge base types if available)
            let qType = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];

            // If KB available, try character/theme questions
            const kbEntry = typeof AnimeKnowledge !== 'undefined'
                ? AnimeKnowledge.lookup(correct.title)
                : null;

            if (kbEntry && Math.random() > 0.4) {
                qType = ['character', 'theme', 'synopsis'][Math.floor(Math.random() * 3)];
            }

            // Generate question
            const question = generateQuestion(qType, correct, wrongOptions, kbEntry);

            // Build state
            state = {
                correctAnswer: question.correctLetter,
                correctTitle: correct.title,
                correctAnime: correct,
                options: question.options,
                questionType: qType,
                difficulty,
                score: parseInt(sessionStorage.getItem('as_quiz_score') || '0'),
                total: parseInt(sessionStorage.getItem('as_quiz_total') || '0'),
                streak: parseInt(sessionStorage.getItem('as_quiz_streak') || '0'),
                bestStreak: parseInt(sessionStorage.getItem('as_quiz_best_streak') || '0')
            };

            return { error: false, message: formatQuizQuestion(question, state) };
        } catch (err) {
            console.error('[AnimeQuiz] Error:', err);
            return { error: true, message: "Couldn't generate a quiz right now. Try again!" };
        }
    }

    // ══════════ GENERATE QUESTION ══════════

    function generateQuestion(type, correct, wrongOptions, kbEntry) {
        let questionText = '';
        let hint = '';
        const letters = ['A', 'B', 'C', 'D'];

        switch (type) {
            case 'synopsis': {
                let synText = (correct.synopsis || '').slice(0, 280);
                const titleWords = correct.title.split(/[\s:]+/).filter(w => w.length >= 3);
                for (const tw of titleWords) {
                    synText = synText.replace(new RegExp(tw, 'gi'), '***');
                }
                questionText = `**🔍 Guess the anime from this synopsis:**\n\n*"${synText}..."*`;
                break;
            }
            case 'year': {
                const year = correct.year || correct.aired?.prop?.from?.year;
                questionText = `**📅 Which anime first aired in ${year}?**`;
                hint = `\n\n*Hint: It has ${correct.episodes || '?'} episodes and is a ${(correct.genres || []).slice(0, 2).map(g => g.name).join('/')} series.*`;
                break;
            }
            case 'studio': {
                const studios = (correct.studios || []).map(s => s.name).join(', ') || 'Unknown Studio';
                questionText = `**🎬 Which anime was produced by ${studios}?**`;
                hint = `\n\n*Hint: Score ⭐ ${correct.score}/10 • ${correct.episodes || '?'} episodes • ${correct.year || '?'}*`;
                break;
            }
            case 'character': {
                if (kbEntry && kbEntry.characters && kbEntry.characters.length >= 2) {
                    const randomChar = kbEntry.characters[Math.floor(Math.random() * Math.min(5, kbEntry.characters.length))];
                    questionText = `**👤 Which anime features the character "${randomChar}"?**`;
                    hint = `\n\n*Hint: The power system involves ${kbEntry.power_system.slice(0, 60)}...*`;
                } else {
                    // Fallback to synopsis
                    let synText = (correct.synopsis || '').slice(0, 280);
                    questionText = `**🔍 Guess the anime from this synopsis:**\n\n*"${synText}..."*`;
                }
                break;
            }
            case 'theme': {
                if (kbEntry && kbEntry.themes && kbEntry.themes.length >= 2) {
                    const themes = kbEntry.themes.slice(0, 3).join(', ');
                    questionText = `**🎭 Which anime explores these themes: ${themes}?**`;
                    hint = `\n\n*Hint: Created by ${kbEntry.author}, studio ${kbEntry.studio}*`;
                } else {
                    const genres = (correct.genres || []).slice(0, 3).map(g => g.name).join(', ');
                    questionText = `**🎭 Which ${genres} anime has a score of ${correct.score}/10?**`;
                    hint = `\n\n*Hint: ${correct.episodes || '?'} episodes, aired ${correct.year || '?'}*`;
                }
                break;
            }
            case 'genre': {
                const genres = (correct.genres || []).map(g => g.name).join(', ');
                questionText = `**🏷️ Which anime belongs to these genres: ${genres}?**`;
                hint = `\n\n*Hint: ${correct.episodes || '?'} episodes, score ⭐ ${correct.score}/10*`;
                break;
            }
        }

        // Build shuffled options
        const allOptions = [correct, ...wrongOptions].sort(() => 0.5 - Math.random());
        const correctIndex = allOptions.indexOf(correct);

        return {
            questionText,
            hint,
            options: allOptions.map((a, i) => `${letters[i]}) ${a.title}`),
            correctLetter: letters[correctIndex],
            correctTitle: correct.title
        };
    }

    // ══════════ FORMAT QUIZ QUESTION ══════════

    function formatQuizQuestion(question, quizState) {
        const typeIcons = {
            synopsis: '📖 Synopsis Challenge',
            year: '📅 Year Guess',
            studio: '🎬 Studio Quiz',
            character: '👤 Character Quiz',
            theme: '🎭 Theme Quiz',
            genre: '🏷️ Genre Quiz'
        };

        let response = `## 🎮 Anime Quiz — ${typeIcons[quizState.questionType] || 'Quiz'}\n\n`;
        response += question.questionText + (question.hint || '') + '\n\n';
        response += question.options.join('\n') + '\n\n';
        response += `**Type A, B, C, or D to answer!**\n\n`;

        // Stats bar
        response += `> 📊 *Score: ${quizState.score}/${quizState.total} | Streak: ${quizState.streak} 🔥 | Best: ${quizState.bestStreak} 🏆*`;

        return response;
    }

    // ══════════ CHECK ANSWER ══════════

    function checkAnswer(answer) {
        if (!state) {
            return { active: false, message: '## 🎮 Quiz\n\nNo active quiz! Say **"anime quiz"** to start one.' };
        }

        const correct = state.correctAnswer;
        const title = state.correctTitle;
        state.total++;
        let response;

        if (answer.toUpperCase() === correct) {
            state.score++;
            state.streak++;
            if (state.streak > state.bestStreak) state.bestStreak = state.streak;

            const streakEmojis = state.streak >= 5 ? '🔥🔥🔥' : state.streak >= 3 ? '🔥🔥' : '🔥';

            response = `## ✅ Correct! ${streakEmojis}\n\n`;
            response += `The answer is **${correct}) ${title}** 🎉\n\n`;
            response += `**Score: ${state.score}/${state.total}** 🏆\n`;
            response += `**Streak: ${state.streak}** ${streakEmojis}\n`;

            if (state.streak >= 3) {
                response += `\n> 🔥 *You're on fire! ${state.streak} correct in a row!*`;
            }
        } else {
            const streakLost = state.streak;
            state.streak = 0;

            response = `## ❌ Wrong!\n\n`;
            response += `You answered **${answer.toUpperCase()}**, but the correct answer was **${correct}) ${title}**.\n\n`;
            response += `**Score: ${state.score}/${state.total}**\n`;

            if (streakLost >= 3) {
                response += `\n> 😢 *Streak of ${streakLost} broken!*`;
            }
        }

        // Save stats
        sessionStorage.setItem('as_quiz_score', state.score.toString());
        sessionStorage.setItem('as_quiz_total', state.total.toString());
        sessionStorage.setItem('as_quiz_streak', state.streak.toString());
        sessionStorage.setItem('as_quiz_best_streak', state.bestStreak.toString());

        response += `\n\n> 💡 Say **"quiz"** for another question or **"quiz stats"** to see your record!`;

        state = null;
        return { active: true, message: response };
    }

    // ══════════ QUIZ STATS ══════════

    function getStats() {
        const score = parseInt(sessionStorage.getItem('as_quiz_score') || '0');
        const total = parseInt(sessionStorage.getItem('as_quiz_total') || '0');
        const bestStreak = parseInt(sessionStorage.getItem('as_quiz_best_streak') || '0');
        const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

        let response = `## 📊 Your Quiz Stats\n\n`;
        response += `| Stat | Value |\n|---|---|\n`;
        response += `| **Correct** | ${score} |\n`;
        response += `| **Total Questions** | ${total} |\n`;
        response += `| **Accuracy** | ${accuracy}% |\n`;
        response += `| **Best Streak** | ${bestStreak} 🔥 |\n`;

        // Rating
        let rating;
        if (accuracy >= 90) rating = '🏆 Anime Master';
        else if (accuracy >= 70) rating = '⭐ Anime Expert';
        else if (accuracy >= 50) rating = '🎌 Anime Fan';
        else if (total > 0) rating = '📚 Learning Weeb';
        else rating = '🆕 Fresh Start';

        response += `| **Rating** | ${rating} |\n\n`;
        response += `> 💡 Say **"quiz"** to play another round!`;

        return response;
    }

    // ══════════ PUBLIC API ══════════

    function isActive() {
        return state !== null;
    }

    function resetStats() {
        sessionStorage.removeItem('as_quiz_score');
        sessionStorage.removeItem('as_quiz_total');
        sessionStorage.removeItem('as_quiz_streak');
        sessionStorage.removeItem('as_quiz_best_streak');
    }

    return {
        startQuiz,
        checkAnswer,
        getStats,
        isActive,
        resetStats
    };

})();
