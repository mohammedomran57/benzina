/* Damped Holt trend model. Inputs and outputs use thousands of litres/day.
   No fitting claims: alpha/beta/phi are explicit fixed demo parameters. */
(function(root){
  const defaults = {alpha:0.45,beta:0.15,phi:0.9};
  function forecast(history,horizon,params=defaults){
    if(!Array.isArray(history)||history.length<2||history.some(x=>!Number.isFinite(x)||x<0))throw new Error('At least two non-negative finite observations required');
    if(!Number.isInteger(horizon)||horizon<1||horizon>30)throw new Error('Horizon must be 1–30 days');
    const {alpha,beta,phi}={...defaults,...params};
    if([alpha,beta,phi].some(x=>!Number.isFinite(x)||x<0||x>1))throw new Error('Parameters must be between 0 and 1');
    let level=history[0],trend=history[1]-history[0];
    for(let i=1;i<history.length;i++){const previous=level;level=alpha*history[i]+(1-alpha)*(level+phi*trend);trend=beta*(level-previous)+(1-beta)*phi*trend;}
    let damping=0;return Array.from({length:horizon},(_,i)=>{damping+=phi**(i+1);return Math.max(0,level+damping*trend);});
  }
  function validate(history,holdout=7){
    if(history.length<holdout+2)throw new Error('Insufficient history for holdout');
    const train=history.slice(0,-holdout),actual=history.slice(-holdout),predicted=forecast(train,holdout);
    const mae=predicted.reduce((sum,n,i)=>sum+Math.abs(n-actual[i]),0)/holdout;
    const naiveMAE=actual.reduce((sum,n)=>sum+Math.abs(n-train.at(-1)),0)/holdout;
    return {mae,naiveMAE,predicted,actual};
  }
  function inventory(demand,{dailySupply,openingStock,delay=0,supplyChange=0,demandChange=0}){
    if([dailySupply,openingStock,delay,supplyChange,demandChange].some(x=>!Number.isFinite(x))||dailySupply<0||openingStock<0||delay<0||!Number.isInteger(delay)||supplyChange< -100||demandChange< -100||demand.some(x=>!Number.isFinite(x)||x<0))throw new Error('Invalid scenario');
    let stock=openingStock;
    return demand.map((base,i)=>{const requested=base*(1+demandChange/100),supply=i<delay?0:dailySupply*(1+supplyChange/100);const available=stock+supply,unmet=Math.max(0,requested-available);stock=Math.max(0,available-requested);return {day:i+1,demand:requested,supply,stock,unmet};});
  }
  const api={forecast,validate,inventory,defaults};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FuelForecast=api;
})(globalThis);
