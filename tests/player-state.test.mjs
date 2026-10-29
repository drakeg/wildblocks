import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {World,collides} from '../dist/world.js';
import {resumePlayer,playerSnapshot,viewDirection,directionView} from '../dist/player-state.js';
import {startServer} from '../server/server.mjs';

test('local save/export and reload restore exact coordinates and facing, including underground',()=>{
 const w=new World('resume-test',1);w.set(24,5,24,0);w.set(24,6,24,0);w.set(24,7,24,0);
 const position={x:24.5,y:5.0003,z:24.5},saved={...w.snapshot(),player:playerSnapshot(position,1.25,-.42)};
 const serialized=JSON.parse(JSON.stringify(saved)),restored=resumePlayer(World.restore(serialized),serialized.player);
 assert.deepEqual(restored.position,position);assert.equal(restored.yaw,1.25);assert.equal(restored.pitch,-.42);
 position.x=50;assert.equal(saved.player.position.x,24.5); // Snapshots must not follow later movement.
});
test('legacy/invalid locations fall back safely; tiny floor collisions and changed terrain recover nearby',()=>{
 const w=new World('resume-test',1),camp=resumePlayer(w);
 assert.equal(camp.position.x,32.5);assert.equal(collides(w,camp.position),false);
 for(const position of [{x:NaN,y:13,z:32},{x:1e9,y:13,z:32},null]) assert.deepEqual(resumePlayer(w,{position}).position,camp.position);
 const near={x:31.5,y:12.99999,z:31.5};const fixed=resumePlayer(w,{position:near});
 assert.equal(fixed.position.x,near.x);assert.equal(fixed.position.z,near.z);assert(fixed.position.y-near.y<.01);
 w.set(31,13,31,7);const moved=resumePlayer(w,{position:{x:31.5,y:13.05,z:31.5}});
 assert.equal(moved.position.x,31.5);assert.equal(moved.position.z,31.5);assert.equal(collides(w,moved.position),false);
});
test('server facing directions round-trip without depending on the last rendered camera frame',()=>{
 for(const [yaw,pitch] of [[0,-.15],[1.2,.4],[-2.4,-1.1]]) {
  const restored=directionView(viewDirection(yaw,pitch));assert(Math.abs(restored.yaw-yaw)<1e-10);assert(Math.abs(restored.pitch-pitch)<1e-10);
 }
});
test('checkpoint and logout persist the final location and facing across re-login and server restart',async()=>{
 const dataDir=await mkdtemp(join(tmpdir(),'wildblocks-resume-'));let service=await startServer({dataDir,port:0}),cookie;
 const req=async(path,body)=>{const r=await fetch(service.url+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const token=r.headers.get('set-cookie');if(token)cookie=token.split(';')[0];return {status:r.status,body:await r.json()};};
 try {
  assert.equal((await req('checkpoint',{position:{x:32.5,y:13.05,z:32.5},direction:{x:0,y:0,z:-1}})).status,401);
  const account={username:'ResumeTest',password:'resume-test-password-123'};
  assert.equal((await req('register',account)).status,200);
  const position={x:34.25,y:13.0003,z:33.125},direction=viewDirection(1.2,-.3);
  assert.equal((await req('checkpoint',{position,direction,active:true,holding:true})).status,200);
  let saved=JSON.parse(await readFile(join(dataDir,'server.json'),'utf8'));
  assert.deepEqual(saved.users[0].position,position);assert.deepEqual(saved.users[0].direction,direction);
  assert.equal((await req('logout',{})).status,200);
  const login=await req('login',account);assert.deepEqual(login.body.player.position,position);assert.deepEqual(login.body.player.direction,direction);
  await service.close();service=await startServer({dataDir,port:0});cookie=undefined;
  const again=await req('login',account);assert.deepEqual(again.body.player.position,position);assert.deepEqual(again.body.player.direction,direction);
  const invalid=await req('checkpoint',{position:{x:1e9,y:13,z:32},direction});assert.equal(invalid.status,400);
  const tooFar=await req('checkpoint',{position:{x:55,y:30,z:55},direction});assert.equal(tooFar.status,409);
  assert.deepEqual((await req('state')).body.player.position,position);
 } finally {await service.close();await rm(dataDir,{recursive:true,force:true});}
});
