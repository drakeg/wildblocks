import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scryptSync} from 'node:crypto';
import {World,MATERIALS} from '../dist/world.js';
import {CROP_SECONDS} from '../dist/food.js';
import {startServer} from '../server/server.mjs';

test('server owns farming, food consumption, harvest counts, and persistent hunger/crop growth',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wildblocks-food-')),world=new World('food-server',1),salt='11223344556677889900aabbccddeeff',inventory=Array(MATERIALS.length).fill(0);
 inventory[31]=2;inventory[30]=2;
 const password='food-qa-password-123',position={x:32.5,y:13.05,z:32.5},dx=0,dy=12.5-(13.05+1.62),dz=-2,n=Math.hypot(dy,dz),direction={x:dx,y:dy/n,z:dz/n};
 await writeFile(join(dir,'server.json'),JSON.stringify({world:world.snapshot(),mode:'survival',survival:{elapsed:60},drops:[],users:[{name:'FoodTest',salt,hash:scryptSync(password,salt,64).toString('hex'),inventory,skills:[0,0,0,0],tools:['timber-hoe'],position,direction,vitals:{health:10,hunger:5}}]}));
 let service=await startServer({dataDir:dir,port:0}),cookie;
 const request=async(path,body)=>{const r=await fetch(service.url+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json()};};
 try {
  assert.equal((await request('eat',{id:30})).status,401);
  assert.equal((await request('login',{username:'FoodTest',password})).status,200);
  assert.equal((await request('eat',{id:30})).status,409);
  assert.equal((await request('input',{position,direction,active:true,hunger:999,inventory:Array(33).fill(999)})).status,200);
  assert.equal((await request('eat',{id:4})).status,409);
  const meal=await request('eat',{id:30,count:999,hunger:20});assert.equal(meal.status,200);assert.equal(meal.body.player.inventory[30],1);assert(Math.abs(meal.body.player.vitals.hunger-13)<.1);
  assert.equal((await request('farm',{action:'till',x:1,y:1,z:1})).status,200);assert.equal(service.world.get(32,12,30),27);assert.equal(service.world.get(1,1,1),3);
  assert.equal((await request('farm',{action:'plant'})).status,200);assert.equal((await request('farm',{action:'harvest',growth:999999})).status,409);
  const crop=[...service.world.crops.values()][0];crop.growth=CROP_SECONDS;
  const harvest=await Promise.all([request('farm',{action:'harvest'}),request('farm',{action:'harvest'})]);assert.deepEqual(harvest.map(r=>r.status).sort(),[200,409]);
  let state=(await request('state')).body;assert.equal(state.drops.filter(d=>d.id===29).length,3);assert.equal(state.drops.filter(d=>d.id===31).length,2);assert.equal(state.player.inventory[29],0);assert(state.player.skills[4]>=20);
  assert.equal((await request('farm',{action:'plant'})).status,200);[...service.world.crops.values()][0].growth=80;
  await request('checkpoint',{position,direction});await service.close();service=await startServer({dataDir:dir,port:0});cookie=undefined;
  state=(await request('login',{username:'FoodTest',password})).body;assert(Math.abs(state.player.vitals.hunger-13)<.1);assert.equal([...service.world.crops.values()][0].growth,80);assert.equal(state.player.inventory[30],1);
  await request('input',{position,direction:{x:0,y:1,z:0},active:true});assert.equal((await request('farm',{action:'till',x:32,y:12,z:30})).status,409);
 } finally {await service.close();await rm(dir,{recursive:true,force:true});}
});
