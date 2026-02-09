/* UI — Optimized: build DOM once, patch in-place */

let _diceEls = {}; // cache: die.id → DOM element

/** Called ONCE when game starts — creates all dice elements */
function initRender() {
    _diceEls = {};
    buildDiceRow('youDiceRow', state.youDice, 1);
    buildDiceRow('oppDiceRow', state.opponentDice, 2);
    document.getElementById('youAttackRow').innerHTML = '';
    document.getElementById('oppAttackRow').innerHTML = '';
}

// SVG Cache
const _iconCache = {};

function getDieIcon(sides, value) {
    const key = `${sides}-${value}`;
    if (_iconCache[key]) return _iconCache[key];

    // Helper to round polygon corners
    const roundPoly = (points, r) => {
        // points: array of [x,y] arrays
        let d = "";
        const len = points.length;
        for (let i = 0; i < len; i++) {
            const curr = points[i];
            const prev = points[(i - 1 + len) % len];
            const next = points[(i + 1) % len];

            // Vectors
            const v1 = { x: prev[0] - curr[0], y: prev[1] - curr[1] };
            const v2 = { x: next[0] - curr[0], y: next[1] - curr[1] };

            // Normalize
            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

            // Clamp radius to half of shortest edge to avoid intersection
            const usedR = Math.min(r, len1 / 2, len2 / 2);

            const n1 = { x: v1.x / len1, y: v1.y / len1 };
            const n2 = { x: v2.x / len2, y: v2.y / len2 };

            // Start of curve (on incoming edge)
            const start = { x: curr[0] + n1.x * usedR, y: curr[1] + n1.y * usedR };
            // End of curve (on outgoing edge)
            const end = { x: curr[0] + n2.x * usedR, y: curr[1] + n2.y * usedR };

            if (i === 0) d += `M ${start.x},${start.y} `;
            else d += `L ${start.x},${start.y} `;

            // Quadratic Bezier to end point, control is current vertex
            d += `Q ${curr[0]},${curr[1]} ${end.x},${end.y} `;
        }
        d += "Z";
        return d;
    };

    let shape = '';
    const r = 6; // ~10% of 64px

    switch (sides) {
        case 4: // Triangle
            shape = `<path d="${roundPoly([[32, 8], [56, 52], [8, 52]], r)}" class="die-shape" />`;
            break;
        case 6: // Square (already has rx)
            shape = `<rect x="8" y="8" width="48" height="48" rx="${r}" class="die-shape" />`;
            break;
        case 8: // Diamond
            shape = `<path d="${roundPoly([[32, 4], [58, 32], [32, 60], [6, 32]], r)}" class="die-shape" />`;
            break;
        case 10: // Kite
            shape = `<path d="${roundPoly([[32, 4], [56, 24], [32, 60], [8, 24]], r)}" class="die-shape" />`;
            break;
        case 12: // Pentagon
            shape = `<path d="${roundPoly([[32, 4], [59, 24], [49, 56], [15, 56], [5, 24]], r)}" class="die-shape" />`;
            break;
        case 20: // Hexagon
            shape = `<path d="${roundPoly([[32, 4], [58, 18], [58, 46], [32, 60], [6, 46], [6, 18]], r)}" class="die-shape" />`;
            break;
    }
    const svg = `<svg class="die-svg" viewBox="0 0 64 64">${shape}<text x="32" y="32" class="die-text">${value}</text></svg>`;
    _iconCache[key] = svg;
    return svg;
}

function buildDiceRow(containerId, dice, player) {
    const c = document.getElementById(containerId);
    c.innerHTML = '';
    dice.forEach((die, idx) => {
        const el = document.createElement('div');
        el.className = `die ${die.name} ${player === 1 ? 'you-die' : 'opp-die'}`; // Add player class for color
        if (die.captured) el.classList.add('captured');
        el.dataset.id = die.id;
        el.setAttribute('tabindex', die.captured ? '-1' : '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `D${die.sides}: ${die.captured ? 'captured' : die.value}`);

        el.innerHTML = die.captured
            ? `<span class="die-value">—</span><span class="die-label">D${die.sides}</span>`
            : getDieIcon(die.sides, die.value);

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
    renderAttackZones();
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

        const isSelected = !die.captured && isMe && state.selectedDice.includes(die.id);

        el.classList.toggle('captured', die.captured);
        el.classList.toggle('selected', isSelected);
        el.classList.toggle('in-attack', isSelected); // dim in home row when in attack zone
        el.classList.toggle('target', !die.captured && isTgt && state.targetDie === die.id);
        el.classList.toggle('valid-attack',
            !die.captured && isMe && validIds.has(die.id) && !state.selectedDice.includes(die.id));

        const valEl = el.querySelector('.die-text') || el.querySelector('.die-value'); // Fallback for captured text
        if (valEl) valEl.textContent = die.captured ? '—' : die.value;

        // Use simpler logic for SVG updates - if captured, we might need to swap innerHTML if we want to show '—'
        // But for now, let's just assume the text update works or if captured it shows '—'
        if (die.captured && el.innerHTML.includes('<svg')) {
            el.innerHTML = `<span class="die-value">—</span><span class="die-label">D${die.sides}</span>`;
        }

        el.setAttribute('tabindex', die.captured ? '-1' : '0');
        el.setAttribute('aria-label', `D${die.sides}: ${die.captured ? 'captured' : die.value}`);

        if (!die.captured && !state.aiThinking && !isSelected) {
            const click = () => { SFX.select(); handleDieClick(die, player); };
            el.onclick = click;
            el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } };
        } else if (isSelected && isMe) {
            // Clicking selected die deselects it
            const click = () => { SFX.select(); handleDieClick(die, player); };
            el.onclick = click;
            el.onkeydown = null;
        } else {
            el.onclick = null;
            el.onkeydown = null;
        }
    });
}

/** Render attack zones — always 6 slots, patch existing DOM */
function renderAttackZones() {
    const youRow = document.getElementById('youAttackRow');
    const oppRow = document.getElementById('oppAttackRow');

    const activeRow = state.currentPlayer === 1 ? youRow : oppRow; // Attacker
    const targetRow = state.currentPlayer === 1 ? oppRow : youRow; // Defender (Target)

    // Helper to patch a row with dice
    const patchRow = (rowEl, items, isAttacker) => {
        // Ensure we have exactly 6 slots
        while (rowEl.children.length < 6) {
            const div = document.createElement('div');
            div.className = 'attack-slot';
            rowEl.appendChild(div);
        }

        for (let i = 0; i < 6; i++) {
            const slotEl = rowEl.children[i];
            const item = items[i];

            if (item) {
                // Item exists for this slot
                const isYou = state.currentPlayer === 1;
                // Determine class based on role (Attacker vs Target)
                // If isAttacker=true: matches current player (you-die if P1, opp-die if P2)
                // If isAttacker=false: matches target (opposite)
                // Actually, let's stick to the visual logic from before:
                // Attacker Row: P1=you-die, P2=opp-die
                // Target Row: P1=opp-die, P2=you-die

                let cls = `attack-die ${item.name} `;
                if (isAttacker) {
                    cls += (state.currentPlayer === 1) ? 'you-die' : 'opp-die';
                } else {
                    cls += (state.currentPlayer === 1) ? 'opp-die' : 'you-die';
                }

                // Check if we need to update (simple diff by ID to avoid unnecessary DOM touches)
                // We store the ID on the slot if it's a die
                if (slotEl.dataset.id !== item.id || !slotEl.classList.contains('attack-die')) {
                    slotEl.className = cls;
                    slotEl.innerHTML = getDieIcon(item.sides, item.value);
                    slotEl.dataset.id = item.id;
                    slotEl.style.cursor = isAttacker && state.currentPlayer === 1 ? 'pointer' : 'default';

                    // Event listeners
                    if (isAttacker && state.currentPlayer === 1) {
                        slotEl.onclick = () => { SFX.select(); handleDieClick(item, state.currentPlayer); };
                    } else {
                        slotEl.onclick = null;
                    }
                }
            } else {
                // Empty slot
                if (slotEl.className !== 'attack-slot') {
                    slotEl.className = 'attack-slot';
                    slotEl.innerHTML = '';
                    delete slotEl.dataset.id;
                    slotEl.onclick = null;
                    slotEl.style.cursor = 'default';
                }
            }
        }
    };

    // Prepare items for Attacker Row (Selected Dice)
    const attackerItems = [];
    for (let i = 0; i < 6; i++) {
        const selId = state.selectedDice[i];
        const die = selId ? (state.currentPlayer === 1 ? state.youDice : state.opponentDice).find(d => d.id === selId) : null;
        attackerItems.push(die);
    }
    patchRow(activeRow, attackerItems, true);

    // Prepare items for Target Row (Target Die in slot 0)
    const targetItems = [null, null, null, null, null, null];
    if (state.targetDie) {
        const targetOwnerDice = state.currentPlayer === 1 ? state.opponentDice : state.youDice;
        const die = targetOwnerDice.find(d => d.id === state.targetDie && !d.captured);
        if (die) targetItems[0] = die;
    }
    patchRow(targetRow, targetItems, false);
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
    if (state.attackType === type) return; // already in this mode
    SFX.click();

    // When switching Strength → Mind, carry over the selected die
    if (state.attackType === 'strength' && type === 'mind' && state.selectedDice.length === 1) {
        const dieId = state.selectedDice[0];
        const die = myDice().find(d => d.id === dieId && !d.captured);
        state.attackType = type;
        if (die) {
            state.expression = [{ type: 'die', id: die.id, value: die.value }];
            // selectedDice stays as-is
        } else {
            state.selectedDice = [];
            state.expression = [];
        }
    } else {
        state.attackType = type;
        state.selectedDice = [];
        state.expression = [];
    }

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