import test from 'node:test';
import assert from 'node:assert/strict';
import {World,MATERIALS,collides} from '../dist/world.js';
import {Gathering} from '../dist/gathering.js';
import {Progression} from '../dist/progression.js';
import {playerVitals,Survival} from '../dist/survival.js';
import {FOOD,MAX_HUNGER,CROP_SECONDS,eatFood} from '../dist/food.js';
import {farmAction,updateCrops} from '../dist/farming.js';
import {Drops} from '../dist/drops.js';
import {craft} from '../dist/crafting.js';
const plot={x:32,y:12,z:30,id:1,distance:3};
function farmer(){const bag=new Gathering();bag.add(31,1);return {bag,tools:new Set(['timber-hoe']),skills:new Progression()};}

test('hunger migrates old saves, drains only while active, and never kills an idle or hungry player',()=>{
 const s=new Survival(),w=new World('food',1),p={position:{x:32.5,y:13.05,z:32.5},active:false,tools:new Set(),vitals:playerVitals()};
 assert.equal(p.vitals.hunger,MAX_HUNGER);p.vitals.hunger=0;p.vitals.health=2;
 for(let i=0;i<1200;i++)s.update(w,.1,[p]);assert.equal(p.vitals.health,2);
 p.active=true;for(let i=0;i<1200;i++)s.update(w,.1,[p]);assert.equal(p.vitals.health,1);
 p.vitals.hunger=20;for(let i=0;i<600;i++)s.update(w,.1,[p]);assert(p.vitals.hunger<20);
 const h=p.vitals.hunger;for(let i=0;i<100;i++)s.update(w,.1,[p],'creative');assert.equal(p.vitals.hunger,h);
});
test('eating spends one real food, rejects full/forged/empty items, and gates regeneration by hunger',()=>{
 const bag=new Gathering(),v=playerVitals();bag.add(30,2);assert.equal(eatFood(bag,v,30).ok,false);v.hunger=5;
 assert(eatFood(bag,v,30).ok);assert.equal(bag.counts[30],1);assert.equal(v.hunger,5+FOOD[30].nutrition);
 assert.equal(eatFood(bag,v,4).ok,false);assert.equal(eatFood(bag,v,32).ok,false);assert.equal(eatFood(bag,v,30,'creative').ok,false);
 const restored=playerVitals(v);assert.equal(restored.hunger,v.hunger);
 const s=new Survival({elapsed:60}),w=new World('food',1),p={active:true,position:{x:32,y:13,z:32},tools:new Set(),vitals:v};v.health=10;v.hunger=2;
 for(let i=0;i<70;i++)s.update(w,.1,[p]);assert.equal(v.health,10);v.hunger=20;for(let i=0;i<70;i++)s.update(w,.1,[p]);assert(v.health>10);
});
test('till, plant, grow in daylight, harvest physical drops and replant without duplication',()=>{
 const w=new World('farm',1),p=farmer();assert(farmAction(w,p,plot,'till').ok);assert.equal(w.get(32,12,30),27);
 assert(farmAction(w,p,{...plot,id:27},'plant').ok);assert.equal(p.bag.counts[31],0);assert.equal(w.get(32,13,30),28);
 assert.equal(collides(w,{x:32.5,y:13.05,z:30.5}),false);
 assert.equal(farmAction(w,p,{...plot,y:13,id:28},'harvest').ok,false);
 updateCrops(w,CROP_SECONDS,0);assert.equal([...w.crops.values()][0].growth,0);
 updateCrops(w,CROP_SECONDS,1);const restored=World.restore(w.snapshot());assert.equal([...restored.crops.values()][0].growth,CROP_SECONDS);
 assert(farmAction(restored,p,{...plot,y:13,id:28},'harvest').ok);assert.equal(restored.get(32,13,30),0);
 const drops=new Drops();restored.flushDrops(drops);assert.equal(drops.items.filter(d=>d.id===29).length,3);assert.equal(drops.items.filter(d=>d.id===31).length,2);
 assert.equal(farmAction(restored,p,{...plot,y:13,id:28},'harvest').ok,false);restored.flushDrops(drops);assert.equal(drops.items.length,5);
 assert.equal(p.bag.counts[29],0);assert(p.skills.skill('Farming').xp>0);
});
test('shade stops crop growth, support removal drops seeds, and old inventories/skills/chests migrate',()=>{
 const w=new World('farm',1),p=farmer();farmAction(w,p,plot,'till');farmAction(w,p,{...plot,id:27},'plant');w.set(32,16,30,7);
 updateCrops(w,100,1);assert.equal([...w.crops.values()][0].growth,0);w.set(32,16,30,0);updateCrops(w,100,1);assert.equal([...w.crops.values()][0].growth,100);
 w.set(32,12,30,0);assert.equal(w.get(32,13,30),0);assert.equal(w.crops.size,0);const drops=new Drops();w.flushDrops(drops);assert.equal(drops.items.filter(d=>d.id===31).length,1);
 assert.equal(new Gathering(Array(27).fill(0)).counts.length,MATERIALS.length);assert.equal(new Progression([0,0,0,0]).skill('Farming').xp,0);
 const old=new World('legacy',2).snapshot();old.containers.forEach(c=>c.counts=c.counts.slice(0,27));assert(World.restore(old));
});
test('bread requires grain, fuel and a furnace; farming needs a hoe and real seeds',()=>{
 const w=new World('farm',1),p=farmer();p.tools.clear();assert.equal(farmAction(w,p,plot,'till').ok,false);p.bag.add(7,4);assert(craft('timber-hoe',p.bag,p.tools,p.skills));
 p.bag.add(29,3);assert.equal(craft('bread',p.bag,p.tools,p.skills),false);assert(craft('bread',p.bag,p.tools,p.skills,'survival',false,[15]));assert.equal(p.bag.counts[30],2);assert.equal(p.bag.counts[29],0);
 assert(farmAction(w,p,plot,'till').ok);p.bag.counts[31]=0;assert.equal(farmAction(w,p,{...plot,id:27},'plant').ok,false);
});

test('wild gathering drops seeds once, while replaced meadow cannot generate more seeds',()=>{
 const w=new World('wild-seeds',1),bag=new Gathering(),hit={x:32,y:12,z:32,id:1,distance:1};
 let mined;for(let n=0;n<20&&!mined;n++)mined=bag.mine(w,hit,.1,true);assert(mined);assert.equal(w.pendingDrops.filter(d=>d.id===31).length,1);assert.equal(bag.counts[31],0);
 w.pendingDrops=[];w.set(32,12,32,1);mined=null;for(let n=0;n<20&&!mined;n++)mined=bag.mine(w,hit,.1,true);assert(mined);assert.equal(w.pendingDrops.length,0);
});
test('malformed crops are rejected and hunger does not pay a healing cost at full health',()=>{
 const w=new World('crop-validation',1),p=farmer();farmAction(w,p,plot,'till');farmAction(w,p,{...plot,id:27},'plant');
 const save=w.snapshot();assert.throws(()=>World.restore({...save,crops:[]}),/growth state/);assert.throws(()=>World.restore({...save,crops:[{...save.crops[0],growth:Infinity}]}),/crop state/);
 const s=new Survival({elapsed:60}),v=playerVitals(),player={active:true,position:{x:32,y:13,z:32},tools:new Set(),vitals:v};for(let n=0;n<600;n++)s.update(w,.1,[player]);assert(Math.abs(v.hunger-19)<.001);assert.equal(v.health,20);
});
