let settings={mode:'ai',difficulty:'easy'};let state=null;
function rollDie(s){return Math.floor(Math.random()*s)+1}
function createFreshState(){
    const s={currentPlayer:1,firstPlayer:1,attackType:'strength',selectedDice:[],targetDie:null,expression:[],
        youDice:DICE_CONFIG.map((d,i)=>({id:`you_${i}`,sides:d.sides,name:d.name,value:rollDie(d.sides),captured:false})),
        opponentDice:DICE_CONFIG.map((d,i)=>({id:`opp_${i}`,sides:d.sides,name:d.name,value:rollDie(d.sides),captured:false})),
        gameOver:false,aiThinking:false,timeRemaining:GAME_DURATION,moveCount:0};
    s.youDice.sort((a,b)=>a.value-b.value);s.opponentDice.sort((a,b)=>a.value-b.value);return s;
}
function determineFirstPlayer(st){
    const y=st.youDice.map(d=>d.value),o=st.opponentDice.map(d=>d.value);
    for(let i=0;i<y.length;i++){if(y[i]<o[i])return 1;if(o[i]<y[i])return 2;}return 1;
}
function myDice(){return state.currentPlayer===1?state.youDice:state.opponentDice}
function oppDice(){return state.currentPlayer===1?state.opponentDice:state.youDice}
function activeDice(a){return a.filter(d=>!d.captured)}