import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
const require=createRequire(import.meta.url);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function desktop(){
  const events=[],timers=new Map(),ipc=new EventEmitter();let timerId=0,window;
  const app=new EventEmitter();app.whenReady=()=>Promise.resolve();app.getPath=()=>'/tmp/wildblocks-test';app.getAppPath=()=>'/tmp/wildblocks-test';
  app.quit=()=>{const event={preventDefault(){this.prevented=true;}};app.emit('before-quit',event);if(!event.prevented)events.push('quit');};
  ipc.handle=()=>{};
  class BrowserWindow extends EventEmitter{
    constructor(){super();window=this;this.webContents=new EventEmitter();this.webContents.mainFrame={};this.webContents.getURL=()=> 'wildblocks://game/index.html';this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=(channel,id)=>events.push({channel,id});}
    isDestroyed(){return false;} loadURL(){return Promise.resolve();} show(){}
  }
  const dialog={showMessageBox:async(_win,options)=>{events.push({dialog:options});return {response:0};}};
  const electron={app,BrowserWindow,ipcMain:ipc,dialog,protocol:{registerSchemesAsPrivileged(){},handle(){}},net:{},utilityProcess:{},Menu:{buildFromTemplate:x=>x,setApplicationMenu(){}}};
  const context=vm.createContext({require:name=>name==='electron'?electron:require(name),__dirname:'/tmp/wildblocks/desktop',console,URL,Response,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(readFileSync(new URL('../desktop/main.cjs',import.meta.url),'utf8'),context);
  await tick();
  const reply=(result,valid=true,requestId)=>{const request=events.findLast(e=>e.channel==='wildblocks:prepare-close');assert.ok(request);ipc.emit('wildblocks:checkpoint-complete',{sender:valid?window.webContents:{},senderFrame:window.webContents.mainFrame},requestId??request.id,result);};
  const host=new EventEmitter();host.postMessage=()=>{events.push('stop-host');queueMicrotask(()=>host.emit('exit'));};host.kill=()=>events.push('kill-host');context.testHost=host;vm.runInContext('hosted=testHost',context);
  return {app,events,timers,ipc,reply,dialog};
}
test('save failure keeps the game and hosted server open and shows recovery choices',async()=>{
  const h=await desktop();h.app.quit();h.reply({ok:false,message:'Storage full'});await tick();
  assert.ok(!h.events.includes('quit'));assert.ok(!h.events.includes('stop-host'));
  assert.ok(h.events.some(e=>e.dialog?.message.includes('could not be saved')));
  assert.equal(h.ipc.listenerCount('wildblocks:checkpoint-complete'),0);
});
test('checkpoint timeout cannot be mistaken for a saved game',async()=>{
  const h=await desktop();h.app.quit();const timeout=[...h.timers.values()].find(t=>t.ms===6000);timeout.fn();await tick();
  assert.ok(!h.events.includes('quit'));assert.ok(!h.events.includes('stop-host'));assert.ok(h.events.some(e=>e.dialog));
});
test('successful retry saves before stopping the hosted server and quitting',async()=>{
  const h=await desktop();h.app.quit();h.reply({ok:false});await tick();h.app.quit();h.reply({ok:true});await tick();await tick();
  assert.equal(h.events.filter(e=>e==='stop-host').length,1);assert.equal(h.events.filter(e=>e==='quit').length,1);
  assert.ok(h.events.indexOf('stop-host')<h.events.indexOf('quit'));
});
test('untrusted and malformed checkpoint replies cannot authorize exit',async()=>{
  const h=await desktop();h.app.quit();h.reply({ok:true},false);h.reply(undefined);await tick();assert.ok(!h.events.includes('quit'));h.reply({ok:true});await tick();await tick();assert.ok(h.events.includes('quit'));
});
test('preload reports callback failure instead of unconditional success',async()=>{
  const ipc=new EventEmitter(),sent=[];ipc.send=(...args)=>sent.push(args);let bridge;
  vm.runInNewContext(readFileSync(new URL('../desktop/preload.cjs',import.meta.url),'utf8'),{require:()=>({ipcRenderer:ipc,contextBridge:{exposeInMainWorld:(_name,value)=>bridge=value}})});
  bridge.onPrepareClose(async()=>{throw Error('Storage full');});ipc.emit('wildblocks:prepare-close',{},'request');await tick();
  assert.equal(sent[0][2]?.ok,false);assert.equal(sent[0][2]?.message,'Storage full');
});

test('Retry Save & Quit starts a fresh checkpoint and ignores the old reply',async()=>{
  const h=await desktop();h.dialog.showMessageBox=async()=>({response:1});h.app.quit();
  const first=h.events.findLast(e=>e.channel==='wildblocks:prepare-close');h.reply({ok:false});await tick();
  const second=h.events.findLast(e=>e.channel==='wildblocks:prepare-close');assert.notEqual(first.id,second.id);assert.ok(!h.events.includes('stop-host'));h.reply({ok:true},true,first.id);await tick();assert.ok(!h.events.includes('quit'));h.reply({ok:true});await tick();await tick();assert.ok(h.events.includes('quit'));
});
