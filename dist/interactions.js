import { MATERIALS, raycast } from './world.js';
import { SUPPLY_REGEN_MS } from './settlements.js';
export const INTERACT_REACH=5;
export function canReachContainer(world,position,x,y,z) {
 if(!world.inside(x,y,z)||![19,24].includes(world.get(x,y,z)))return false;
 const eye={x:position.x,y:position.y+1.62,z:position.z};
 const closest={x:Math.max(x,Math.min(x+1,eye.x)),y:Math.max(y,Math.min(y+1,eye.y)),z:Math.max(z,Math.min(z+1,eye.z))};
 if(Math.hypot(closest.x-eye.x,closest.y-eye.y,closest.z-eye.z)>INTERACT_REACH)return false;
 const dx=x+.5-eye.x,dy=y+.5-eye.y,dz=z+.5-eye.z,n=Math.hypot(dx,dy,dz);
 if(n<.001)return true;
 const hit=raycast(world,eye,{x:dx/n,y:dy/n,z:dz/n},n+.01,false);
 return !!hit&&hit.x===x&&hit.y===y&&hit.z===z;
}
export function containerView(world,x,y,z) {
 const c=world.ensureContainer(x,y,z);if(!c)return null;
 c.order=c.order.filter(id=>c.counts[id]>0);
 for(let id=1;id<c.counts.length;id++)if(c.counts[id]>0&&!c.order.includes(id))c.order.push(id);
 const site=world.supplies.find(s=>s.x===x&&s.y===y&&s.z===z);
 return {x,y,z,kind:world.get(x,y,z),title:site?site.town+' · Town supplies':'Storage chest',capacity:27,counts:[...c.counts],order:[...c.order],nextAt:site?.nextAt??0};
}
export function transferContainer(world,bag,{x,y,z,id,count,direction},now=Date.now()) {
 const c=world.ensureContainer(x,y,z);
 if(!c||!Number.isInteger(id)||id<1||id>=MATERIALS.length||[19,25].includes(id)||!Number.isInteger(count)||count<1||count>9999||!['take','store'].includes(direction))return {error:'Invalid storage transfer.'};
 if(direction==='store'&&world.get(x,y,z)===19)return {error:'Town crates are loot only. Use a chest to store your items.'};
 const source=direction==='take'?c.counts:bag.counts,target=direction==='take'?bag.counts:c.counts;
 const amount=Math.min(count,source[id],9999-target[id]);
 if(amount<=0)return {error:'Nothing to move, or that stack is full.'};
 const next=[...target];next[id]+=amount;
 if(direction==='take'&&!bag.canFit(next))return {error:'Your backpack is full. Free a slot first.'};
 if(direction==='store'&&next.filter(n=>n>0).length>27)return {error:'Chest full.'};
 source[id]-=amount;target[id]+=amount;bag.syncOrder();
 c.order=c.order.filter(item=>c.counts[item]>0);if(c.counts[id]>0&&!c.order.includes(id))c.order.push(id);
 if(world.get(x,y,z)===19&&!c.counts.some(n=>n>0)) {
  const site=world.supplies.find(s=>s.x===x&&s.y===y&&s.z===z);if(site&&!site.nextAt)site.nextAt=now+SUPPLY_REGEN_MS;
 }
 world.revision++;return {amount};
}
