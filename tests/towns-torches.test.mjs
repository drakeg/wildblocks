import test from 'node:test';
import assert from 'node:assert/strict';
import {World,raycast,collides,MATERIALS} from '../dist/world.js';
import {Gathering} from '../dist/gathering.js';
import {Drops} from '../dist/drops.js';
import {SUPPLY_REGEN_MS} from '../dist/settlements.js';
import {craft,craftProblem,RECIPES} from '../dist/crafting.js';
import {Progression} from '../dist/progression.js';
import {miningRule} from '../dist/tools.js';

test('wall torches occupy no voxel, are independently targeted, and drop exactly once with their support',()=>{
 const w=new World('torch-test',1),bag=new Gathering(),drops=new Drops();w.set(32,14,30,4);bag.add(10,2);
 const face={x:32,y:14,z:30,id:4,distance:1.5,normal:{x:0,y:0,z:1}};
 assert(bag.placeTorch(w,face));assert.equal(bag.counts[10],1);assert.equal(w.get(32,14,31),0);
 assert.equal(collides(w,{x:32.5,y:13.05,z:31.5}),false);assert.equal(bag.placeTorch(w,face),false);assert.equal(bag.counts[10],1);
 const hit=raycast(w,{x:32.5,y:14.6,z:32.5},{x:0,y:0,z:-1},5);assert(hit.torchKey);
 let mined;for(let n=0;n<4;n++)mined=bag.mine(w,hit,.1,true)||mined;
 assert.equal(mined.id,10);assert.equal(w.get(32,14,30),4);assert.equal(w.torches.size,0);
 assert(bag.placeTorch(w,face));w.set(32,14,30,0);assert.equal(w.torches.size,0);w.flushDrops(drops);w.flushDrops(drops);
 assert.equal(drops.items.filter(d=>d.id===10).length,1);
});
test('attachments and queued drops survive reload; old voxel torches migrate without adding towns to legacy worlds',()=>{
 const w=new World('legacy',1);w.set(32,13,30,4);assert(w.attachTorch(32,13,30,0,0,1));
 const restored=World.restore(w.snapshot());assert.equal(restored.torches.size,1);
 restored.set(32,13,30,0);const again=World.restore(restored.snapshot()),drops=new Drops();again.flushDrops(drops);assert.equal(drops.items.length,1);
 const old={format:'wildblocks',version:1,seed:'legacy',edits:[[32,13,30,4],[32,14,30,10]]};
 const migrated=World.restore(old);assert.equal(migrated.torches.size,1);assert.equal(migrated.get(32,14,30),0);assert.equal(migrated.towns.length,0);
});
test('towns are seeded, made from usable blocks, and contain stations and harvestable supplies',()=>{
 const a=new World('settled'),b=new World('settled'),c=new World('another-settlement');
 assert.deepEqual(a.towns,b.towns);assert.notDeepEqual(a.towns,c.towns);assert.equal(a.towns.length,2);assert.equal(a.supplies.length,6);
 for(const s of a.supplies){assert.equal(a.get(s.x,s.y,s.z),19);assert.equal(a.get(s.x,s.y-1,s.z),8);}
 assert(a.data.includes(7));assert(a.data.includes(4));assert(a.data.includes(9));assert(a.data.includes(15));assert(a.data.includes(11));assert(a.data.includes(12));
 assert.deepEqual(World.restore(a.snapshot()).snapshot(),a.snapshot());
});
test('supply harvests produce physical resources, persist three-hour timers, and never overwrite player construction',()=>{
 const w=new World('supply-test'),site=w.supplies[0],now=100000,drops=new Drops();
 w.harvestSupply(site.x,site.y,site.z,now);w.set(site.x,site.y,site.z,0);w.flushDrops(drops);
 assert.equal(drops.items.length,site.loot.reduce((sum,[,n])=>sum+n,0));assert(drops.items.every(d=>d.id!==19));
 const restored=World.restore(w.snapshot());assert.equal(restored.supplies[0].nextAt,now+SUPPLY_REGEN_MS);
 assert.equal(restored.updateSupplies(now+SUPPLY_REGEN_MS-1),false);
 restored.set(site.x,site.y,site.z,7);assert.equal(restored.updateSupplies(now+SUPPLY_REGEN_MS+1),false);assert.equal(restored.get(site.x,site.y,site.z),7);
 restored.set(site.x,site.y,site.z,0);assert.equal(restored.updateSupplies(now+SUPPLY_REGEN_MS+2,[{x:site.x+.5,y:site.y,z:site.z+.5}]),false);assert(restored.updateSupplies(now+SUPPLY_REGEN_MS+2));assert.equal(restored.get(site.x,site.y,site.z),19);
});
test('advanced crafting requires real skill and stations, costs resources, and unlocks the harder ore tier',()=>{
 const bag=new Gathering(),p=new Progression(),tools=new Set();for(const [id,n] of [[3,20],[7,20],[11,10],[13,20],[12,10]])bag.add(id,n);
 const furnace=RECIPES.find(r=>r.key==='furnace');assert.match(craftProblem(furnace,bag,tools,'survival',true,p),/level 3/);
 assert.equal(craft('furnace',bag,tools,p,'survival',true),false);p.earn('Crafting',100);assert(craft('furnace',bag,tools,p,'survival',true));
 assert.equal(craft('smelt-iron',bag,tools,p,'survival'),false);assert(craft('smelt-iron',bag,tools,p,'survival',false,[15]));
 p.earn('Crafting',400);assert.equal(craft('iron-pick',bag,tools,p,'survival',true),false);assert(craft('iron-pick',bag,tools,p,'survival',false,[16]));
 assert.equal(miningRule({id:11},new Set(['wood-pick'])).allowed,false);assert.equal(miningRule({id:11},new Set(['slate-pick'])).allowed,true);
 assert.equal(miningRule({id:12},new Set(['slate-pick'])).allowed,false);assert.equal(miningRule({id:12},tools).allowed,true);
 assert.equal(bag.place(new World(),32,13,30,13,{x:20,y:20,z:20}),false);assert.equal(bag.counts.length,MATERIALS.length);
});
