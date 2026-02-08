/* ═══════════════════════════════════════════════════
   KEYBOARD — Type die value to select (optimized)
   
   Smart flush: if the typed number can ONLY match one
   die (no multi-digit die starts with that prefix),
   it resolves instantly. Otherwise buffers 200ms.
   ═══════════════════════════════════════════════════ */

let _numBuf = '';
let _numTimer = null;
let _numShifted = false;

function flushNumBuffer() {
    const val = parseInt(_numBuf);
    _numBuf = '';
    if (_numTimer) { clearTimeout(_numTimer); _numTimer = null; }
    if (isNaN(val)) return;

    if (_numShifted) {
        const match = oppDice().find(d => !d.captured && d.value === val);
        if (match) handleDieClick(match, state.currentPlayer === 1 ? 2 : 1);
    } else {
        const alive = myDice().filter(d => !d.captured);
        const match = alive.find(d => d.value === val && !state.selectedDice.includes(d.id))
                   || alive.find(d => d.value === val);
        if (match) handleDieClick(match, state.currentPlayer);
    }
}

/** Check if buffered number could still match a multi-digit die value */
function couldMatchMore(buf, shifted) {
    const dice = shifted ? oppDice() : myDice();
    const prefix = buf;
    return dice.some(d => !d.captured && String(d.value).startsWith(prefix) && String(d.value).length > prefix.length);
}

document.addEventListener('keydown', e => {
    // Modals
    const vModal = document.getElementById('victoryModal');
    if (vModal.classList.contains('active')) {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnModalReplay').click(); }
        if (e.key === 'Escape') { e.preventDefault(); document.getElementById('btnModalMenu').click(); }
        return;
    }
    const cModal = document.getElementById('confirmQuit');
    if (cModal.classList.contains('active')) {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnConfirmQuit').click(); }
        if (e.key === 'Escape') { e.preventDefault(); document.getElementById('btnCancelQuit').click(); }
        return;
    }

    // Home screen
    const home = document.getElementById('homeScreen');
    if (!home.classList.contains('hidden')) {
        if (e.key === 'Enter' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault(); document.getElementById('btnStart').click();
        }
        return;
    }

    // In game
    if (!state || state.gameOver || state.aiThinking) return;
    if (state.currentPlayer === 2 && settings.mode === 'ai') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key;

    if (k === 's' || k === 'S') { e.preventDefault(); setAttackType('strength'); return; }
    if (k === 'm' || k === 'M') { e.preventDefault(); setAttackType('mind'); return; }
    if (k === 'u' || k === 'U') { e.preventDefault(); performUndo(); return; }

    // Number input
    if (k >= '0' && k <= '9') {
        e.preventDefault();
        _numShifted = e.shiftKey;
        _numBuf += k;
        if (_numTimer) clearTimeout(_numTimer);

        // Smart flush: if no die value starts with this prefix as a longer number, flush now
        if (!couldMatchMore(_numBuf, _numShifted)) {
            flushNumBuffer();
        } else {
            _numTimer = setTimeout(flushNumBuffer, 200);
        }
        return;
    }

    // Operators — auto-switch to Mind mode
    if (['+','-','*','/','(',')'].includes(k)) {
        e.preventDefault();
        if (state.attackType !== 'mind') setAttackType('mind');
        if (k === '(' || k === ')') addParen(k);
        else addOperator(k);
        return;
    }
    if (state.attackType === 'mind' && k === 'Backspace') { e.preventDefault(); undoExpression(); return; }

    if (k === 'Enter') { e.preventDefault(); if (!document.getElementById('btnAttack').disabled) executeAttack(); return; }
    if (k === 'Escape') { e.preventDefault(); clearSelection(); return; }
    if (k === 'Tab')    { e.preventDefault(); skipTurn(); return; }
    if (k === 'q' || k === 'Q') { e.preventDefault(); requestQuit(); return; }
});