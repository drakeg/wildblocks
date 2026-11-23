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

test('two authenticated players bind independent beds and retain checkpoints after restart',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wildblocks-two-bed-server-'));
  const world=new World('two-bed-server',1);
  for(let x=27;x<=39;x++)for(let z=26;z<=37;z++)for(let y=12;y<=20;y++)world.set(x,y,z,y===12?7:0);
  assert(world.set(31,13,30,33));
  assert(world.set(35,13,30,33));
  const credentials=[
    {name:'PlayerOne',password:'two-player-password-111',salt:'11223344556677889900aabbccddeeff',x:31.5,bedX:31},
    {name:'PlayerTwo',password:'two-player-password-222',salt:'ffeeddccbbaa00998877665544332211',x:35.5,bedX:35}
  ];
  const users=credentials.map(({name,password,salt,x})=>{
    const position={x,y:13.05,z:33.5};
    const dy=13.5-(position.y+1.62),dz=30.5-position.z,n=Math.hypot(dy,dz);
    return {name,salt,hash:scryptSync(password,salt,64).toString('hex'),
      inventory:Array(MATERIALS.length).fill(0),skills:[0,0,0,0,0],tools:[],
      position,direction:{x:0,y:dy/n,z:dz/n},vitals:{health:20,hunger:20}};
  });
  await writeFile(join(dir,'server.json'),JSON.stringify({world:world.snapshot(),mode:'survival',survival:{elapsed:60},drops:[],users}));
  let service=await startServer({dataDir:dir,port:0});
  function client(){
    let cookie;
    return async(path,payload)=>{
      const response=await fetch(service.url+'/api/'+path,{
        method:payload===undefined?'GET':'POST',
        headers:{...(payload===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},
        body:payload===undefined?undefined:JSON.stringify(payload)
      });
      const setCookie=response.headers.get('set-cookie');
      if(setCookie)cookie=setCookie.split(';')[0];
      return {status:response.status,body:await response.json()};
    };
  }
  let one=client(),two=client();
  try {
    for(const [credential,request,index] of [[credentials[0],one,0],[credentials[1],two,1]]){
      const login=await request('login',{username:credential.name,password:credential.password});
      assert.equal(login.status,200);
      assert.equal((await request('input',{position:users[index].position,direction:users[index].direction,active:true})).status,200);
      // Forged bed coordinates must not override the server-side raycast.
      const interact=await request('interact',{x:credentials[1-index].bedX,y:13,z:30,respawnBed:{x:99,y:99,z:99}});
      assert.equal(interact.status,200);
      assert.deepEqual(interact.body.player.vitals.respawnBed,{x:credential.bedX,y:13,z:30});
    }
    const oneState=await one('state');
    const twoState=await two('state');
    assert.deepEqual(oneState.body.player.vitals.respawnBed,{x:31,y:13,z:30});
    assert.deepEqual(twoState.body.player.vitals.respawnBed,{x:35,y:13,z:30});
    await service.close();
    service=await startServer({dataDir:dir,port:0});
    one=client();two=client();
    const oneResume=await one('login',{username:credentials[0].name,password:credentials[0].password});
    const twoResume=await two('login',{username:credentials[1].name,password:credentials[1].password});
    assert.equal(oneResume.status,200);
    assert.equal(twoResume.status,200);
    assert.deepEqual(oneResume.body.player.vitals.respawnBed,{x:31,y:13,z:30});
    assert.deepEqual(twoResume.body.player.vitals.respawnBed,{x:35,y:13,z:30});
  } finally {await service.close();await rm(dir,{recursive:true,force:true});}
});
