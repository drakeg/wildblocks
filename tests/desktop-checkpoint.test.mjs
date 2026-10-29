import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const require=createRequire(import.meta.url);
const tick=()=>new Promise(r=>setImmediate(r));

// Exercise the actual desktop lifecycle with Electron's process/window boundary mocked.
async function desktopFixture() {
 const dataDir=await mkdtemp(join(tmpdir(),'wildblocks-desktop-resume-'));
 const ipc=new EventEmitter(),handlers=new Map(),events=[];ipc.handle=(name,fn)=>handlers.set(name,fn);
 const app=new EventEmitter();app.whenReady=()=>Promise.resolve();app.getPath=()=>dataDir;
 app.quit=()=>{let prevented=false;app.emit('before-quit',{preventDefault(){prevented=true;}});if(!prevented)events.push('quit');};
 let win,requestId;
 class Window extends EventEmitter {
  constructor(){super();win=this;const web=new EventEmitter();web.mainFrame={url:''};web.getURL=()=>web.mainFrame.url;
   web.send=(name,id)=>{events.push('checkpoint-request');requestId=id;};web.setWindowOpenHandler=()=>{};this.webContents=web;
  }
  loadURL(url){events.push('navigate');this.webContents.mainFrame.url=url;return Promise.resolve();}
  isDestroyed(){return false;}
 }
 const child=new EventEmitter();child.kill=()=>child.emit('exit');child.postMessage=()=>{events.push('server-stop');queueMicrotask(()=>child.emit('exit'));};
 const electron={app,BrowserWindow:Window,protocol:{registerSchemesAsPrivileged(){},handle(){}},net:{},ipcMain:ipc,utilityProcess:{fork(){queueMicrotask(()=>child.emit('message',{ready:{url:'http://127.0.0.1:4182',addresses:[]}}));return child;}},Menu:{setApplicationMenu(){},buildFromTemplate(t){return t;}}};
 const source=await readFile(new URL('../desktop/main.cjs',import.meta.url),'utf8');
 vm.runInNewContext(source,{require:name=>name==='electron'?electron:require(name),__dirname:resolve('desktop'),setTimeout,clearTimeout,URL,Promise,Response});
 await tick();events.length=0;
 return {app,events,win,handlers,ack(valid=true){events.push(valid?'checkpoint-complete':'untrusted-ack');ipc.emit('wildblocks:checkpoint-complete',{sender:valid?win.webContents:{},senderFrame:win.webContents.mainFrame},requestId);},async cleanup(){await rm(dataDir,{recursive:true,force:true});}};
}
test('native quit keeps renderer and server alive until the final checkpoint completes',async()=>{
 const d=await desktopFixture();
 try {
  await d.handlers.get('wildblocks:start')({sender:d.win.webContents,senderFrame:d.win.webContents.mainFrame},{port:4182,seed:'resume',mode:'survival',lan:false});
  d.app.quit();d.app.quit();await tick();assert.deepEqual(d.events,['checkpoint-request']);
  d.ack(false);await tick();assert(!d.events.includes('server-stop'));assert(!d.events.includes('quit'));
  d.ack();await tick();await tick();assert.deepEqual(d.events,['checkpoint-request','untrusted-ack','checkpoint-complete','server-stop','quit']);
 } finally {await d.cleanup();}
});
test('closing a single-player window also waits for its save before quitting',async()=>{
 const d=await desktopFixture();
 try {
  let prevented=false;d.win.emit('close',{preventDefault(){prevented=true;}});await tick();
  assert(prevented);assert.deepEqual(d.events,['checkpoint-request']);d.ack();await tick();await tick();assert.deepEqual(d.events,['checkpoint-request','checkpoint-complete','quit']);
 } finally {await d.cleanup();}
});
