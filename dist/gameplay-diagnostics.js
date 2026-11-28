// Read-only gameplay diagnostics for isolated native QA.
// Do not expose account passwords, tokens, or mutable world/inventory references.
export function gameplayDiagnostics({world,bag,vitals,yaw,pitch,mode,worldId}) {
  return {
    facing:{yaw,pitch},
    hunger:vitals.hunger,
    inventory:bag.snapshot(),
    crops:[...world.crops.values()].map(({x,y,z,growth})=>({x,y,z,growth})),
    mode,
    worldId:worldId??null
  };
}
