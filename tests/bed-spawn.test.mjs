import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../dist/world.js';
import { bindBed, bedLanding, respawnLocation, savedBed } from '../dist/bed-spawn.js';
import { Survival, playerVitals } from '../dist/survival.js';
import { vitalsSnapshot } from '../dist/food.js';

function bedroom() {
  const w=new World('bed-spawn-test',1);
  // Build a level, unobstructed room independently of random terrain.
  for(let x=27;x<=37;x++)for(let z=27;z<=37;z++)for(let y=12;y<=20;y++)w.set(x,y,z,y===12?7:0);
  assert(w.set(32,13,30,33));
  return w;
}
test('a placed bed sets a personal checkpoint; save roundtrip restores it',()=>{
  const w=bedroom(),v=playerVitals();
  assert.equal(bindBed(w,v,{x:32,y:13,z:30}),true);
  assert.deepEqual(v.respawnBed,{x:32,y:13,z:30});
  const saved=vitalsSnapshot(v);
  const restored=playerVitals(saved);
  assert.deepEqual(restored.respawnBed,v.respawnBed);
  assert.deepEqual(bedLanding(World.restore(w.snapshot()),restored.respawnBed),{x:32.5,y:13.05,z:31.5});
  const other=playerVitals();
  assert.equal(other.respawnBed,null);
});
test('removed or blocked beds fall back safely to camp',()=>{
  const w=bedroom(),v=playerVitals();
  assert(bindBed(w,v,{x:32,y:13,z:30}));
  assert.deepEqual(respawnLocation(w,v),{x:32.5,y:13.05,z:31.5});
  // Obstruct all eight candidate cells with solid blocks.
  for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]])w.set(32+dx,13,30+dz,7);
  assert.equal(bedLanding(w,v.respawnBed),null);
  assert.deepEqual(respawnLocation(w,v),{x:32.5,y:w.surface(32,32)+.05,z:32.5});
  w.set(32,13,30,0);assert.equal(bedLanding(w,v.respawnBed),null);
  assert.equal(bindBed(w,v,{x:32,y:13,z:30}),false);
});
test('invalid stored bed coordinates cannot force a teleport',()=>{
 const w=bedroom();
 for(const coord of [null,{x:1.2,y:13,z:30},{x:Infinity,y:13,z:30},{x:999,y:13,z:30},{x:32,y:13,z:30,extra:1}]) {
   if(coord?.extra)continue;
   assert.equal(savedBed(coord),null);
 }
 const v=playerVitals({respawnBed:{x:999,y:13,z:30}});
 assert.equal(v.respawnBed,null);
 assert.deepEqual(respawnLocation(w,v),{x:32.5,y:w.surface(32,32)+.05,z:32.5});
});
test('fatal creature damage respawns beside a valid bed',()=>{
 const w=bedroom(),v=playerVitals({health:1,respawnBed:{x:32,y:13,z:30}});
 const player={position:{x:32.5,y:13.05,z:32.5},active:true,tools:new Set(),vitals:v};
 const s=new Survival({elapsed:400});
 s.monsters=[{id:1,position:{x:32.5,y:13.05,z:31.6},velocity:{x:0,y:0,z:0},health:12,attack:0}];
 s.update(w,.05,[player]);
 assert.equal(v.respawns,1);assert.deepEqual(player.position,{x:32.5,y:13.05,z:31.5});
});
