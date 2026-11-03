export const MAX_HUNGER = 20;
export const CROP_SECONDS = 240;
export const FOOD = {
  29: {name:'Grain',nutrition:2},
  30: {name:'Bread',nutrition:8},
  32: {name:'Berries',nutrition:3},
};
export function hungerValue(saved) {
  return Number.isFinite(saved) ? Math.max(0,Math.min(MAX_HUNGER,saved)) : MAX_HUNGER;
}
export function vitalsSnapshot(v) {
  return {health:v.health,respawns:v.respawns,hunger:hungerValue(v.hunger),starving:v.starving||0};
}
export function updateHunger(v,dt,active,mode) {
  if(!active||mode==='creative')return;
  v.hunger=Math.max(0,hungerValue(v.hunger)-dt/60);
  if(v.hunger<=0){v.starving=(v.starving||0)+dt;if(v.starving>=10){v.health=Math.max(1,v.health-1);v.starving=0;}}
  else v.starving=0;
}
export function eatFood(bag,vitals,id,mode='survival') {
  if(mode==='creative')return {ok:false,error:'Creative players do not get hungry.'};
  if(!Number.isInteger(id)||!FOOD[id]||!bag.counts[id])return {ok:false,error:'Select food from your backpack first.'};
  if(hungerValue(vitals.hunger)>=MAX_HUNGER-.001)return {ok:false,error:'You are already full.'};
  bag.counts[id]--;bag.syncOrder();vitals.hunger=Math.min(MAX_HUNGER,hungerValue(vitals.hunger)+FOOD[id].nutrition);vitals.starving=0;
  return {ok:true,name:FOOD[id].name};
}
