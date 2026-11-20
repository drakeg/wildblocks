// Saved multiplayer addresses are untrusted metadata, never credentials or sessions.
export const SAVED_SERVERS_KEY = 'wildblocks.saved-servers.v1';
export const MAX_SAVED_SERVERS = 20;
export function normalizeServerAddress(input) {
  if(typeof input !== 'string' || input.length > 300 || !input.trim()) throw Error('Enter a valid server address.');
  const value=input.trim();
  if(/[\s\\]/.test(value)) throw Error('Server addresses cannot contain spaces or backslashes.');
  const url=new URL(value.includes('://')?value:'http://'+value);
  if(!['http:','https:'].includes(url.protocol) || !url.hostname || url.username || url.password ||
    url.pathname!=='/' || url.search || url.hash) throw Error('Use a server address only, without a path, username, password or query.');
  if(url.origin==='null' || !/^[a-z0-9.\-:[\]]+$/i.test(url.host)) throw Error('Invalid server address.');
  return url.origin;
}
export function serverName(value) {
  if(typeof value !== 'string') return '';
  return value.trim().slice(0,48);
}
export function readSavedServers(storage) {
  try {
    const value=JSON.parse(storage.getItem(SAVED_SERVERS_KEY) || '[]');
    if(!Array.isArray(value)) return [];
    const out=[];
    for(const item of value.slice(0,100)){
      try {
        if(!item || typeof item!=='object' || typeof item.address!=='string')continue;
        const address=normalizeServerAddress(item.address);
        if(out.some(s=>s.address===address))continue;
        out.push({address,name:serverName(item.name)||new URL(address).host});
        if(out.length===MAX_SAVED_SERVERS)break;
      }catch{}
    }
    return out;
  }catch{return [];}
}
export function saveServer(storage,address,name='') {
  const normalized=normalizeServerAddress(address),entries=readSavedServers(storage);
  const label=serverName(name)||new URL(normalized).host;
  const other=entries.filter(entry=>entry.address!==normalized);
  if(other.length>=MAX_SAVED_SERVERS)throw Error('Remove a saved server before adding another.');
  const result=[...other,{address:normalized,name:label}];
  storage.setItem(SAVED_SERVERS_KEY,JSON.stringify(result));
  return result;
}
export function removeServer(storage,address) {
  const normalized=normalizeServerAddress(address);
  const result=readSavedServers(storage).filter(entry=>entry.address!==normalized);
  storage.setItem(SAVED_SERVERS_KEY,JSON.stringify(result));
  return result;
}
