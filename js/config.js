const DICE_CONFIG=[{sides:4,name:'d4'},{sides:6,name:'d6'},{sides:8,name:'d8'},{sides:10,name:'d10'},{sides:12,name:'d12'},{sides:20,name:'d20'}];
const AI_CONFIG={
    easy:{name:'Easy',thinkTime:[600,1200],optimalChance:0.3,mindAttackChance:0.2,prioritizeHigh:false,maxOperators:1,defensive:false},
    medium:{name:'Medium',thinkTime:[800,1500],optimalChance:0.6,mindAttackChance:0.5,prioritizeHigh:true,maxOperators:2,defensive:false},
    hard:{name:'Hard',thinkTime:[1000,2000],optimalChance:0.85,mindAttackChance:0.7,prioritizeHigh:true,maxOperators:3,defensive:true},
    impossible:{name:'Impossible',thinkTime:[600,1000],optimalChance:1.0,mindAttackChance:0.9,prioritizeHigh:true,maxOperators:5,defensive:true}
};
const GAME_DURATION=12*60;
