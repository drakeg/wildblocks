import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scryptSync} from 'node:crypto';
import {World,collides} from '../dist/world.js';
import {startServer} from '../server/server.mjs';

test('server owns attached torches, support drops, skills and station checks',async()=>{
 const dataDir=await mkdtemp(join(tmpdir(),'wildblocks-progression-'));
 const world=new World('wander-01',1);world.set(32,14,30,4);
 const salt='11223344556677889900aabbccddeeff',inventory=Array(20).fill(0);inventory[10]=2;inventory[13]=20;inventory[7]=20;
 const user={name:'ForgeTest',salt,hash:scryptSync('forge-qa-password-123',salt,64).toString('hex'),inventory,skills:[0,0,0,0],tools:[],position:{x:32.5,y:13.05,z:32.5}};
 await writeFile(join(dataDir,'server.json'),JSON.stringify({world:world.snapshot(),mode:'survival',survival:{elapsed:60},drops:[],users:[user]}));
 let service=await startServer({dataDir,port:0});let cookie;
 const req=async(path,body)=>{const r=await fetch(service.url+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const token=r.headers.get('set-cookie');if(token)cookie=token.split(';')[0];return {status:r.status,body:await r.json()};};
 try {
  assert.equal((await req('login',{username:'ForgeTest',password:'forge-qa-password-123'})).status,200);
  assert.equal((await req('input',{position:user.position,direction:{x:0,y:0,z:-1},active:true,holding:false})).status,200);
  const placed=await req('place',{id:10});assert.equal(placed.status,200);assert.equal(placed.body.world.torches.length,1);assert.equal(service.world.get(32,14,31),0);assert.equal(placed.body.player.inventory[10],1);
  assert.equal((await req('craft',{key:'iron-pick',skills:[0,0,0,999999],stations:[16]})).status,409);
  service.world.set(32,14,30,0);await new Promise(r=>setTimeout(r,100));const state=await req('state');assert.equal(state.body.drops.filter(d=>d.id===10).length,1);
  await service.close();service=await startServer({dataDir,port:0});cookie=undefined;
  const login=await req('login',{username:'ForgeTest',password:'forge-qa-password-123'});assert.equal(login.body.player.inventory[10],1);assert.equal(login.body.world.torches.length,0);assert.equal(login.body.drops.filter(d=>d.id===10).length,1);
  service.world.set(32,13,32,7);await req('logout',{});const relocated=await req('login',{username:'ForgeTest',password:'forge-qa-password-123'});assert.equal(collides(service.world,relocated.body.player.position),false);
 } finally {await service.close();await rm(dataDir,{recursive:true,force:true});}
});
