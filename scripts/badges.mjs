import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const start='<!-- madmallard-badges:start -->';
const end='<!-- madmallard-badges:end -->';
const repo='drakeg/wildblocks';
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const workflow=resolve(root,'.github/workflows/build-and-release.yml');
if(!existsSync(workflow))throw Error('Build and release workflow not found; review badge claims.');
const lock=JSON.parse(readFileSync(resolve(root,'package-lock.json'),'utf8'));
if(pkg.license!=='MIT' || lock.packages?.['']?.license!=='MIT' || !existsSync(resolve(root,'LICENSE')) || !readFileSync(resolve(root,'LICENSE'),'utf8').startsWith('MIT License'))throw Error('MIT manifest, lockfile and LICENSE file must agree before badges are generated.');
if(!pkg.devDependencies?.electron || !pkg.scripts?.test || !pkg.scripts?.check)throw Error('Expected Electron/test/check manifest entries missing.');
if(!existsSync(resolve(root,'dist/vendor/three.module.js')))throw Error('Three.js vendor module missing.');
const encode=s=>encodeURIComponent(s).replace(/-/g,'--');
const staticBadge=(label,color,logo,url)=>`[![${label}](https://img.shields.io/badge/${encode(label)}-${color}?logo=${logo}&logoColor=white)](${url})`;
const a=[
 staticBadge('JavaScript','F7DF1E','javascript','https://developer.mozilla.org/en-US/docs/Web/JavaScript'),
 `[![Electron](https://img.shields.io/badge/dynamic/json?url=${encodeURIComponent(`https://raw.githubusercontent.com/${repo}/main/package.json`)}&query=${encodeURIComponent('$.devDependencies.electron')}&label=Electron&color=47848F&logo=electron&logoColor=white)](https://www.electronjs.org/)`,
 staticBadge('Three.js','000000','threedotjs','https://threejs.org/'),
 staticBadge('Node.js','5FA04E','nodedotjs','https://nodejs.org/'),
 staticBadge('Self-hosted server','555555','serverfault',`https://github.com/${repo}/blob/main/SERVER.md`),
 ...(existsSync(resolve(root,'Dockerfile.server')) && existsSync(resolve(root,'compose.yml')) ? [
   staticBadge('Docker','2496ED','docker','https://www.docker.com/'),
   staticBadge('Docker Compose','2496ED','docker',`https://github.com/${repo}/blob/main/compose.yml`)
 ] : [])
].join(' ');
const b=[
 `[![Build and release](https://github.com/${repo}/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/${repo}/actions/workflows/build-and-release.yml)`,
 `[![Latest release](https://img.shields.io/github/v/release/${repo}?logo=github)](https://github.com/${repo}/releases/latest)`,
 `[![Issues](https://img.shields.io/github/issues/${repo}?logo=github)](https://github.com/${repo}/issues)`,
 `[![Pull requests](https://img.shields.io/github/issues-pr/${repo}?logo=github)](https://github.com/${repo}/pulls)`,
 `[![License](https://img.shields.io/github/license/${repo}?logo=github)](https://github.com/${repo}/blob/main/LICENSE)`
].join(' ');
const content=`${start}\n${a}\n\n${b}\n${end}`;
const readmePath=resolve(root,'README.md');
const original=readFileSync(readmePath,'utf8');
const begin=original.indexOf(start),finish=original.indexOf(end);
if(begin<0||finish<begin||original.indexOf(start,begin+start.length)>=0||original.indexOf(end,finish+end.length)>=0)
 throw Error('Exactly one valid README badge marker pair is required.');
const newline=original.includes('\r\n')?'\r\n':'\n';
const normalized=content.replace(/\n/g,newline);
const updated=original.slice(0,begin)+normalized+original.slice(finish+end.length);
if(process.argv.includes('--write')) {
 if(updated!==original)writeFileSync(readmePath,updated);
 console.log('Badge block synchronized with verified manifest and workflow.');
} else if(updated!==original) {
 console.error('README badge drift. Run: node scripts/badges.mjs --write');
 process.exitCode=1;
} else console.log('README badges verified.');
