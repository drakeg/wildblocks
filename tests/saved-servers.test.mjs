import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVED_SERVERS_KEY,MAX_SAVED_SERVERS,normalizeServerAddress,readSavedServers,saveServer,removeServer} from '../dist/saved-servers.js';
function memory(initial={}){const m=new Map(Object.entries(initial));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};}
test('server addresses normalize and reject unsafe URL components',()=>{
 assert.equal(normalizeServerAddress('localhost:4182'),'http://localhost:4182');
 assert.equal(normalizeServerAddress('https://friends.example:443'),'https://friends.example');
 for(const bad of ['','javascript:alert(1)','https://user:pass@example.com','https://example.com/login','http://example.com?token=secret','https://example.com/#password','http://foo bar','file:///etc/passwd','http://example.com:99999']){
   assert.throws(()=>normalizeServerAddress(bad),undefined,bad);
 }
});
test('names and addresses round-trip; updates deduplicate, remove, and never store credentials',()=>{
 const storage=memory();
 assert.deepEqual(readSavedServers(storage),[]);
 let entries=saveServer(storage,'friends.example:4182','Survival crew');
 assert.deepEqual(entries,[{name:'Survival crew',address:'http://friends.example:4182'}]);
 entries=saveServer(storage,'http://friends.example:4182','Updated crew');
 assert.equal(entries.length,1);
 assert.equal(entries[0].name,'Updated crew');
 assert.doesNotMatch(storage.getItem(SAVED_SERVERS_KEY),/password|token|session/i);
 assert.deepEqual(removeServer(storage,'friends.example:4182'),[]);
 assert.deepEqual(readSavedServers(storage),[]);
});
test('corrupted or malicious storage is ignored and capacity remains bounded',()=>{
 assert.deepEqual(readSavedServers(memory({[SAVED_SERVERS_KEY]:'not json'})),[]);
 assert.deepEqual(readSavedServers(memory({[SAVED_SERVERS_KEY]:JSON.stringify([{address:'javascript:evil',name:'Bad'}, {address:'https://good.example',name:'Good'}])})),[{name:'Good',address:'https://good.example'}]);
 const storage=memory();
 for(let i=0;i<MAX_SAVED_SERVERS;i++)saveServer(storage,'server'+i+'.example:4182','Server '+i);
 assert.equal(readSavedServers(storage).length,MAX_SAVED_SERVERS);
 assert.throws(()=>saveServer(storage,'next.example:4182','Next'),/Remove/);
 assert.equal(saveServer(storage,'server0.example:4182','Renamed').length,MAX_SAVED_SERVERS);
});
