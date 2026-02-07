/* ═══════════════════════════════════════════════════
   STATS — Win/loss record + post-game stats
   Persisted in localStorage.
   ═══════════════════════════════════════════════════ */

const Stats = (function() {
    const STORAGE_KEY = 'mw_stats';
    const SETTINGS_KEY = 'mw_settings';
    const NAME_KEY = 'mw_player_name';

    function load() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultStats();
        } catch { return defaultStats(); }
    }

    function save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    }

    function defaultStats() {
        return {
            totalGames: 0,
            wins: 0,
            losses: 0,
            byDifficulty: {
                easy: { wins: 0, losses: 0 },
                medium: { wins: 0, losses: 0 },
                hard: { wins: 0, losses: 0 },
                impossible: { wins: 0, losses: 0 }
            },
            bestStreak: 0,
            currentStreak: 0,
            totalMoves: 0,
            totalStrengthCaptures: 0,
            totalMindCaptures: 0
        };
    }

    return {
        /** Get full stats object */
        getAll() { return load(); },

        /** Record a game result */
        recordGame(won, difficulty, gameStats) {
            const d = load();
            d.totalGames++;
            if (won) {
                d.wins++;
                d.currentStreak++;
                d.bestStreak = Math.max(d.bestStreak, d.currentStreak);
                if (d.byDifficulty[difficulty]) d.byDifficulty[difficulty].wins++;
            } else {
                d.losses++;
                d.currentStreak = 0;
                if (d.byDifficulty[difficulty]) d.byDifficulty[difficulty].losses++;
            }
            if (gameStats) {
                d.totalMoves += gameStats.moves || 0;
                d.totalStrengthCaptures += gameStats.strengthCaptures || 0;
                d.totalMindCaptures += gameStats.mindCaptures || 0;
            }
            save(d);
            return d;
        },

        /** Reset all stats */
        reset() { save(defaultStats()); },

        /** Save last-used settings for Quick Play */
        saveSettings(s) {
            try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
        },

        /** Load last-used settings */
        loadSettings() {
            try {
                return JSON.parse(localStorage.getItem(SETTINGS_KEY));
            } catch { return null; }
        },

        /** Player name */
        getPlayerName() {
            try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
        },
        setPlayerName(n) {
            try { localStorage.setItem(NAME_KEY, n); } catch {}
        }
    };
})();

/* ── Per-game stats tracker ── */
let gameTracker = null;

function initGameTracker() {
    gameTracker = {
        moves: 0,
        strengthCaptures: 0,
        mindCaptures: 0,
        diceUsed: [],
        biggestComboSize: 0,
        startTime: Date.now()
    };
}

function trackCapture(type, diceCount) {
    if (!gameTracker) return;
    gameTracker.moves++;
    if (type === 'strength') gameTracker.strengthCaptures++;
    else {
        gameTracker.mindCaptures++;
        gameTracker.biggestComboSize = Math.max(gameTracker.biggestComboSize, diceCount);
    }
}

function getPostGameStats() {
    if (!gameTracker) return null;
    const elapsed = Math.round((Date.now() - gameTracker.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return {
        moves: gameTracker.moves,
        strengthCaptures: gameTracker.strengthCaptures,
        mindCaptures: gameTracker.mindCaptures,
        biggestComboSize: gameTracker.biggestComboSize,
        timeTaken: `${m}:${String(s).padStart(2, '0')}`,
        timeSec: elapsed
    };
}
