/* TIMER */
let _ti = null;

function startTimer() {
    stopTimer();
    state.timeRemaining = GAME_DURATION;
    renderTimer();
    _ti = setInterval(() => {
        if (state.gameOver) { stopTimer(); return; }
        state.timeRemaining--;
        renderTimer();
        // Tick sound in final 10 seconds
        if (state.timeRemaining <= 10 && state.timeRemaining > 0) SFX.tick();
        if (state.timeRemaining <= 0) { stopTimer(); onTimeUp(); }
    }, 1000);
}

function stopTimer() { if (_ti) { clearInterval(_ti); _ti = null; } }

function renderTimer() {
    const el = document.getElementById('timerBox'), t = document.getElementById('timerText');
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
