import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
const require=createRequire(import.meta.url);
const {serverOrigin,checkServerStatus}=require('../desktop/server-status.cjs');

test('desktop status accepts an authenticated Wildblocks protocol response',async()=>{
 const result=await checkServerStatus('http://localhost:4182',async(url,options)=>{
   assert.equal(url,'http://localhost:4182/api/status');
   assert.equal(options.redirect,'manual');
   assert(options.signal);
   return {ok:true,status:200,json:async()=>({wildblocks:true,protocol:1,mode:'survival',name:'Friends',players:2})};
 });
 assert.deepEqual(result,{state:'online',mode:'survival',players:2,name:'Friends',message:'Online · Survival · 2 players'});
});
test('desktop status handles unreachable, redirected and incompatible servers without false online status',async()=>{
 assert.equal((await checkServerStatus('https://test.example',async()=>{throw Error('network unreachable');})).state,'unreachable');
 assert.equal((await checkServerStatus('https://test.example',async()=>({ok:false,status:302}))).state,'unreachable');
 for(const value of [{},{wildblocks:true,protocol:99,mode:'creative',name:'Bad',players:0},{wildblocks:true,protocol:1,mode:'survival',name:'Bad',players:-1}]){
   assert.equal((await checkServerStatus('https://test.example',async()=>({ok:true,status:200,json:async()=>value}))).state,'invalid');
 }
 for(const url of ['file:///tmp/test','https://example.com/other','https://a:b@example.com','https://example.com/?token=secret']){
   assert.throws(()=>serverOrigin(url));
 }
});
test('live HTTP status check recognizes a real server and distinguishes a stopped server',async()=>{
 const server=createServer((req,res)=>{
   assert.equal(req.url,'/api/status');
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({wildblocks:true,protocol:1,mode:'creative',name:'QA',players:0}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port;
 try{
   const result=await checkServerStatus(address,fetch,1200);
   assert.equal(result.state,'online');
 }finally{await new Promise(resolve=>server.close(resolve));}
 assert.equal((await checkServerStatus(address,fetch,350)).state,'unreachable');
});
