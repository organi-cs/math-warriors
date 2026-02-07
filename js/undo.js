/* ═══════════════════════════════════════════════════
   UNDO — Snapshot/restore for take-back
   Only stores the last turn (1 undo level).
   ═══════════════════════════════════════════════════ */

let _undoSnapshot = null;

function saveUndoSnapshot() {
    if (!state) return;
    _undoSnapshot = {
        currentPlayer: state.currentPlayer,
        firstPlayer: state.firstPlayer,
        attackType: state.attackType,
        youDice: state.youDice.map(d => ({ ...d })),
        opponentDice: state.opponentDice.map(d => ({ ...d })),
        gameOver: state.gameOver,
        aiThinking: false,
        timeRemaining: state.timeRemaining,
        moveCount: state.moveCount,
        historyHTML: document.getElementById('historyList').innerHTML
    };
}

function canUndo() {
    if (!_undoSnapshot || !state || state.gameOver) return false;
    // Allow undo if it's your turn OR if AI is thinking
    // (because the AI turn started as a result of your attack)
    if (state.currentPlayer === 1 && !state.aiThinking) return true;
    if (state.currentPlayer === 2 && state.aiThinking) return true;
    return false;
}

function performUndo() {
    if (!canUndo()) return;
    const snap = _undoSnapshot;
    _undoSnapshot = null;

    // Stop AI if it's thinking
    state.aiThinking = false;
    state.gameOver = true; // prevent any pending AI callback from firing

    // Restore state
    state.currentPlayer = snap.currentPlayer;
    state.firstPlayer = snap.firstPlayer;
    state.youDice = snap.youDice;
    state.opponentDice = snap.opponentDice;
    state.gameOver = snap.gameOver;
    state.timeRemaining = snap.timeRemaining;
    state.moveCount = snap.moveCount;
    state.aiThinking = false;
    state.selectedDice = [];
    state.targetDie = null;
    state.expression = [];
    state.attackType = 'strength';

    // Rebuild DOM elements since dice objects changed
    initRender();

    // Restore history
    document.getElementById('historyList').innerHTML = snap.historyHTML;
    document.getElementById('historyCount').textContent = `${snap.moveCount} moves`;

    // Reset UI state
    document.getElementById('targetValue').textContent = '—';
    document.getElementById('targetHint').textContent = 'click opponent die';
    document.getElementById('btnStrength').classList.add('active');
    document.getElementById('btnMind').classList.remove('active');
    document.getElementById('exprBuilder').hidden = true;
    document.getElementById('ruleHint').hidden = true;
    document.getElementById('thinkingBadge').hidden = true;
    refreshExpression();
    render();
    updateAttackButton();
    updateUndoBtn();

    SFX.undo();
    addMove('↩ Move undone', 'sys');
}

function clearUndoSnapshot() {
    _undoSnapshot = null;
}

function updateUndoBtn() {
    const btn = document.getElementById('btnUndo');
    if (btn) btn.disabled = !canUndo();
}