import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

test('README badges are deterministic, version-aware and preserve prose',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wildblocks-badge-'));
 try {
   for(const path of ['scripts','dist/vendor','.github/workflows'])mkdirSync(join(dir,path),{recursive:true});
   copyFileSync(resolve('scripts/badges.mjs'),join(dir,'scripts/badges.mjs'));
   writeFileSync(join(dir,'dist/vendor/three.module.js'),'// fixture only\n');
   writeFileSync(join(dir,'.github/workflows/build-and-release.yml'),'name: Build and release\n');
   writeFileSync(join(dir,'package.json'),JSON.stringify({type:'module',license:'UNLICENSED',devDependencies:{electron:'45.3.3'},scripts:{test:'node --test',check:'node scripts/check.mjs'}}));
   const readme=join(dir,'README.md');
   writeFileSync(readme,'# Wildblocks\n\n<!-- madmallard-badges:start -->\nstale\n<!-- madmallard-badges:end -->\n\nOriginal documentation remains.\n');
   const run=(args)=>spawnSync(process.execPath,[join(dir,'scripts/badges.mjs'),...args],{cwd:dir,encoding:'utf8'});
   assert.equal(run([]).status,1,'drift must fail in check mode');
   assert.equal(run(['--write']).status,0);
   const first=readFileSync(readme,'utf8');
   assert.match(first,/Electron%2045\.3\.3/);
   assert.match(first,/Original documentation remains\./);
   assert.equal((first.match(/madmallard-badges:start/g)||[]).length,1);
   assert.match(first,/actions\/workflows\/build-and-release\.yml\/badge\.svg/);
   assert.equal(run([]).status,0);
   assert.equal(run(['--write']).status,0);
   assert.equal(readFileSync(readme,'utf8'),first,'second write must be idempotent');
   // Windows Git checkouts may use CRLF; that is not badge drift.
   writeFileSync(readme,first.replace(/\n/g,'\r\n'));
   assert.equal(run([]).status,0,'CRLF checkout must be accepted');
   assert.equal(run(['--write']).status,0);
   assert.equal(readFileSync(readme,'utf8'),first.replace(/\n/g,'\r\n'),'CRLF must be preserved');
   writeFileSync(join(dir,'package.json'),JSON.stringify({type:'module',license:'UNLICENSED',devDependencies:{electron:'45.4.1'},scripts:{test:'node --test',check:'node scripts/check.mjs'}}));
   assert.equal(run([]).status,1,'dependency upgrade must invalidate version badge');
   assert.equal(run(['--write']).status,0);
   assert.match(readFileSync(readme,'utf8'),/Electron%2045\.4\.1/);
   writeFileSync(join(dir,'Dockerfile.server'),'FROM node:24-alpine\n');
   writeFileSync(join(dir,'compose.yml'),'services: {}\n');
   assert.equal(run([]).status,1,'adding Docker Compose should invalidate the existing badges');
   assert.equal(run(['--write']).status,0);
   assert.match(readFileSync(readme,'utf8'),/Docker%20Compose/);
   assert.equal(run([]).status,0);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
