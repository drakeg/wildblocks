import test from 'node:test';
import assert from 'node:assert/strict';
import {World,collides} from '../dist/world.js';
import {WorldLibrary} from '../dist/world-library.js';
import {Gathering} from '../dist/gathering.js';
import {Progression} from '../dist/progression.js';
import {farmAction,updateCrops} from '../dist/farming.js';
import {playerVitals} from '../dist/survival.js';
import {playerSnapshot,resumePlayer} from '../dist/player-state.js';
import {CROP_SECONDS,eatFood} from '../dist/food.js';

// Exercising the same production operations as local gameplay, rather than
// planting a pre-written crop in a test fixture, catches save-state drift.
test('real till/plant/growth/eat actions survive save, restart, backup restore, and undo in an isolated world',()=>{
 const entries=new Map();
 const storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v))};
 let now=100,sequence=0;
 const open=()=>new WorldLibrary(storage,()=>++now,()=>String(++sequence));
 let library=open(),world=new World('wb002-real-farm',1);
 const plot={x:32,y:12,z:30,id:1,distance:3};
 world.set(plot.x,plot.y,plot.z,1);
 // Choose an exposed crop plot irrespective of terrain generation or canopy.
 for(let y=plot.y+1;y<40;y++)world.set(plot.x,y,plot.z,0);
 const bag=new Gathering(),tools=new Set(['timber-hoe']),skills=new Progression();
 assert(bag.add(31,2),'two seeds');
 assert(bag.add(30,1),'one bread');
 const vitals=playerVitals({health:17,hunger:9});
 const position={x:32.5,y:world.surface(32,32)+.05,z:32.5};
 assert.equal(collides(world,position),false);
 const snapshot=(p,yaw)=>({
   ...world.snapshot(),mode:'survival',
   inventory:bag.snapshot(),bag:bag.layout(),skills:skills.snapshot(),
   tools:[...tools],vitals:{health:vitals.health,hunger:vitals.hunger},
   player:playerSnapshot(p,yaw,-.2),survival:{elapsed:100},drops:[]
 });
 assert(farmAction(world,{bag,tools,skills},plot,'till').ok);
 const before=snapshot(position,.4);
 const farm=library.create('Real farm',before);
 library.checkpoint(farm);

 assert(farmAction(world,{bag,tools,skills},{...plot,id:27},'plant').ok);
 assert.equal(bag.counts[31],1);
 assert.equal(world.get(32,13,30),28);
 updateCrops(world,CROP_SECONDS/2,1);
 assert.equal(world.crops.get('32,13,30').growth,CROP_SECONDS/2);
 assert(eatFood(bag,vitals,30).ok);
 assert.equal(bag.counts[30],0);
 assert.equal(vitals.hunger,17);
 const moved={x:34.5,y:world.surface(34,32)+.05,z:32.5};
 assert.equal(collides(world,moved),false);
 const after=snapshot(moved,-.7);
 library.save(after);
 const second=library.create('Other world',{...new World('wb002-other-world',1).snapshot(),mode:'creative'});
 library.select(farm);

 // Recreate all live gameplay model objects from the stored bytes, as the
 // Singleplayer Play Selected World pathway does after relaunch.
 library=open();
 const loaded=library.load(farm);
 const restoredWorld=World.restore(loaded);
 const restoredBag=new Gathering(loaded.inventory,loaded.bag);
 const resumed=resumePlayer(restoredWorld,loaded.player);
 const restoredVitals=playerVitals(loaded.vitals);
 assert.deepEqual(resumed.position,moved);
 assert.equal(resumed.yaw,-.7);
 assert.equal(resumed.pitch,-.2);
 assert.equal(restoredBag.counts[31],1);
 assert.equal(restoredBag.counts[30],0);
 assert.equal(restoredVitals.hunger,17);
 assert.equal(restoredWorld.get(32,13,30),28);
 assert.equal(restoredWorld.crops.get('32,13,30').growth,CROP_SECONDS/2);
 assert.equal(library.current().id,farm);

 const rolledBack=library.restore(farm);
 assert.deepEqual(rolledBack,before);
 const restoredBefore=World.restore(rolledBack);
 assert.equal(restoredBefore.get(32,12,30),27);
 assert.equal(restoredBefore.get(32,13,30),0);
 assert.equal(restoredBefore.crops.size,0);
 assert.equal(new Gathering(rolledBack.inventory,rolledBack.bag).counts[31],2);
 assert.equal(playerVitals(rolledBack.vitals).hunger,9);
 library=open();
 assert.deepEqual(library.restore(farm),after,'repeated Restore is an undo');
 library=open();
 assert.deepEqual(library.load(farm),after,'undo survives another restart');
 assert.equal(library.load(second).seed,'wb002-other-world');
 assert.equal(library.load(second).mode,'creative');
});
