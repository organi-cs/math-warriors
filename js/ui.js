/* UI — Optimized: build DOM once, patch in-place */

let _diceEls = {}; // cache: die.id → DOM element

/** Called ONCE when game starts — creates all dice elements */
function initRender() {
    _diceEls = {};
    buildDiceRow('youDiceRow', state.youDice, 1);
    buildDiceRow('oppDiceRow', state.opponentDice, 2);
}

function buildDiceRow(containerId, dice, player) {
    const c = document.getElementById(containerId);
    c.innerHTML = '';
    dice.forEach((die, idx) => {
        const el = document.createElement('div');
        el.className = `die ${die.name}`;
        if (die.captured) el.classList.add('captured');
        el.dataset.id = die.id;
        el.setAttribute('tabindex', die.captured ? '-1' : '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `D${die.sides}: ${die.captured ? 'captured' : die.value}`);
        el.innerHTML = `<span class="die-key">${die.captured ? '' : die.value}</span><span class="die-value">${die.captured ? '—' : die.value}</span><span class="die-label">D${die.sides}</span>`;
        // Bind click handler immediately
        if (!die.captured) {
            const click = () => { SFX.select(); handleDieClick(die, player); };
            el.onclick = click;
            el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } };
        }
        c.appendChild(el);
        _diceEls[die.id] = el;
    });
}

/** Called on every state change — patches only what changed */
function render() {
    patchDice(state.youDice, 1);
    patchDice(state.opponentDice, 2);
    renderTurn();
    renderCounts();
    renderControls();
    renderRuleHint();
    updateAttackButton();
    updateUndoBtn();
}

function patchDice(dice, player) {
    const isMe = player === state.currentPlayer;
    const isTgt = player !== state.currentPlayer;

    // Valid attacks set (only for strength mode with target)
    const validIds = new Set();
    if (isMe && state.targetDie && state.attackType === 'strength') {
        const target = oppDice().find(d => d.id === state.targetDie && !d.captured);
        if (target) {
            const isLast = activeDice(oppDice()).length === 1;
            const isStarter = state.currentPlayer === state.firstPlayer;
            myDice().forEach(d => {
                if (d.captured) return;
                if ((isLast && isStarter) ? d.value > target.value : d.value >= target.value)
                    validIds.add(d.id);
            });
        }
    }

    dice.forEach(die => {
        const el = _diceEls[die.id];
        if (!el) return;

        // Update classes (toggle, not rebuild)
        el.classList.toggle('captured', die.captured);
        el.classList.toggle('selected', !die.captured && isMe && state.selectedDice.includes(die.id));
        el.classList.toggle('target', !die.captured && isTgt && state.targetDie === die.id);
        el.classList.toggle('valid-attack',
            !die.captured && isMe && validIds.has(die.id) && !state.selectedDice.includes(die.id));

        // Update text
        const valEl = el.querySelector('.die-value');
        const keyEl = el.querySelector('.die-key');
        valEl.textContent = die.captured ? '—' : die.value;
        keyEl.textContent = die.captured ? '' : die.value;

        // Tabindex + aria
        el.setAttribute('tabindex', die.captured ? '-1' : '0');
        el.setAttribute('aria-label', `D${die.sides}: ${die.captured ? 'captured' : die.value}`);

        // Click handler (re-bind since die value changes)
        if (!die.captured && !state.aiThinking) {
            const click = () => { SFX.select(); handleDieClick(die, player); };
            el.onclick = click;
            el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } };
        } else {
            el.onclick = null;
            el.onkeydown = null;
        }
    });
}

function renderTurn() {
    const dot = document.getElementById('turnDot');
    const label = document.getElementById('turnLabel');
    const penalty = document.getElementById('penaltyTag');
    const think = document.getElementById('thinkingBadge');
    const name = Stats.getPlayerName() || 'You';

    if (state.currentPlayer === 1) {
        dot.className = 'turn-dot you';
        label.className = 'turn-label you';
        label.textContent = name + "'s Turn";
        think.hidden = true;
    } else {
        dot.className = 'turn-dot opp';
        label.className = 'turn-label opp';
        label.textContent = settings.mode === 'ai' ? 'CPU Turn' : 'P2 Turn';
        think.hidden = !state.aiThinking;
    }
    penalty.hidden = state.currentPlayer !== state.firstPlayer;
    document.getElementById('youBoardHalf').classList.toggle('active', state.currentPlayer === 1);
    document.getElementById('oppBoardHalf').classList.toggle('active', state.currentPlayer === 2);
}

function renderCounts() {
    const y = activeDice(state.youDice).length, o = activeDice(state.opponentDice).length;
    document.getElementById('youBarDice').textContent = `${y} dice`;
    document.getElementById('oppBarDice').textContent = `${o} dice`;
}

function renderControls() {
    const off = state.currentPlayer === 2 && settings.mode === 'ai';
    document.getElementById('btnStrength').disabled = off;
    document.getElementById('btnMind').disabled = off;
    document.getElementById('btnClear').disabled = off;
    document.getElementById('btnSkip').disabled = off;
    document.querySelectorAll('.op-btn').forEach(b => b.disabled = off);
}

function renderRuleHint() {
    const hint = document.getElementById('ruleHint');
    if (state.currentPlayer === 1 && state.attackType === 'strength') {
        const isLast = activeDice(oppDice()).length === 1;
        const isStarter = state.currentPlayer === state.firstPlayer;
        if (isLast && isStarter) {
            hint.hidden = false;
            hint.textContent = '⚡ Final capture: your value must be STRICTLY greater (>)';
        } else hint.hidden = true;
    } else hint.hidden = true;
}

function setAttackType(type) {
    if (state.aiThinking) return;
    SFX.click();
    state.attackType = type;
    state.selectedDice = [];
    state.expression = [];
    document.getElementById('btnStrength').classList.toggle('active', type === 'strength');
    document.getElementById('btnMind').classList.toggle('active', type === 'mind');
    document.getElementById('exprBuilder').hidden = type !== 'mind';
    refreshExpression();
    render();
}

function handleDieClick(die, player) {
    if (state.gameOver || state.aiThinking) return;
    if (settings.mode === 'ai' && state.currentPlayer === 2) return;
    const isMe = player === state.currentPlayer, isTgt = player !== state.currentPlayer;

    if (isMe) {
        if (state.attackType === 'strength') {
            state.selectedDice = [die.id];
            state.expression = [{ type: 'die', id: die.id, value: die.value }];
        } else {
            const idx = state.selectedDice.indexOf(die.id);
            if (idx > -1) {
                state.selectedDice.splice(idx, 1);
                const ei = state.expression.findIndex(e => e.type === 'die' && e.id === die.id);
                if (ei > -1) {
                    if (ei > 0 && state.expression[ei - 1].type === 'op') state.expression.splice(ei - 1, 2);
                    else { state.expression.splice(ei, 1); if (state.expression[ei]?.type === 'op') state.expression.splice(ei, 1); }
                }
            } else {
                state.selectedDice.push(die.id);
                if (state.expression.length > 0 && state.expression[state.expression.length - 1].type === 'die')
                    state.expression.push({ type: 'op', value: '+' });
                state.expression.push({ type: 'die', id: die.id, value: die.value });
            }
        }
    } else if (isTgt) {
        state.targetDie = die.id;
        document.getElementById('targetValue').textContent = die.value;
        document.getElementById('targetHint').textContent = `D${die.sides}`;
    }
    refreshExpression();
    render();
    updateAttackButton();
}