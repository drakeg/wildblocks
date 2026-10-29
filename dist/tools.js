export const HAND_REACH = 4;
export const TOOL_REACH = 5;
export const PLACE_REACH = 5;
export const TOOLS = [
  { id:"iron-pick", name:"Iron pick", blocks:[3,6,8,11,12,15,16,17,18],speed:3,tier:3 },
  { id:"iron-sword", name:"Iron sword", blocks:[],speed:0 },
  { id:"iron-armor", name:"Iron armor", blocks:[],speed:0 },
  { id:"starsteel-armor", name:"Starsteel armor", blocks:[],speed:0 },
  { id: "wood-sword", name: "Timber sword", blocks: [], speed: 0 },
  { id: "slate-sword", name: "Slate sword", blocks: [], speed: 0 },
  { id: "woven-armor", name: "Woven armor", blocks: [], speed: 0 },
  { id: "slate-armor", name: "Slate armor", blocks: [], speed: 0 },
  { id: "slate-helmet", name: "Slate helmet", blocks: [], speed: 0 },
  { id: "wood-pick", name: "Timber pick", blocks: [3, 6, 8, 15, 17], speed: 1, tier:1 },
  { id: "slate-pick", name: "Slate pick", blocks: [3, 6, 8, 11, 15, 16, 17, 18], speed: 1.8, tier:2 },
  { id: "wood-axe", name: "Timber axe", blocks: [4,7,9,19,20,22,23,24,25], speed: 2 },
  { id: "slate-axe", name: "Slate axe", blocks: [4,7,9,19,20,22,23,24,25], speed: 3 },
  { id: "wood-shovel", name: "Timber shovel", blocks: [1, 2], speed: 2.2 },
];
// Automatically use the fastest owned tool that suits the targeted material.
export function miningRule(hit, owned = new Set(), mode = "survival") {
  if (mode === "creative")
    return { allowed: true, reach: 7, speed: 1, name: "Creative" };
  const tool = TOOLS.filter(
    (t) => owned.has(t.id) && t.blocks.includes(hit?.id),
  ).sort((a, b) => b.speed - a.speed)[0];
  return {
    allowed: ![3,6,8,11,12,15,16,17,18].includes(hit?.id) || !!tool && (tool.tier??0)>=(hit?.id===12?3:hit?.id===11||hit?.id===16||hit?.id===18?2:1),
    reach: tool ? TOOL_REACH : HAND_REACH,
    speed: tool?.speed ?? 1,
    name: tool?.name ?? "Empty hands",
  };
}
