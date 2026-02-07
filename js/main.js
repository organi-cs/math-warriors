/* ═══════════════════════════════════════════════════
   MAIN — Bootstrap & event wiring
   ═══════════════════════════════════════════════════ */

(function boot() {

    // ── Load saved player name ──
    const savedName = Stats.getPlayerName();
    if (savedName) document.getElementById('playerNameInput').value = savedName;

    // ── Load saved settings for Quick Play ──
    const savedSettings = Stats.loadSettings();
    if (savedSettings) {
        document.getElementById('btnQuickPlay').hidden = false;
        // Also pre-select saved options in the UI
        if (savedSettings.mode) {
            settings.mode = savedSettings.mode;
            document.getElementById('modeAI').classList.toggle('selected', settings.mode === 'ai');
            document.getElementById('modePlayer').classList.toggle('selected', settings.mode === 'player');
            document.getElementById('difficultySection').style.display = settings.mode === 'ai' ? '' : 'none';
        }
        if (savedSettings.difficulty) {
            settings.difficulty = savedSettings.difficulty;
            document.querySelectorAll('.diff-btn').forEach(b =>
                b.classList.toggle('selected', b.dataset.diff === settings.difficulty));
        }
    }

    // ── Home tab navigation ──
    document.querySelectorAll('.home-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            SFX.click();
            document.querySelectorAll('.home-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('tab' + capitalize(tab.dataset.tab));
            if (panel) panel.classList.add('active');
            // Render stats when switching to that tab
            if (tab.dataset.tab === 'stats') renderStats();
        });
    });

    // ── Game mode toggle ──
    document.querySelectorAll('[data-action="mode"]').forEach(btn => {
        btn.addEventListener('click', () => {
            SFX.click();
            settings.mode = btn.dataset.value;
            document.getElementById('modeAI').classList.toggle('selected', settings.mode === 'ai');
            document.getElementById('modePlayer').classList.toggle('selected', settings.mode === 'player');
            document.getElementById('difficultySection').style.display = settings.mode === 'ai' ? '' : 'none';
        });
    });

    // ── Difficulty ──
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            SFX.click();
            settings.difficulty = btn.dataset.diff;
            document.querySelectorAll('.diff-btn').forEach(b =>
                b.classList.toggle('selected', b.dataset.diff === settings.difficulty));
        });
    });

    // ── Sound toggle (home screen) ──
    document.getElementById('soundToggle').addEventListener('click', toggleSound);

    // ── Sound toggle (in-game) ──
    document.getElementById('gameSoundToggle').addEventListener('click', toggleSound);

    // ── Start game ──
    document.getElementById('btnStart').addEventListener('click', startGame);

    // ── Quick Play ──
    document.getElementById('btnQuickPlay').addEventListener('click', () => {
        const saved = Stats.loadSettings();
        if (saved) {
            settings.mode = saved.mode || 'ai';
            settings.difficulty = saved.difficulty || 'easy';
        }
        // Also grab current name
        savePlayerName();
        startGame();
    });

    // ── Quit (with confirm) ──
    document.getElementById('btnQuit').addEventListener('click', requestQuit);
    document.getElementById('btnCancelQuit').addEventListener('click', () => {
        document.getElementById('confirmQuit').classList.remove('active');
    });
    document.getElementById('btnConfirmQuit').addEventListener('click', () => {
        document.getElementById('confirmQuit').classList.remove('active');
        showMenu();
    });

    // ── Arena controls ──
    document.getElementById('btnStrength').addEventListener('click', () => setAttackType('strength'));
    document.getElementById('btnMind').addEventListener('click', () => setAttackType('mind'));
    document.querySelectorAll('.op-btn[data-op]').forEach(btn => {
        btn.addEventListener('click', () => { SFX.click(); addOperator(btn.dataset.op); });
    });
    document.querySelectorAll('.op-btn[data-paren]').forEach(btn => {
        btn.addEventListener('click', () => { SFX.click(); addParen(btn.dataset.paren); });
    });
    document.getElementById('opUndo').addEventListener('click', () => { SFX.click(); undoExpression(); });
    document.getElementById('btnClear').addEventListener('click', () => { SFX.click(); clearSelection(); });
    document.getElementById('btnAttack').addEventListener('click', executeAttack);
    document.getElementById('btnSkip').addEventListener('click', skipTurn);
    document.getElementById('btnUndo').addEventListener('click', performUndo);

    // ── Victory modal ──
    document.getElementById('btnModalMenu').addEventListener('click', showMenu);
    document.getElementById('btnModalReplay').addEventListener('click', () => {
        SFX.click();
        document.getElementById('victoryModal').classList.remove('active');
        initGame();
    });

    // ── Reset stats ──
    document.getElementById('btnResetStats').addEventListener('click', () => {
        if (confirm('Reset all stats? This cannot be undone.')) {
            Stats.reset();
            renderStats();
        }
    });

    // ── Player name live save ──
    document.getElementById('playerNameInput').addEventListener('input', savePlayerName);

})();

/* ═══════ HELPERS ═══════ */

function capitalize(s) {
    const map = { play: 'Play', stats: 'Stats', howto: 'Howto' };
    return map[s] || s;
}

function savePlayerName() {
    const name = document.getElementById('playerNameInput').value.trim();
    Stats.setPlayerName(name);
}

function startGame() {
    savePlayerName();

    // Save settings for Quick Play
    Stats.saveSettings({ mode: settings.mode, difficulty: settings.difficulty });
    document.getElementById('btnQuickPlay').hidden = false;

    // Hide home, show game
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('gameLayout').hidden = false;

    // Configure opponent display
    if (settings.mode === 'ai') {
        const c = AI_CONFIG[settings.difficulty];
        document.getElementById('oppBarName').textContent = 'Computer';
        document.getElementById('oppBarBadge').textContent = c.name;
        document.getElementById('oppBarBadge').style.display = '';
        document.getElementById('oppAvatar').textContent = 'C';
    } else {
        document.getElementById('oppBarName').textContent = 'Player 2';
        document.getElementById('oppBarBadge').style.display = 'none';
        document.getElementById('oppAvatar').textContent = '2';
    }

    SFX.click();
    initGame();
}

function requestQuit() {
    if (!state || state.gameOver) { showMenu(); return; }
    // Show confirm dialog
    document.getElementById('confirmQuit').classList.add('active');
}

function showMenu() {
    stopTimer();
    if (state) {
        state.gameOver = true;
        state.aiThinking = false;
    }
    state = null; // fully discard — prevents stale async callbacks from doing anything
    document.getElementById('gameLayout').hidden = true;
    document.getElementById('homeScreen').classList.remove('hidden');
    document.getElementById('victoryModal').classList.remove('active');
    document.getElementById('confirmQuit').classList.remove('active');
    renderStats();
}

function toggleSound() {
    SFX.enabled = !SFX.enabled;
    const icon = SFX.enabled ? '🔊' : '🔇';
    const label = SFX.enabled ? 'On' : 'Off';
    document.getElementById('soundIcon').textContent = icon;
    document.getElementById('soundLabel').textContent = label;
    document.getElementById('gameSoundToggle').textContent = icon;
    document.getElementById('gameSoundToggle').classList.toggle('muted', !SFX.enabled);
    if (SFX.enabled) SFX.click(); // feedback that sound is back on
}

/* ═══════ STATS RENDERING ═══════ */

function renderStats() {
    const s = Stats.getAll();
    const total = s.wins + s.losses;
    const winPct = total > 0 ? Math.round((s.wins / total) * 100) : 0;
    const grid = document.getElementById('statsGrid');

    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${s.totalGames}</div>
            <div class="stat-label">Games Played</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${winPct}%</div>
            <div class="stat-label">Win Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:var(--green)">${s.wins}</div>
            <div class="stat-label">Wins</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:var(--red)">${s.losses}</div>
            <div class="stat-label">Losses</div>
        </div>
        <div class="stat-card wide">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span class="stat-label">Win/Loss</span>
                <span class="stat-label">${s.wins}W – ${s.losses}L</span>
            </div>
            <div class="stat-bar">
                <div class="stat-bar-fill win" style="width:${total > 0 ? (s.wins/total)*100 : 0}%"></div>
                <div class="stat-bar-fill loss" style="width:${total > 0 ? (s.losses/total)*100 : 0}%"></div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${s.bestStreak}</div>
            <div class="stat-label">Best Streak</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${s.currentStreak}</div>
            <div class="stat-label">Current Streak</div>
        </div>
        ${renderDifficultyStats(s.byDifficulty)}
        <div class="stat-card">
            <div class="stat-value">${s.totalStrengthCaptures}</div>
            <div class="stat-label">Strength Captures</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${s.totalMindCaptures}</div>
            <div class="stat-label">Mind Captures</div>
        </div>
    `;
}

function renderDifficultyStats(byDiff) {
    return Object.entries(byDiff).map(([key, d]) => {
        const t = d.wins + d.losses;
        if (t === 0) return '';
        const colors = { easy: '#81b64c', medium: '#f0c040', hard: '#e87040', impossible: '#e04040' };
        return `<div class="stat-card">
            <div class="stat-value" style="color:${colors[key]}">${d.wins}/${t}</div>
            <div class="stat-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
        </div>`;
    }).join('');
}