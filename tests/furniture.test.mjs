import test from 'node:test';
import assert from 'node:assert/strict';
import {World,raycast,collides,MATERIALS} from '../dist/world.js';
import {Gathering} from '../dist/gathering.js';
import {containerView,transferContainer,canReachContainer} from '../dist/interactions.js';
import {Drops} from '../dist/drops.js';
import {SUPPLY_REGEN_MS} from '../dist/settlements.js';
import {RECIPES} from '../dist/crafting.js';

test('doors require two empty cells, block the closed doorway, persist state, and remove both halves',()=>{
 const w=new World('door',1);assert(w.placeDoor(32,13,30,0));assert.equal(w.get(32,14,30),25);
 assert(collides(w,{x:32.5,y:13.05,z:30.5}));assert(w.toggleDoor(32,14,30));assert(!collides(w,{x:32.5,y:13.05,z:30.5}));
 assert(!w.toggleDoor(32,13,30,[{x:32.5,y:13.05,z:30.5}]));
 const restored=World.restore(w.snapshot());assert(restored.doors.get('32,13,30').open);
 assert(restored.set(32,14,30,0));assert.equal(restored.get(32,13,30),0);assert.equal(restored.doors.size,0);
 w.set(34,14,30,7);assert(!w.placeDoor(34,13,30));
});
test('chest transfers conserve quantities, preserve ordering, and protect stored items from removal',()=>{
 const w=new World('chest',1),bag=new Gathering();w.set(32,13,30,24);bag.add(4,9);
 const input={x:32,y:13,z:30,id:4,count:5,direction:'store'};
 assert.equal(transferContainer(w,bag,input).amount,5);assert.equal(bag.counts[4],4);assert.equal(w.set(32,13,30,0),false);
 const restored=World.restore(w.snapshot());assert.equal(containerView(restored,32,13,30).counts[4],5);
 assert.equal(transferContainer(restored,bag,{...input,direction:'take',count:9999}).amount,5);assert.equal(bag.counts[4],9);
 assert(transferContainer(restored,bag,{...input,direction:'take'}).error);assert(restored.set(32,13,30,0));
 assert.equal(bag.counts.length,MATERIALS.length);
});
test('town crates can be opened, partially looted then mined without duplicating remaining drops',()=>{
 const w=new World('crate'),s=w.supplies[0],bag=new Gathering(),drops=new Drops(),initial=containerView(w,s.x,s.y,s.z),id=initial.order[0];
 assert.equal(transferContainer(w,bag,{...s,id,count:1,direction:'take'},100).amount,1);assert.equal(s.nextAt,0);
 assert(transferContainer(w,bag,{...s,id,count:1,direction:'store'}).error);
 const remaining=initial.counts.reduce((a,b)=>a+b,0)-1;w.set(s.x,s.y,s.z,0);w.flushDrops(drops);assert.equal(drops.items.length,remaining);w.flushDrops(drops);assert.equal(drops.items.length,remaining);
 const a=new World('crate-refill'),site=a.supplies[0];for(const item of containerView(a,site.x,site.y,site.z).order)assert(transferContainer(a,new Gathering(),{...site,id:item,count:9999,direction:'take'},100).amount);
 assert.equal(site.nextAt,100+SUPPLY_REGEN_MS);assert(!a.updateSupplies(99+SUPPLY_REGEN_MS));assert(a.updateSupplies(101+SUPPLY_REGEN_MS));assert(containerView(a,site.x,site.y,site.z).order.length>0);
});
test('storage requires reach and unobstructed line of sight; furniture has craft recipes',()=>{
 const w=new World('reach',1);w.set(32,14,30,24);const p={x:32.5,y:13.05,z:33.5};assert(canReachContainer(w,p,32,14,30));
 w.set(32,14,32,7);assert(!canReachContainer(w,p,32,14,30));assert(!canReachContainer(w,{x:50,y:13,z:50},32,14,30));
 for(const id of [20,21,22,23,24,26])assert(RECIPES.some(r=>r.output?.id===id));
 const modern=new World('furnished');assert.equal(modern.doors.size,6);assert(modern.data.includes(21));assert(modern.data.includes(22));assert(modern.data.includes(23));assert(modern.data.includes(24));
 assert.deepEqual(World.restore(modern.snapshot()).snapshot(),modern.snapshot());
});

test('server validates opened containers, serializes competing transfers, and persists chest contents',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{scryptSync}=await import('node:crypto'),{startServer}=await import('../server/server.mjs');
 const dir=await mkdtemp(join(tmpdir(),'wildblocks-storage-')),w=new World('storage-server',1);w.set(32,14,30,24);w.ensureContainer(32,14,30).counts[4]=7;
 const salt='11223344556677889900aabbccddeeff',position={x:32.5,y:13.05,z:32.5},password='storage-test-password-123';
 await writeFile(join(dir,'server.json'),JSON.stringify({world:w.snapshot(),mode:'survival',survival:{elapsed:60},drops:[],users:['ChestOne','ChestTwo'].map(name=>({name,salt,hash:scryptSync(password,salt,64).toString('hex'),inventory:Array(MATERIALS.length).fill(0),skills:[0,0,0,0],tools:[],position,direction:{x:0,y:0,z:-1}}))}));
 let service=await startServer({dataDir:dir,port:0});
 const client=()=>{let cookie;return async(path,body)=>{const r=await fetch(service.url+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json()};};};
 try{const a=client(),b=client();for(const [request,username]of [[a,'ChestOne'],[b,'ChestTwo']]){assert.equal((await request('login',{username,password})).status,200);assert.equal((await request('input',{position,direction:{x:0,y:0,z:-1},active:true})).status,200);}
 const input={x:32,y:14,z:30,id:4,count:9999,direction:'take'};
 assert.equal((await a('container',input)).status,409);
 for(const request of [a,b]){const opened=await request('interact',{});assert.equal(opened.status,200);assert.equal(opened.body.container.counts[4],7);}
 assert.equal((await a('container',{...input,x:31})).status,409);
 const results=await Promise.all([a('container',input),b('container',input)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const states=await Promise.all([a('state'),b('state')]);assert.equal(states.reduce((sum,r)=>sum+r.body.player.inventory[4],0),7);
 const winner=results[0].status===200?a:b;assert.equal((await winner('container',{...input,direction:'store',count:3})).status,200);
 await service.close();service=await startServer({dataDir:dir,port:0});const c=client();assert.equal((await c('login',{username:'ChestOne',password})).status,200);assert.equal(service.world.ensureContainer(32,14,30).counts[4],3);
 }finally{await service.close();await rm(dir,{recursive:true,force:true});}
});
