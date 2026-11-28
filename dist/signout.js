// Logout must never proceed if the final player checkpoint fails.
// Keep this minimal orchestration unit separate from the view so failure
// paths are regression-tested without a running server or credentials.
export async function checkpointBeforeLogout(checkpoint,logout) {
  if(typeof checkpoint!=='function'||typeof logout!=='function')
    throw Error('Missing sign-out operation.');
  await checkpoint();
  await logout();
}
