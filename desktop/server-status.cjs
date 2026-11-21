// The desktop runtime probes an explicit saved server, never a client-supplied redirect.
// Inject fetch for deterministic offline/invalid/online regression tests.
function serverOrigin(input) {
  if (typeof input !== 'string' || input.length > 300 || !input.trim()) throw Error('Invalid server address.');
  const url = new URL(input);
  if (!['http:','https:'].includes(url.protocol) || !url.hostname || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) throw Error('Invalid server address.');
  return url.origin;
}
async function checkServerStatus(address, fetcher, timeoutMs=3500) {
  const origin=serverOrigin(address);
  let response;
  try {
    response=await fetcher(origin+'/api/status',{signal:AbortSignal.timeout(timeoutMs),redirect:'manual'});
  } catch {
    return {state:'unreachable',message:'Cannot reach this server.'};
  }
  if(!response.ok || response.status>=300) return {state:'unreachable',message:'Server is unavailable.'};
  try {
    const status=await response.json();
    if (!status || status.wildblocks!==true || status.protocol!==1 ||
        !['survival','creative'].includes(status.mode) ||
        typeof status.name!=='string' || status.name.length>64 ||
        !Number.isInteger(status.players) || status.players<0 || status.players>10000)
      return {state:'invalid',message:'This is not a compatible Wildblocks server.'};
    return {state:'online',name:status.name,mode:status.mode,players:status.players,message:'Online · '+(status.mode==='creative'?'Creative':'Survival')+' · '+status.players+' player'+(status.players===1?'':'s')};
  } catch {
    return {state:'invalid',message:'This server returned an invalid status.'};
  }
}
module.exports={serverOrigin,checkServerStatus};
