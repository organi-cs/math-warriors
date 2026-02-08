/* TIMER — Game timer + move timer */
let _gi = null; // game interval
let _mi = null; // move interval
let _moveTimeLeft = 0;

function startTimer() {
    stopTimer();
    if (GAME_DURATION > 0) {
        state.timeRemaining = GAME_DURATION;
        renderGameTimer();
        _gi = setInterval(() => {
            if (state.gameOver) { stopTimer(); return; }
            state.timeRemaining--;
            renderGameTimer();
            if (state.timeRemaining <= 10 && state.timeRemaining > 0) SFX.tick();
            if (state.timeRemaining <= 0) { stopTimer(); onTimeUp(); }
        }, 1000);
    } else {
        state.timeRemaining = Infinity;
        document.getElementById('timerText').textContent = '∞';
        document.getElementById('timerBox').classList.remove('warning', 'critical');
    }
    // Start first move timer
    resetMoveTimer();
}

function stopTimer() {
    if (_gi) { clearInterval(_gi); _gi = null; }
    stopMoveTimer();
}

function renderGameTimer() {
    const el = document.getElementById('timerBox'), t = document.getElementById('timerText');
    if (state.timeRemaining === Infinity) { t.textContent = '∞'; return; }
    const m = Math.floor(state.timeRemaining / 60), s = state.timeRemaining % 60;
    t.textContent = `${m}:${String(s).padStart(2, '0')}`;
    el.classList.remove('warning', 'critical');
    if (state.timeRemaining <= 60) el.classList.add('critical');
    else if (state.timeRemaining <= 180) el.classList.add('warning');
}

function onTimeUp() {
    const y = activeDice(state.youDice).length, o = activeDice(state.opponentDice).length;
    let w;
    if (y < o) w = 1; else if (o < y) w = 2; else w = state.firstPlayer === 1 ? 2 : 1;
    addMove('Time up!', 'sys');
    showVictory(w);
}

/* ── Move timer ── */

function resetMoveTimer() {
    stopMoveTimer();
    const box = document.getElementById('moveTimerBox');
    if (MOVE_DURATION <= 0) {
        box.hidden = true;
        return;
    }
    box.hidden = false;
    _moveTimeLeft = MOVE_DURATION;
    renderMoveTimer();
    _mi = setInterval(() => {
        if (state.gameOver || state.aiThinking) return;
        _moveTimeLeft--;
        renderMoveTimer();
        if (_moveTimeLeft <= 3 && _moveTimeLeft > 0) SFX.tick();
        if (_moveTimeLeft <= 0) {
            stopMoveTimer();
            // Auto-skip turn
            addMove('⏱ Move timed out — turn skipped', 'sys');
            SFX.skip();
            state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
            clearSelection();
            resetMoveTimer();
            if (state.currentPlayer === 2 && settings.mode === 'ai') setTimeout(aiTurn, 400);
        }
    }, 1000);
}

function stopMoveTimer() {
    if (_mi) { clearInterval(_mi); _mi = null; }
}

function renderMoveTimer() {
    const box = document.getElementById('moveTimerBox');
    const text = document.getElementById('moveTimerText');
    if (!box || box.hidden) return;
    text.textContent = _moveTimeLeft;
    box.classList.toggle('urgent', _moveTimeLeft <= 5);
}