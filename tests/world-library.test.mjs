import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldLibrary,LIBRARY_KEY} from '../dist/world-library.js';
function setup(){const entries=new Map();let count=0,time=1;const storage={getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)};return {entries,storage,library:new WorldLibrary(storage,()=>time++,()=>String(++count))};}
test('legacy migration preserves inventory, position and crops exactly and runs once',()=>{const {library}=setup();const save={seed:'old',inventory:[0,3],player:{position:{x:3}},crops:[{growth:80}]};library.migrate(save);library.migrate({seed:'wrong'});assert.deepEqual(library.load('1'),save);assert.equal(library.list().length,1);save.inventory[1]=9;assert.equal(library.load('1').inventory[1],3);});
test('world switching isolates saves and backups restore reversibly',()=>{const {library}=setup();library.create('One',{seed:'one',mode:'survival',count:1});library.checkpoint();library.save({seed:'one',mode:'survival',count:2});library.create('Two',{seed:'two',mode:'creative'});library.select('1');assert.equal(library.load('1').count,2);library.restore('1');assert.equal(library.load('1').count,1);library.restore('1');assert.equal(library.load('1').count,2);assert.equal(library.load('2').seed,'two');library.rename('1',' New name ');assert.equal(library.current().name,'New name');});
test('failed storage writes leave library and last durable save intact',()=>{const {library,storage,entries}=setup();library.create('One',{count:1});const before=entries.get(LIBRARY_KEY);storage.setItem=()=>{throw Error('quota');};assert.throws(()=>library.save({count:2}),/quota/);assert.equal(library.load('1').count,1);assert.equal(entries.get(LIBRARY_KEY),before);});
test('malformed libraries are not silently replaced',()=>{const {storage}=setup();storage.setItem(LIBRARY_KEY,'broken');assert.throws(()=>new WorldLibrary(storage));});

test('starting another world and its backup are atomic when storage is full',()=>{const {library,storage}=setup();library.create('One',{count:1});library.create('Two',{count:2});library.select('1');storage.setItem=()=>{throw Error('quota');};assert.throws(()=>library.checkpoint('2'),/quota/);assert.equal(library.data.active,'1');assert.equal(library.current().save.count,1);});

test('real world snapshots survive reopen and backup swaps with position, crops, vitals and inventory',async()=>{
  const {World}=await import('../dist/world.js');
  const {Gathering}=await import('../dist/gathering.js');
  const {Progression}=await import('../dist/progression.js');
  const {playerVitals}=await import('../dist/survival.js');
  const {library,storage}=setup();
  const world=new World('library-restart',1);
  world.set(30,12,29,27);world.set(30,13,29,28);
  world.crops.set('30,13,29',{x:30,y:13,z:29,growth:80});
  const inventory=new Gathering();inventory.counts[30]=2;
  const before={...world.snapshot(),mode:'survival',inventory:inventory.snapshot(),bag:inventory.layout(),skills:[1,2,3,4,5],vitals:{health:14,hunger:6},player:{position:{x:32.5,y:15,z:32.5},yaw:.4,pitch:-.2}};
  const first=library.create('Farm',before);library.checkpoint();
  const after=structuredClone(before);after.inventory[30]=1;after.vitals.hunger=14;after.player.position.x=34.5;after.crops[0].growth=160;
  library.save(after);library.create('Other',{...new World('other').snapshot(),mode:'creative'});
  let reopened=new WorldLibrary(storage);assert.equal(reopened.list().length,2);
  assert.deepEqual(reopened.load(first),after);
  assert.deepEqual(reopened.restore(first),before);
  reopened=new WorldLibrary(storage);const restored=reopened.load(first);
  assert.equal(World.restore(restored).crops.get('30,13,29').growth,80);
  assert.equal(new Gathering(restored.inventory,restored.bag).counts[30],2);
  assert.deepEqual(new Progression(restored.skills).snapshot(),[1,2,3,4,5]);
  assert.equal(playerVitals(restored.vitals).hunger,6);
  assert.deepEqual(reopened.restore(first),after);
  assert.equal(reopened.list().find(w=>w.seed==='other').mode,'creative');
});


test('failed backup restoration preserves active world, backup, and other slots across restart',()=>{
  const {library,storage,entries}=setup();
  const a=library.create('Primary',{seed:'primary',player:{position:{x:18.5,y:21,z:12.5},yaw:.8,pitch:-.3},vitals:{health:18,hunger:7},crops:[{growth:40}],inventory:[2,3]});
  library.checkpoint(a);
  library.save({seed:'primary',player:{position:{x:20.5,y:22,z:14.5},yaw:-.4,pitch:.25},vitals:{health:12,hunger:9},crops:[{growth:120}],inventory:[4,5]});
  const b=library.create('Secondary',{seed:'secondary',player:{position:{x:30,y:19,z:31},yaw:1,pitch:0}});
  const before=entries.get(LIBRARY_KEY);
  const originalSet=storage.setItem;
  storage.setItem=()=>{throw Error('quota');};
  assert.throws(()=>library.restore(a),/quota/);
  assert.equal(entries.get(LIBRARY_KEY),before);
  assert.equal(library.current().id,b);
  assert.equal(library.load(a).vitals.hunger,9);
  assert.equal(library.data.worlds.find(w=>w.id===a).backup.save.vitals.hunger,7);
  storage.setItem=originalSet;
  let reopened=new WorldLibrary(storage);
  assert.equal(reopened.current().id,b);
  assert.equal(reopened.load(b).seed,'secondary');
  const restored=reopened.restore(a);
  assert.deepEqual(restored.player,{position:{x:18.5,y:21,z:12.5},yaw:.8,pitch:-.3});
  assert.equal(restored.vitals.hunger,7);
  assert.equal(restored.crops[0].growth,40);
  assert.deepEqual(reopened.restore(a).player,{position:{x:20.5,y:22,z:14.5},yaw:-.4,pitch:.25});
  reopened=new WorldLibrary(storage);
  assert.equal(reopened.load(b).player.position.x,30);
  assert.equal(reopened.load(a).vitals.hunger,9);
});

test('desktop QA scenario: two worlds retain bed, crops, vitals and inventory through restore, undo and reopen',async()=>{
  const {World}=await import('../dist/world.js');
  const {Gathering}=await import('../dist/gathering.js');
  const {playerVitals}=await import('../dist/survival.js');
  const {WorldLibrary}=await import('../dist/world-library.js');
  const {library,storage}=setup();
  const world=new World('wb002-farm',1);
  world.set(30,12,29,27);
  world.set(30,13,29,28);
  world.crops.set('30,13,29',{x:30,y:13,z:29,growth:81});
  world.set(32,13,30,33);
  world.facing.set('32,13,30',2);
  const gathering=new Gathering();
  gathering.counts[30]=3;gathering.counts[31]=2;gathering.syncOrder();
  const original={
    ...world.snapshot(),mode:'survival',
    inventory:gathering.snapshot(),bag:gathering.layout(),
    vitals:{health:16,hunger:7.25,respawnBed:{x:32,y:13,z:30}},
    player:{position:{x:32.5,y:world.surface(32,32)+.05,z:32.5},yaw:.7,pitch:-.2},
    survival:{elapsed:70},drops:[],skills:[1,2,3,4,5],tools:[]
  };
  const farm=library.create('QA Farm',original);
  library.checkpoint(farm);
  const changed=structuredClone(original);
  changed.inventory[30]=1;changed.vitals.hunger=14;changed.crops[0].growth=145;
  changed.player.yaw=-.4;
  library.save(changed);
  const secondary=library.create('QA Unchanged',{...new World('wb002-secondary',1).snapshot(),mode:'creative'});
  library.select(farm);

  let reopened=new WorldLibrary(storage);
  assert.equal(reopened.current().id,farm);
  const recent=reopened.load(farm);
  assert.equal(recent.inventory[30],1);
  assert.equal(playerVitals(recent.vitals).hunger,14);
  assert.equal(World.restore(recent).crops.get('30,13,29').growth,145);
  assert.equal(World.restore(recent).facing.get('32,13,30'),2);
  assert.equal(recent.player.yaw,-.4);
  assert.deepEqual(recent.vitals.respawnBed,{x:32,y:13,z:30});

  // The UI's Restore action swaps active and backup saves; invoking it twice undoes it.
  const restored=reopened.restore(farm);
  assert.equal(restored.inventory[30],3);
  assert.equal(restored.vitals.hunger,7.25);
  assert.equal(World.restore(restored).crops.get('30,13,29').growth,81);
  assert.equal(restored.player.yaw,.7);
  reopened=new WorldLibrary(storage);
  assert.equal(reopened.load(farm).vitals.hunger,7.25);
  const undone=reopened.restore(farm);
  assert.equal(undone.inventory[30],1);
  assert.equal(undone.vitals.hunger,14);
  assert.equal(World.restore(undone).crops.get('30,13,29').growth,145);
  assert.equal(undone.player.yaw,-.4);
  reopened=new WorldLibrary(storage);
  assert.equal(reopened.current().id,farm);
  assert.deepEqual(reopened.load(farm),changed);
  assert.equal(reopened.load(secondary).seed,'wb002-secondary');
  assert.equal(reopened.load(secondary).mode,'creative');
});
