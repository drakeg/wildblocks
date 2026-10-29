import { collides, SIZE, HEIGHT } from './world.js';

export function validPlayerPosition(p) {
  return !!p && [p.x,p.y,p.z].every(Number.isFinite) &&
    p.x>=.3 && p.x<SIZE-.3 && p.z>=.3 && p.z<SIZE-.3 && p.y>=0 && p.y<HEIGHT+2;
}
export function validDirection(d) {
  return !!d && [d.x,d.y,d.z].every(Number.isFinite) && Math.abs(Math.hypot(d.x,d.y,d.z)-1)<.02;
}
export function viewDirection(yaw,pitch) {
  return {x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
}
export function directionView(direction) {
  if(!validDirection(direction))return {yaw:0,pitch:-.15};
  return {yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.max(-1.5,Math.min(1.5,Math.asin(Math.max(-1,Math.min(1,direction.y)))))};
}
export function playerSnapshot(position,yaw,pitch) {
  return {position:{...position},yaw,pitch};
}
export function resumePlayer(world,saved) {
  const view={yaw:Number.isFinite(saved?.yaw)?saved.yaw:0,pitch:Number.isFinite(saved?.pitch)?Math.max(-1.5,Math.min(1.5,saved.pitch)):-.15};
  const p=saved?.position;
  if(validPlayerPosition(p)) {
    // Preserve exact coordinates whenever possible, including an underground location.
    if(!collides(world,p))return {...view,position:{x:p.x,y:p.y,z:p.z}};
    // Tiny floor rounding and newly placed blocks should not send someone across the map.
    for(const dy of [.001,.01,.05,.1,.25,.5,1,1.5,2,3]) {
      const next={x:p.x,y:p.y+dy,z:p.z};
      if(validPlayerPosition(next)&&!collides(world,next))return {...view,position:next};
    }
    for(const radius of [.5,1,1.5,2,3])for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const next={x:p.x+dx*radius,y:p.y,z:p.z+dz*radius};
      if(validPlayerPosition(next)&&!collides(world,next))return {...view,position:next};
    }
  }
  return {...view,position:{x:32.5,y:world.surface(32,32)+.05,z:32.5}};
}
