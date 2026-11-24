import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server/server.mjs';

// Two isolated HTTP clients model the separate cookie jars of two native windows.
function client(getUrl) {
  let cookie;
  return async (path, input) => {
    const response=await fetch(getUrl()+'/api/'+path,{
      method:input===undefined?'GET':'POST',
      headers:{...(input===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},
      body:input===undefined?undefined:JSON.stringify(input)
    });
    const header=response.headers.get('set-cookie');
    if(header)cookie=header.split(';')[0];
    return {status:response.status,body:await response.json()};
  };
}
test('two simultaneous clients see each other, but not themselves, and logout removes presence',async()=>{
  const dataDir=await mkdtemp(join(tmpdir(),'wildblocks-two-client-presence-'));
  const service=await startServer({dataDir,host:'127.0.0.1',port:0,seed:'duo-presence',mode:'survival'});
  const one=client(()=>service.url),two=client(()=>service.url);
  try {
    const a=await one('register',{username:'NativeOne',password:'native-client-one-2026'});
    const b=await two('register',{username:'NativeTwo',password:'native-client-two-2026'});
    assert.equal(a.status,200);assert.equal(b.status,200);
    const direction={x:0,y:0,z:-1};
    for(const [request,login] of [[one,a],[two,b]]){
      const position=login.body.player.position;
      assert.equal((await request('input',{position,direction,active:true})).status,200);
    }
    const stateA=await one('state'),stateB=await two('state');
    assert.equal(stateA.status,200);assert.equal(stateB.status,200);
    assert.equal(stateA.body.mode,'survival');assert.equal(stateB.body.mode,'survival');
    assert.deepEqual(stateA.body.players.map(p=>p.name),['NativeTwo']);
    assert.deepEqual(stateB.body.players.map(p=>p.name),['NativeOne']);
    assert.equal(stateA.body.player.name,'NativeOne');
    assert.equal(stateB.body.player.name,'NativeTwo');
    assert(!JSON.stringify(stateA.body).includes('native-client-two-2026'));
    assert(!JSON.stringify(stateB.body).includes('native-client-one-2026'));
    assert.equal((await two('logout',{})).status,200);
    assert.deepEqual((await one('state')).body.players,[]);
    assert.equal((await two('state')).status,401);
    assert.equal((await two('login',{username:'NativeTwo',password:'native-client-two-2026'})).status,200);
    assert.deepEqual((await one('state')).body.players.map(p=>p.name),['NativeTwo']);
  } finally {
    await service.close();
    await rm(dataDir,{recursive:true,force:true});
  }
});
