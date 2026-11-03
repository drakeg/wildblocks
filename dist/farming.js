import { HEIGHT } from "./world.js";
import { CROP_SECONDS } from './food.js';
export function cropStage(growth) { return Math.min(3,Math.floor(growth/CROP_SECONDS*3)); }
export function farmAction(world,player,hit,action,mode='survival') {
  if(!hit||!Number.isFinite(hit.distance)||hit.distance<0||hit.distance>5||world.get(hit.x,hit.y,hit.z)!==hit.id)return {ok:false,error:'Move closer and point at your farm.'};
  const {x,y,z,id}=hit,key=`${x},${y},${z}`;
  if(action==='till') {
    if(![1,2].includes(id)||y===0||world.get(x,y+1,z))return {ok:false,error:'Till exposed meadow or earth.'};
    if(mode!=='creative'&&!player.tools.has('timber-hoe'))return {ok:false,error:'Craft a Timber hoe first.'};
    world.set(x,y,z,27);return {ok:true,message:'Soil tilled · R to plant a seed.'};
  }
  if(action==='plant') {
    if(id!==27||!world.inside(x,y+1,z)||world.get(x,y+1,z)||world.crops.size>=256)return {ok:false,error:'Plant in an empty tilled plot (maximum 256 crops).'};
    if(mode!=='creative'&&!player.bag.counts[31])return {ok:false,error:'Mine wild meadow to find seeds, then walk over them.'};
    world.set(x,y+1,z,28);world.crops.set(`${x},${y+1},${z}`,{x,y:y+1,z,growth:mode==='creative'?CROP_SECONDS:0});
    if(mode!=='creative'){player.bag.counts[31]--;player.bag.syncOrder();}
    return {ok:true,message:'Seed planted · grows with daylight and open sky.'};
  }
  if(action==='harvest') {
    const crop=world.crops.get(key);
    if(id!==28||!crop)return {ok:false,error:'Point at a crop.'};
    if(crop.growth<CROP_SECONDS)return {ok:false,error:`Growing · stage ${cropStage(crop.growth)+1}/4. Needs daylight and open sky.`};
    world.removeCrop(x,y,z,mode!=='creative');
    if(mode!=='creative')player.skills.earn('Farming',20);
    return {ok:true,message:'Harvest dropped · walk over to collect grain and seeds.'};
  }
  return {ok:false,error:'Unknown farming action.'};
}
export function updateCrops(world,dt,daylight) {
  if(!Number.isFinite(dt)||dt<=0||daylight<.2)return false;
  let changed=false;
  for(const crop of world.crops.values()) {
    if(crop.growth>=CROP_SECONDS)continue;
    let shaded=false;for(let y=crop.y+1;y<HEIGHT;y++)if(world.get(crop.x,y,crop.z)){shaded=true;break;}
    if(shaded)continue;
    const stage=cropStage(crop.growth);crop.growth=Math.min(CROP_SECONDS,crop.growth+Math.min(dt,CROP_SECONDS));
    if(cropStage(crop.growth)!==stage)changed=true;
  }
  if(changed)world.revision++;
  return changed;
}
