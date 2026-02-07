const OP_DISPLAY={'+':'+','-':'−','*':'×','/':'÷'};
function addOperator(op){if(state.attackType!=='mind'||state.aiThinking||!state.expression.length)return;const l=state.expression[state.expression.length-1];if(l.type==='paren'&&l.value==='(')return;if(l.type==='op')l.value=op;else state.expression.push({type:'op',value:op});refreshExpression()}
function addParen(p){if(state.attackType!=='mind'||state.aiThinking)return;const e=state.expression;
    if(p==='('){const l=e[e.length-1];if(!e.length||(l&&l.type==='op')||(l&&l.type==='paren'&&l.value==='('))e.push({type:'paren',value:'('})}
    else{const l=e[e.length-1];if(!l)return;if(l.type==='die'||(l.type==='paren'&&l.value===')')){const o=e.filter(x=>x.type==='paren'&&x.value==='(').length,c=e.filter(x=>x.type==='paren'&&x.value===')').length;if(o>c)e.push({type:'paren',value:')'})}}
    refreshExpression()}
function undoExpression(){if(state.attackType!=='mind'||state.aiThinking||!state.expression.length)return;const r=state.expression.pop();if(r.type==='die'){const i=state.selectedDice.indexOf(r.id);if(i>-1)state.selectedDice.splice(i,1)}refreshExpression();render()}
function refreshExpression(){
    const d=document.getElementById('exprDisplay'),r=document.getElementById('exprEval');
    if(!state.expression.length){d.innerHTML='<span class="expr-empty">Select dice &amp; type operators…</span>';r.hidden=true;updateAttackButton();return}
    d.innerHTML=state.expression.map(e=>{if(e.type==='die')return`<span class="expr-val">${e.value}</span>`;if(e.type==='op')return`<span class="expr-op">${OP_DISPLAY[e.value]}</span>`;if(e.type==='paren')return`<span class="expr-paren">${e.value}</span>`;return''}).join('');
    if(state.attackType==='mind'){const v=evaluate();if(v!==null){r.hidden=false;const t=getTarget();if(t&&v===t.value){r.className='expr-eval valid';r.textContent=`= ${v} ✓`}else{r.className='expr-eval invalid';r.textContent=`= ${v}`}}else r.hidden=true}
    updateAttackButton()}
function evaluate(){const e=state.expression;if(!e.length||e[e.length-1].type==='op')return null;const o=e.filter(x=>x.type==='paren'&&x.value==='(').length,c=e.filter(x=>x.type==='paren'&&x.value===')').length;if(o!==c)return null;try{const s=e.map(x=>x.value).join('');const r=Function('"use strict";return('+s+')')();return Number.isFinite(r)&&Number.isInteger(r)?r:null}catch{return null}}
function getTarget(){if(!state.targetDie)return null;return oppDice().find(d=>d.id===state.targetDie&&!d.captured)}
function getSelected(){return state.selectedDice.map(id=>myDice().find(d=>d.id===id)).filter(d=>d&&!d.captured)}
function updateAttackButton(){const btn=document.getElementById('btnAttack'),t=getTarget(),sel=getSelected();let ok=false;
    if(t&&sel.length>0){if(state.attackType==='strength'){if(sel.length!==1){btn.disabled=true;return}const isL=activeDice(oppDice()).length===1,isS=state.currentPlayer===state.firstPlayer;ok=(isL&&isS)?sel[0].value>t.value:sel[0].value>=t.value}else{ok=sel.length>=2&&evaluate()===t.value}}
    btn.disabled=!ok||state.aiThinking}