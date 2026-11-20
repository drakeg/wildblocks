import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
async function check(folder) {
  for (const entry of await readdir(folder,{withFileTypes:true})) {
    if (entry.name === 'vendor') continue;
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await check(path);
    else if (/\.(?:js|cjs|mjs)$/.test(path)) execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
  }
}
for (const folder of ['desktop','dist','server','scripts','tests']) await check(folder);
execFileSync(process.execPath,['scripts/badges.mjs'],{stdio:'inherit'});
console.log('JavaScript syntax and README badge checks passed.');
