// Build on the target OS/architecture; CI provides native runners for every package.
import { cp, mkdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { packager } from '@electron/packager';
import { buildPortable } from './build-portable-server.mjs';
import { smokeServer } from './smoke-server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const platform = process.platform, arch = process.arch;
const osName = {darwin:'macos',win32:'windows',linux:'linux'}[platform];
if (!osName || !['x64','arm64'].includes(arch)) throw Error('Unsupported release platform.');
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw Error('Expected a stable semver package version.');
const target = `${osName}-${arch}`, nodeVersion = '24.22.2';
const stage = join(root, 'build', target), assets = join(root, 'build', 'artifacts');
await rm(stage, {recursive:true, force:true});
await mkdir(stage, {recursive:true});
await mkdir(assets, {recursive:true});

function run(command, args, options={}) { return execFileSync(command, args, {stdio:'inherit', ...options}); }
function psLiteral(value) { return "'" + value.replaceAll("'", "''") + "'"; }
function archive(folder, output) {
  if (platform === 'win32') {
    run('powershell.exe', ['-NoProfile','-NonInteractive','-Command',
      `Compress-Archive -LiteralPath ${psLiteral(folder)} -DestinationPath ${psLiteral(output)} -Force`]);
  } else if (platform === 'darwin') {
    run('ditto', ['-c','-k','--sequesterRsrc','--keepParent',folder,output]);
  } else {
    run('tar', ['-czf',output,'-C',dirname(folder),basename(folder)]);
  }
}
async function download(url, output) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Downloading ${basename(output)} (attempt ${attempt}/3)`);
      const response = await fetch(url, {signal:AbortSignal.timeout(120000)});
      if (!response.ok) throw Error(`Download failed (${response.status}): ${url}`);
      await writeFile(output, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`Download interrupted: ${error.message}; retrying.`);
    }
  }
}
const extension = platform === 'linux' ? '.tar.gz' : '.zip';

// An explicit source allowlist prevents publishing local saves, credentials or research artifacts.
const source = join(stage, 'client-source');
await mkdir(source);
for (const directory of ['desktop','server','dist']) await cp(join(root,directory),join(source,directory),{recursive:true});
await writeFile(join(source,'package.json'),JSON.stringify({
  name:pkg.name,version:pkg.version,type:pkg.type,main:pkg.main,
  description:pkg.description,author:pkg.author,license:pkg.license,
},null,2)+'\n');
const [appFolder] = await packager({
  dir:source,name:'Wildblocks',platform,arch,electronVersion:pkg.devDependencies.electron,
  out:join(stage,'client'),overwrite:true,asar:true,prune:false,
  appBundleId:'com.electron.wildblocks',appVersion:pkg.version,
});
if (platform === 'darwin') run('codesign',['--force','--deep','--sign','-',join(appFolder,'Wildblocks.app')]);
await cp(join(root,'RELEASES.md'),join(appFolder,'READ-ME.md'));
const clientAsset = join(assets,`Wildblocks-Client-${pkg.version}-${target}${extension}`);
archive(appFolder,clientAsset);

// Verify official Node distribution checksums before bundling a standalone server runtime.
const runtimeOS = platform === 'win32' ? 'win' : platform;
const runtimeName = `node-v${nodeVersion}-${runtimeOS}-${arch}`;
const runtimeArchive = runtimeName + (platform === 'win32' ? '.zip' : '.tar.gz');
const baseURL = `https://nodejs.org/dist/v${nodeVersion}/`;
const checksumFile = join(stage,'SHASUMS256.txt'), runtimeFile = join(stage,runtimeArchive);
await download(baseURL+'SHASUMS256.txt',checksumFile);
await download(baseURL+runtimeArchive,runtimeFile);
const expected = (await readFile(checksumFile,'utf8')).split(/\r?\n/).find(line=>line.endsWith(' '+runtimeArchive))?.split(/\s+/)[0];
const actual = createHash('sha256').update(await readFile(runtimeFile)).digest('hex');
if (!expected || expected !== actual) throw Error('Official Node runtime checksum mismatch.');
if (platform === 'win32') run('powershell.exe',['-NoProfile','-NonInteractive','-Command',
  `Expand-Archive -LiteralPath ${psLiteral(runtimeFile)} -DestinationPath ${psLiteral(stage)} -Force`]);
else run('tar',['-xzf',runtimeFile,'-C',stage]);
const serverFolder = join(stage,`Wildblocks-Server-${pkg.version}-${target}`);
await buildPortable(serverFolder);
const runtimeTarget = join(serverFolder,'runtime',platform === 'win32' ? '' : 'bin');
await mkdir(runtimeTarget,{recursive:true});
const binary = platform === 'win32' ? 'node.exe' : 'bin/node';
await cp(join(stage,runtimeName,binary),join(serverFolder,'runtime',binary));
await cp(join(stage,runtimeName,'LICENSE'),join(serverFolder,'runtime','LICENSE'));
if (platform !== 'win32') await chmod(join(serverFolder,'runtime/bin/node'),0o755);
if (platform === 'darwin') {
  await cp(join(serverFolder,'Start-Server.sh'),join(serverFolder,'Start-Server.command'));
  await chmod(join(serverFolder,'Start-Server.command'),0o755);
}
await cp(join(root,'RELEASES.md'),join(serverFolder,'DOWNLOADS.md'));
const serverAsset = join(assets,`${basename(serverFolder)}${extension}`);
archive(serverFolder,serverAsset);

// Exercise the exact bundled server runtime and files, rather than the build host's Node.
await smokeServer(serverFolder);
console.log(`Release packages: ${clientAsset}\n${serverAsset}`);
