// Beginner automation: one inexpensive switch operates nearby timber doors.
// No wires, timers, credentials or arbitrary client-provided target coordinates.
export const SWITCH_REACH=3;
export function triggerSwitch(world,hit,players=[]) {
  if(!hit || world.get(hit.x,hit.y,hit.z)!==34) return {ok:false,message:'Aim at a Trigger Switch.'};
  const doors=[...world.doors.values()].filter(d=>
    Math.hypot(d.x-hit.x,d.y-hit.y,d.z-hit.z)<=SWITCH_REACH
  ).sort((a,b)=>Math.hypot(a.x-hit.x,a.y-hit.y,a.z-hit.z)-Math.hypot(b.x-hit.x,b.y-hit.y,b.z-hit.z));
  if(!doors.length)return {ok:false,message:'Place a timber door within 3 blocks of the switch.'};
  let changed=0;
  for(const d of doors)if(world.toggleDoor(d.x,d.y,d.z,players))changed++;
  return changed?{ok:true,count:changed,message:'Trigger activated · '+changed+' door'+(changed===1?'':'s')+' switched.'}:
    {ok:false,message:'Step clear of the doorway before closing it.'};
}
