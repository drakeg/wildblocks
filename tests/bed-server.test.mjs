import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scryptSync } from 'node:crypto';
import { World, MATERIALS } from '../dist/world.js';
import { startServer } from '../server/server.mjs';

test('server validates the aimed bed, saves a personal spawn and refuses forged coordinates',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wildblocks-bed-server-'));
  const world=new World('bed-server',1);
  for(let x=28;x<=36;x++)for(let z=27;z<=36;z++)for(let y=12;y<=19;y++)world.set(x,y,z,y===12?7:0);
  assert(world.set(32,13,30,33));
  const salt='11223344556677889900aabbccddeeff';
  const password='bed-test-password-123';
  const position={x:32.5,y:13.05,z:33.5};
  const dy=13.5-(position.y+1.62),dz=30.5-position.z,n=Math.hypot(dy,dz);
  const direction={x:0,y:dy/n,z:dz/n};
  await writeFile(join(dir,'server.json'),JSON.stringify({world:world.snapshot(),mode:'survival',survival:{elapsed:60},drops:[],users:[{
    name:'BedPlayer',salt,hash:scryptSync(password,salt,64).toString('hex'),
    inventory:Array(MATERIALS.length).fill(0),skills:[0,0,0,0,0],tools:[],position,direction,vitals:{health:20,hunger:20}
  }]}));
  let service=await startServer({dataDir:dir,port:0}),cookie;
  const request=async(path,data)=>{
    const r=await fetch(service.url+'/api/'+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return {status:r.status,body:await r.json()};
  };
  try {
    assert.equal((await request('interact',{x:32,y:13,z:30})).status,401);
    assert.equal((await request('login',{username:'BedPlayer',password})).status,200);
    assert.equal((await request('interact',{x:32,y:13,z:30})).status,409);
    assert.equal((await request('input',{position,direction,active:true})).status,200);
    const bound=await request('interact',{x:1,y:1,z:1,respawnBed:{x:1,y:1,z:1}});
    assert.equal(bound.status,200);
    assert.deepEqual(bound.body.player.vitals.respawnBed,{x:32,y:13,z:30});
    await request('checkpoint',{position,direction});await service.close();
    service=await startServer({dataDir:dir,port:0});cookie=undefined;
    const resumed=await request('login',{username:'BedPlayer',password});
    assert.equal(resumed.status,200);
    assert.deepEqual(resumed.body.player.vitals.respawnBed,{x:32,y:13,z:30});
    assert.equal((await request('input',{position,direction:{x:0,y:1,z:0},active:true})).status,200);
    assert.equal((await request('interact',{x:32,y:13,z:30})).status,409);
  }finally{await service.close();await rm(dir,{recursive:true,force:true});}
});
