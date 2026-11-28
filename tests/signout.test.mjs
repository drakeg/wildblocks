import test from 'node:test';
import assert from 'node:assert/strict';
import { checkpointBeforeLogout } from '../dist/signout.js';

test('safe sign-out saves a final checkpoint before ending the authenticated session',async()=>{
 const calls=[];
 await checkpointBeforeLogout(async()=>{calls.push('checkpoint');await Promise.resolve();},async()=>{calls.push('logout');});
 assert.deepEqual(calls,['checkpoint','logout']);
});
test('failed checkpoint does not log out or conceal unsaved progress',async()=>{
 const calls=[];
 await assert.rejects(
   checkpointBeforeLogout(async()=>{calls.push('checkpoint');throw Error('Cannot save');},async()=>calls.push('logout')),
   /Cannot save/
 );
 assert.deepEqual(calls,['checkpoint'],'a failed checkpoint must preserve the session');
});
test('failed logout propagates for visible retry instead of false signed-out confirmation',async()=>{
 const calls=[];
 await assert.rejects(
   checkpointBeforeLogout(async()=>calls.push('checkpoint'),async()=>{calls.push('logout');throw Error('Server unavailable');}),
   /Server unavailable/
 );
 assert.deepEqual(calls,['checkpoint','logout']);
});
test('malformed sign-out operations cannot silently report success',async()=>{
 await assert.rejects(checkpointBeforeLogout(null,async()=>{}),/Missing sign-out/);
 await assert.rejects(checkpointBeforeLogout(async()=>{},null),/Missing sign-out/);
});
