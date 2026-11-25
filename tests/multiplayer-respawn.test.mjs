import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../dist/world.js';
import { Survival, playerVitals } from '../dist/survival.js';
import { bindBed } from '../dist/bed-spawn.js';
import { vitalsSnapshot } from '../dist/food.js';

function arena() {
 const w = new World('two-player-defeat-test',1);
 for(let x=26;x<=40;x++)for(let z=26;z<=38;z++)for(let y=12;y<=20;y++)
   w.set(x,y,z,y===12?7:0);
 assert(w.set(30,13,30,33));
 assert(w.set(36,13,30,33));
 return w;
}
function player(x,bedX) {
 const vitals=playerVitals({health:1,hunger:20});
 const p={position:{x:x+.5,y:13.05,z:33.5},active:true,tools:new Set(),vitals};
 return {p,bed:{x:bedX,y:13,z:30}};
}
function monster(x,id) {
 return {id,position:{x:x+.5,y:13.05,z:32.6},velocity:{x:0,y:0,z:0},health:12,attack:0};
}
test('simultaneous fatal attacks respawn two players beside their own beds',()=>{
 const w=arena(),one=player(30,30),two=player(36,36);
 assert(bindBed(w,one.p.vitals,one.bed));
 assert(bindBed(w,two.p.vitals,two.bed));
 const s=new Survival({elapsed:400});
 s.spawnIn=100;
 s.monsters=[monster(30,1),monster(36,2)];
 s.update(w,.05,[one.p,two.p]);
 assert.equal(one.p.vitals.respawns,1);
 assert.equal(two.p.vitals.respawns,1);
 assert.deepEqual(one.p.position,{x:30.5,y:13.05,z:31.5});
 assert.deepEqual(two.p.position,{x:36.5,y:13.05,z:31.5});
 assert.deepEqual(one.p.vitals.respawnBed,one.bed);
 assert.deepEqual(two.p.vitals.respawnBed,two.bed);
 // A new save and restore preserves each checkpoint independently.
 assert.deepEqual(playerVitals(vitalsSnapshot(one.p.vitals)).respawnBed,one.bed);
 assert.deepEqual(playerVitals(vitalsSnapshot(two.p.vitals)).respawnBed,two.bed);
 assert.equal(World.restore(w.snapshot()).get(36,13,30),33);
});
test('blocking one bed forces only its owner to camp on defeat',()=>{
 const w=arena(),one=player(30,30),two=player(36,36);
 assert(bindBed(w,one.p.vitals,one.bed));
 assert(bindBed(w,two.p.vitals,two.bed));
 // All eight possible landings of the second bed are obstructed.
 for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]])
   assert(w.set(36+dx,13,30+dz,7));
 const s=new Survival({elapsed:400});
 s.spawnIn=100;
 s.monsters=[monster(30,1),monster(36,2)];
 s.update(w,.05,[one.p,two.p]);
 assert.equal(one.p.vitals.respawns,1);
 assert.equal(two.p.vitals.respawns,1);
 assert.deepEqual(one.p.position,{x:30.5,y:13.05,z:31.5});
 assert.deepEqual(two.p.position,{x:32.5,y:w.surface(32,32)+.05,z:32.5});
 assert.deepEqual(two.p.vitals.respawnBed,two.bed,'blocked bed remains the personal preference');
});
