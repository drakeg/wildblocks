import test from 'node:test';
import assert from 'node:assert/strict';
import { World,MATERIALS } from '../dist/world.js';
import { triggerSwitch } from '../dist/trigger-switch.js';
import { Gathering } from '../dist/gathering.js';
import { craft,RECIPES } from '../dist/crafting.js';
import { Progression } from '../dist/progression.js';
function stage(){
 const w=new World('switch-qa',1);
 for(let x=23;x<=39;x++)for(let z=23;z<=39;z++)for(let y=12;y<=18;y++)w.set(x,y,z,y===12?7:0);
 assert(w.set(31,13,30,34));assert(w.placeDoor(33,13,30));return w;
}
test('switch crafting is inexpensive and outputs multiple devices with no special station',()=>{
 const recipe=RECIPES.find(r=>r.key==='trigger-switch');
 assert(recipe);assert.equal(recipe.station,undefined);
 assert.equal(recipe.stationId,undefined);assert.equal(recipe.level,undefined);
 assert.deepEqual(recipe.cost,[[7,2],[3,1]]);assert.equal(recipe.output.count,2);
 const bag=new Gathering();bag.counts[7]=2;bag.counts[3]=1;bag.syncOrder();
 assert(craft('trigger-switch',bag,new Set(),new Progression(),'survival'));
 assert.equal(bag.counts[34],2);assert.equal(bag.counts[7],0);
 assert.equal(MATERIALS[34].name,'Trigger switch');
});
test('a trigger toggles nearby doors, restores from save, and respects occupied doorways',()=>{
 let world=stage();const hit={x:31,y:13,z:30,id:34};
 assert.equal(triggerSwitch(world,hit).ok,true);
 assert.equal(world.doors.get('33,13,30').open,true);
 world=World.restore(world.snapshot());assert.equal(world.get(31,13,30),34);
 assert.equal(world.doors.get('33,13,30').open,true);
 const blocked=triggerSwitch(world,hit,[{position:{x:33.5,y:13.05,z:30.5}}]);
 assert.equal(blocked.ok,false);assert.equal(world.doors.get('33,13,30').open,true);
 assert.equal(triggerSwitch(world,hit).ok,true);
 assert.equal(world.doors.get('33,13,30').open,false);
});
test('switches cannot operate faraway doors, and old saves load with new material',()=>{
 const world=stage();
 world.set(33,13,30,0);
 assert(world.placeDoor(39,13,36));
 assert.equal(triggerSwitch(world,{x:31,y:13,z:30,id:34}).ok,false);
 assert.equal(world.doors.get('39,13,36').open,false);
 assert.equal(triggerSwitch(world,{x:1,y:2,z:3,id:34}).ok,false);
 const old=world.snapshot();
 old.edits=old.edits.filter(e=>e[3]!==34);
 const restored=World.restore(old);
 assert.equal(restored.get(31,13,30),0);
});
