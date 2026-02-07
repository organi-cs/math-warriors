/* GAME — Core logic with undo, sound, stats, roll animation */

function initGame() {
    state = createFreshState();
    const first = determineFirstPlayer(state);
    state.currentPlayer = first;
    state.firstPlayer = first;

    // Player name
    const name = Stats.getPlayerName() || 'You';
    document.getElementById('youBarName').textContent = name;
    document.getElementById('youBoardLabel').textContent = name;
    document.getElementById('youAvatar').textContent = name.charAt(0).toUpperCase();

    document.getElementById('youFirstTag').hidden = first !== 1;
    document.getElementById('oppFirstTag').hidden = first !== 2;
    document.getElementById('historyList').innerHTML = '';
    state.moveCount = 0;
    clearUndoSnapshot();
    initGameTracker();
    initRender();
    clearSelection();
    render();
    const who = first === 1 ? name + ' goes' : 'Opponent goes';
    addMove(`Game started. ${who} first (penalty).`, 'sys');
    startTimer();
    if (first === 2 && settings.mode === 'ai') setTimeout(aiTurn, 800);
}

function executeAttack() {
    const target = getTarget(), sel = getSelected();
    if (!target || !sel.length) return;

    // Save undo snapshot BEFORE the attack
    saveUndoSnapshot();

    target.captured = true;
    state.moveCount++;

    // Track stats
    trackCapture(state.attackType, sel.length);

    // Sound
    SFX.capture();

    // Flash
    document.getElementById('board').classList.add('flash');
    setTimeout(() => document.getElementById('board').classList.remove('flash'), 250);

    const who = state.currentPlayer === 1
        ? (Stats.getPlayerName() || 'You')
        : (settings.mode === 'ai' ? 'CPU' : 'P2');
    let expr;
    if (state.attackType === 'strength') {
        const alive = activeDice(oppDice()).length;
        expr = `${sel[0].value} ${alive === 0 ? '>' : '≥'} ${target.value}`;
    } else {
        expr = state.expression.map(e =>
            e.type === 'die' ? e.value : e.type === 'op' ? ` ${OP_DISPLAY[e.value]} ` : e.value
        ).join('') + ` = ${target.value}`;
    }
    const icon = state.attackType === 'strength' ? '⚔' : '🧠';
    addMove(`${icon} ${who} captured D${target.sides} (${expr})`, state.currentPlayer === 1 ? 'you' : 'opp');

    // Dice roll animation with number cycling
    animateDiceRoll(sel, () => {
        if (activeDice(oppDice()).length === 0) {
            setTimeout(() => showVictory(state.currentPlayer), 300);
            return;
        }
        state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
        clearSelection();
        updateUndoBtn();
        if (state.currentPlayer === 2 && settings.mode === 'ai' && !state.gameOver)
            setTimeout(aiTurn, 400);
    });
}

/** Animate dice: rapid number cycling then land on new value */
function animateDiceRoll(selectedDice, callback) {
    SFX.roll();

    // Add cycling class to each die element
    selectedDice.forEach(d => {
        const el = document.querySelector(`[data-id="${d.id}"]`);
        if (el) el.classList.add('cycling');
    });

    const CYCLE_DURATION = 400;
    const CYCLE_INTERVAL = 50;
    let elapsed = 0;

    const interval = setInterval(() => {
        elapsed += CYCLE_INTERVAL;
        // Show random numbers during cycling
        selectedDice.forEach(d => {
            const el = document.querySelector(`[data-id="${d.id}"]`);
            if (el) {
                const valEl = el.querySelector('.die-value');
                if (valEl) valEl.textContent = rollDie(d.sides);
            }
        });

        if (elapsed >= CYCLE_DURATION) {
            clearInterval(interval);
            // Land on final values
            selectedDice.forEach(d => {
                d.value = rollDie(d.sides);
                const el = document.querySelector(`[data-id="${d.id}"]`);
                if (el) {
                    el.classList.remove('cycling');
                    el.classList.add('rolling');
                    const valEl = el.querySelector('.die-value');
                    if (valEl) valEl.textContent = d.value;
                }
            });
            render();
            setTimeout(callback, 300);
        }
    }, CYCLE_INTERVAL);
}

function skipTurn() {
    if (state.aiThinking) return;
    state.moveCount++;
    SFX.skip();
    const who = state.currentPlayer === 1
        ? (Stats.getPlayerName() || 'You')
        : (settings.mode === 'ai' ? 'CPU' : 'P2');
    addMove(`${who} skipped`, 'sys');
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    clearSelection();
    if (state.currentPlayer === 2 && settings.mode === 'ai') setTimeout(aiTurn, 400);
}

function clearSelection() {
    state.selectedDice = [];
    state.targetDie = null;
    state.expression = [];
    state.attackType = 'strength';
    document.getElementById('targetValue').textContent = '—';
    document.getElementById('targetHint').textContent = 'click opponent die';
    document.getElementById('btnStrength').classList.add('active');
    document.getElementById('btnMind').classList.remove('active');
    document.getElementById('exprBuilder').hidden = true;
    document.getElementById('ruleHint').hidden = true;
    refreshExpression();
    render();
    updateAttackButton();
    updateUndoBtn();
}

function showVictory(player) {
    state.gameOver = true;
    stopTimer();

    const won = player === 1;
    const pg = getPostGameStats();

    // Record to localStorage
    if (settings.mode === 'ai') {
        Stats.recordGame(won, settings.difficulty, pg);
    }

    // Sound
    if (won) SFX.victory(); else SFX.defeat();

    // Modal
    const modal = document.getElementById('victoryModal');
    const res = document.getElementById('modalResult');
    const title = document.getElementById('modalTitle');
    const sub = document.getElementById('modalSub');
    const pgEl = document.getElementById('postgameStats');

    if (won) {
        res.textContent = '🏆';
        title.textContent = 'Victory!';
        title.className = 'modal-title win';
        sub.textContent = settings.mode === 'ai'
            ? `${AI_CONFIG[settings.difficulty].name} AI defeated`
            : 'All opponent dice captured';
    } else {
        res.textContent = '💀';
        title.textContent = 'Defeat';
        title.className = 'modal-title lose';
        sub.textContent = state.timeRemaining <= 0 ? 'Time expired' : 'Better luck next time';
    }

    // Post-game stats
    if (pg) {
        pgEl.innerHTML = `
            <div class="pg-stat"><div class="pg-val">${pg.moves}</div><div class="pg-label">Moves</div></div>
            <div class="pg-stat"><div class="pg-val">${pg.strengthCaptures}</div><div class="pg-label">Strength</div></div>
            <div class="pg-stat"><div class="pg-val">${pg.mindCaptures}</div><div class="pg-label">Mind</div></div>
            <div class="pg-stat"><div class="pg-val">${pg.timeTaken}</div><div class="pg-label">Time</div></div>
            <div class="pg-stat"><div class="pg-val">${pg.biggestComboSize || '—'}</div><div class="pg-label">Best Combo</div></div>
            <div class="pg-stat"><div class="pg-val">${6 - activeDice(state.opponentDice).length}/6</div><div class="pg-label">Captured</div></div>`;
    }

    modal.classList.add('active');
}

function addMove(msg, type = 'sys') {
    const list = document.getElementById('historyList');
    const empty = list.querySelector('.history-empty');
    if (empty) empty.remove();

    const entry = document.createElement('div');
    entry.className = 'move-entry';
    const num = document.createElement('span');
    num.className = 'move-num';
    num.textContent = state.moveCount || '•';
    const text = document.createElement('span');
    text.className = `move-text ${type}`;
    text.textContent = msg;
    entry.appendChild(num);
    entry.appendChild(text);
    list.appendChild(entry);
    list.scrollTop = list.scrollHeight;
    document.getElementById('historyCount').textContent = `${state.moveCount} moves`;
}