import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';

export async function smokeServer(folder) {
  const data = await mkdtemp(join(tmpdir(),'wildblocks-package-'));
  const reservation = createServer();
  reservation.listen(0,'127.0.0.1');
  await once(reservation,'listening');
  const port = reservation.address().port;
  await new Promise(resolve=>reservation.close(resolve));
  const runtime = join(folder,'runtime',process.platform==='win32'?'node.exe':'bin/node');
  const child = spawn(runtime,[join(folder,'server/entry.cjs'),'--data',data,'--host','127.0.0.1','--port',String(port),'--mode','creative'],{stdio:['pipe','pipe','pipe']});
  const exited = once(child,'exit');
  let errors='', output='';
  child.stderr.on('data',bytes=>{errors+=bytes;});
  try {
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Packaged server readiness timed out: '+errors)),10000);
      child.stdout.on('data',bytes=>{output+=bytes;if(output.includes('Wildblocks server:')){clearTimeout(timer);resolve();}});
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.once('exit',code=>{clearTimeout(timer);reject(Error(`Packaged server exited ${code}: ${errors}`));});
    });
    const status=await fetch(`http://127.0.0.1:${port}/api/status`);
    assert.equal(status.status,200);assert.equal((await status.json()).mode,'creative');
    const page=await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status,200);assert.match(await page.text(),/WILDBLOCKS/);
    child.stdin.write('stop\n');
    const [code]=await exited;assert.equal(code,0,errors);
    assert.equal(JSON.parse(await readFile(join(data,'server.json'),'utf8')).mode,'creative');
    console.log('Packaged server: HTTP, client assets, admin mode and graceful save verified.');
  } finally {
    if(child.exitCode===null){child.kill();await exited;}
    await rm(data,{recursive:true,force:true});
  }
}
