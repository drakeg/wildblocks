import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../dist/world.js';
import { Survival, playerVitals, dayState, protection, torchesIn } from '../dist/survival.js';
import { Gathering } from '../dist/gathering.js';
import { craft } from '../dist/crafting.js';
import { Progression } from '../dist/progression.js';
function flat(){const w=new World();for(let x=15;x<54;x++)for(let z=15;z<54;z++)for(let y=12;y<35;y++)w.set(x,y,z,0);return w;}
function player(){return {position:{x:32.5,y:12.05,z:32.5},active:true,tools:new Set(),vitals:playerVitals()};}
function monster(id,x=32.5,z=31.6){return {id,position:{x,y:12.05,z},velocity:{x:0,y:0,z:0},health:12,attack:0};}
test('night creatures spawn only after sunset, disappear at dawn, and never appear in Creative',()=>{
  const w=flat(),p=player(),s=new Survival({elapsed:100});s.spawnIn=0;s.update(w,.1,[p]);assert.equal(s.monsters.length,0);
  s.elapsed=400;s.spawnIn=0;s.update(w,.1,[p],'survival',()=>.5);assert.equal(s.monsters.length,1);
  s.elapsed=719.99;s.update(w,.1,[p]);assert.equal(s.monsters.length,0);
  s.elapsed=400;s.spawnIn=0;s.update(w,.1,[p],'creative',()=>.5);assert.equal(s.monsters.length,0);
  assert.equal(dayState(100).night,false);assert.equal(dayState(400).night,true);
});
test('placed torches are found, stop nearby damage, and removal invalidates their protection',()=>{
  const w=flat(),p=player(),s=new Survival({elapsed:400});w.set(34,12,32,10);assert.equal(torchesIn(w).length,1);
  s.monsters=[monster(1)];s.update(w,.05,[p]);assert.equal(p.vitals.health,20);
  w.removeTorch([...w.torches.keys()][0]);s.update(w,.05,[p]);assert.equal(p.vitals.health,15);
});
test('sword attacks require aim, reach and line of sight, obey cooldown, and can defeat a creature',()=>{
  const w=flat(),p=player(),s=new Survival({elapsed:400});p.tools.add('slate-sword');s.monsters=[monster(1,32.5,30.5)];
  assert.equal(s.attack(w,p,{x:0,y:0,z:1}),false);p.vitals.attackCooldown=0;
  w.set(32,13,31,3);assert.equal(s.attack(w,p,{x:0,y:0,z:-1}),false);w.set(32,13,31,0);p.vitals.attackCooldown=0;
  assert(s.attack(w,p,{x:0,y:0,z:-1}));assert.equal(s.monsters[0].health,5);
  assert.equal(s.attack(w,p,{x:0,y:0,z:-1}),false);p.vitals.attackCooldown=0;
  assert(s.attack(w,p,{x:0,y:0,z:-1}));assert.equal(s.monsters.length,0);
  s.monsters=[monster(2,32.5,26)];p.vitals.attackCooldown=0;assert.equal(s.attack(w,p,{x:0,y:0,z:-1}),false);
});
test('armor reduces damage; a defeat restores health at camp without touching inventory',()=>{
  const w=flat(),p=player(),s=new Survival({elapsed:400});p.tools=new Set(['slate-armor','slate-helmet']);assert.equal(protection(p.tools),.6);
  s.monsters=[monster(1)];s.update(w,.05,[p]);assert.equal(p.vitals.health,18);
  p.vitals.health=1;p.vitals.hurt=0;s.monsters[0].attack=0;s.update(w,.05,[p]);assert.equal(p.vitals.health,20);assert.equal(p.vitals.respawns,1);assert(p.vitals.hurt>=5);
});
test('survival gear costs resources and advanced armor requires a table',()=>{
  const bag=new Gathering(),tools=new Set(),skills=new Progression();bag.add(7,20);bag.add(5,20);bag.add(3,20);
  assert(craft('torch',bag,tools,skills));assert.equal(bag.counts[10],4);
  assert(craft('wood-sword',bag,tools,skills));assert(craft('woven-armor',bag,tools,skills));
  assert.equal(craft('slate-armor',bag,tools,skills),false);assert(craft('slate-armor',bag,tools,skills,'survival',true));
});

test('new armor tiers apply their advertised protection exactly',()=>{
 const w=flat();
 for(const [armor,health] of [['woven-armor',16],['slate-armor',17],['iron-armor',17.5],['starsteel-armor',18]]){const p=player(),s=new Survival({elapsed:400});p.tools.add(armor);s.monsters=[monster(1)];s.update(w,.05,[p]);assert.equal(p.vitals.health,health);}
});
