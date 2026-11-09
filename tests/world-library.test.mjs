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
