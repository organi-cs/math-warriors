let settings={mode:'ai',difficulty:'easy',diceSort:'value',alwaysFirst:false,theme:'dark',luck:0};let state=null;
function rollDie(s){
    // luck: -3 to +3. Positive = bias toward higher rolls
    const L = settings.luck || 0;
    if (L === 0) return Math.floor(Math.random()*s)+1;
    // Roll multiple times and take best/worst based on luck
    const rolls = Math.abs(L) + 1;
    let vals = [];
    for (let i = 0; i < rolls; i++) vals.push(Math.floor(Math.random()*s)+1);
    return L > 0 ? Math.max(...vals) : Math.min(...vals);
}
function createFreshState(){
    const s={currentPlayer:1,firstPlayer:1,attackType:'strength',selectedDice:[],targetDie:null,expression:[],
        youDice:DICE_CONFIG.map((d,i)=>({id:`you_${i}`,sides:d.sides,name:d.name,value:rollDie(d.sides),captured:false})),
        opponentDice:DICE_CONFIG.map((d,i)=>({id:`opp_${i}`,sides:d.sides,name:d.name,value:rollDie(d.sides),captured:false})),
        gameOver:false,aiThinking:false,timeRemaining:GAME_DURATION,moveCount:0};
    const sortFn = settings.diceSort === 'type'
        ? (a,b) => a.sides - b.sides
        : (a,b) => a.value - b.value;
    s.youDice.sort(sortFn);s.opponentDice.sort(sortFn);return s;
}
function determineFirstPlayer(st){
    if (settings.alwaysFirst) return 1;
    const y=st.youDice.map(d=>d.value),o=st.opponentDice.map(d=>d.value);
    for(let i=0;i<y.length;i++){if(y[i]<o[i])return 1;if(o[i]<y[i])return 2;}return 1;
}
function myDice(){return state.currentPlayer===1?state.youDice:state.opponentDice}
function oppDice(){return state.currentPlayer===1?state.opponentDice:state.youDice}
function activeDice(a){return a.filter(d=>!d.captured)}