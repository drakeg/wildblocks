import { collides } from './world.js';
import { validPlayerPosition } from './player-state.js';

// A bed is a personal checkpoint, not an arbitrary client-provided teleport position.
export function savedBed(value) {
  if (!value || typeof value !== 'object' || !['x','y','z'].every(k => Number.isInteger(value[k]) && value[k] >= 0 && value[k] < (k === 'y' ? 40 : 64))) return null;
  return {x:value.x,y:value.y,z:value.z};
}
export function bedLanding(world, value) {
  const bed=savedBed(value);
  if (!bed || world.get(bed.x,bed.y,bed.z)!==33) return null;
  for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
    const x=bed.x+dx,z=bed.z+dz,y=bed.y+.05;
    const position={x:x+.5,y,z:z+.5};
    if (validPlayerPosition(position) && world.get(x,bed.y-1,z)!==0 && !collides(world,position)) return position;
  }
  return null;
}
export function bindBed(world,vitals,hit) {
  if (!hit || world.get(hit.x,hit.y,hit.z)!==33) return false;
  const selected={x:hit.x,y:hit.y,z:hit.z};
  if(!bedLanding(world,selected)) return false;
  vitals.respawnBed=selected;
  return true;
}
export function respawnLocation(world,vitals) {
  return bedLanding(world,vitals.respawnBed) ?? {x:32.5,y:world.surface(32,32)+.05,z:32.5};
}

export function respawnNotice(world,position,vitals) {
  const landing=bedLanding(world,vitals?.respawnBed);
  const atBed=landing && position && ['x','y','z'].every(axis=>
    Number.isFinite(position[axis]) && Math.abs(position[axis]-landing[axis])<=0.15);
  return atBed
    ? 'You respawned beside your bed. Your inventory is safe.'
    : 'You were rescued at camp. Your inventory is safe.';
}
