import { readdir, readFile } from 'node:fs/promises';
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
const version=JSON.parse(await readFile('package.json','utf8')).version;
const welcome=await readFile('dist/index.html','utf8');
const visible=welcome.match(/class="welcome-version"[^>]*>Wildblocks (\d+\.\d+\.\d+)/);
if(!visible || visible[1]!==version)
  throw Error(`Game welcome screen version ${visible?.[1]??'missing'} does not match package.json ${version}. Update dist/index.html when preparing a release.`);
execFileSync(process.execPath,['scripts/badges.mjs'],{stdio:'inherit'});
console.log('JavaScript syntax and README badge checks passed.');
