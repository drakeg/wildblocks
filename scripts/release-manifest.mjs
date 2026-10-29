import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const folder = process.argv[2];
if (!folder) throw Error('Pass the release assets directory.');
const {version} = JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const expected = [];
for(const target of ['macos-arm64','macos-x64','windows-x64','linux-x64','linux-arm64']) {
  for(const kind of ['Client','Server']) expected.push(`Wildblocks-${kind}-${version}-${target}${target.startsWith('linux')?'.tar.gz':'.zip'}`);
}
expected.push(`Wildblocks-Server-${version}-portable.zip`);
const actual = (await readdir(folder)).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected.sort())) throw Error('Release assets are missing or unexpected: '+actual.join(', '));
const lines=[];
for (const name of actual) {
  const bytes=await readFile(join(folder,name));
  if(!bytes.length)throw Error('Empty package: '+name);
  lines.push(createHash('sha256').update(bytes).digest('hex')+'  '+name);
}
await writeFile(join(folder,'SHA256SUMS.txt'),lines.join('\n')+'\n');
console.log(`Verified ${actual.length} packages; wrote SHA256SUMS.txt.`);
