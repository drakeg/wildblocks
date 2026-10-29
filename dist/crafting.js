import { TOOLS } from "./tools.js";
export function nearStation(world, position, id=9) {
  const x = Math.floor(position.x),
    y = Math.floor(position.y),
    z = Math.floor(position.z);
  for (let dx = -3; dx <= 3; dx++)
    for (let dy = -3; dy <= 3; dy++)
      for (let dz = -3; dz <= 3; dz++)
        if (
          world.get(x + dx, y + dy, z + dz) === id &&
          Math.hypot(
            x + dx + 0.5 - position.x,
            y + dy + 0.5 - position.y,
            z + dz + 0.5 - position.z,
          ) <= 3
        )
          return true;
  return false;
}
export function nearCraftingTable(world,position){return nearStation(world,position,9);}
export const RECIPES = [
  {key:"door",name:"Timber door",description:"Two blocks tall. Right-click or R opens/closes it. Needs a clear space above and a solid floor.",cost:[[7,6]],output:{id:20,count:1},station:true,category:"furniture"},
  {key:"glass",name:"Glass",description:"Fuse earth and crushed slate with timber fuel in a furnace. Crafting level 3.",cost:[[2,2],[3,1],[7,1]],output:{id:26,count:2},stationId:15,level:3,category:"furniture"},
  {key:"window",name:"Framed windows",description:"Two transparent glass windows with timber frames.",cost:[[26,2],[7,2]],output:{id:21,count:2},category:"furniture"},
  {key:"dining-table",name:"Timber table",description:"A table for furnishing a home. Crafting uses a separate crafting table.",cost:[[7,4]],output:{id:22,count:1},category:"furniture"},
  {key:"chair",name:"Timber chair",description:"A timber chair for furnishing a home.",cost:[[7,3]],output:{id:23,count:1},category:"furniture"},
  {key:"chest",name:"Storage chest",description:"Shared storage with 27 slots. Right-click or R to open. Empty it before removing it.",cost:[[7,8]],output:{id:24,count:1},station:true,category:"furniture"},
  {key:"furnace",name:"Furnace",description:"Place to smelt iron and starsteel. Crafting level 3.",cost:[[3,8],[7,4]],output:{id:15,count:1},station:true,level:3,category:"advanced"},
  {key:"smelt-iron",name:"Iron ingots",description:"Smelt two iron ore using a timber board as fuel. Stand near a furnace.",cost:[[11,2],[7,1]],output:{id:13,count:2},stationId:15,level:3,category:"advanced"},
  {key:"anvil",name:"Anvil",description:"Place to forge iron tools, weapons and armor. Crafting level 5.",cost:[[13,6],[8,4]],output:{id:16,count:1},station:true,level:5,category:"advanced"},
  {key:"stonecutter",name:"Stonecutter",description:"Place to cut reinforced building materials. Crafting level 4.",cost:[[13,2],[8,4],[7,2]],output:{id:17,count:1},station:true,level:4,category:"advanced"},
  {key:"iron-pick",name:"Iron pick",description:"Tier 3 pick. Mines rare Starstone ore and cuts ordinary stone quickly.",cost:[[13,3],[7,2]],tool:"iron-pick",stationId:16,level:5,category:"advanced"},
  {key:"iron-sword",name:"Iron sword",description:"10 damage. Forged at an anvil; automatically equipped.",cost:[[13,4],[7,1]],tool:"iron-sword",stationId:16,level:5,category:"advanced"},
  {key:"iron-armor",name:"Iron armor",description:"50% protection. Requires an anvil and Crafting level 6.",cost:[[13,8],[5,4]],tool:"iron-armor",stationId:16,level:6,category:"advanced"},
  {key:"starsteel",name:"Starsteel plates",description:"Smelt deep Starstone with iron and timber fuel at a furnace.",cost:[[12,2],[13,2],[7,2]],output:{id:14,count:2},stationId:15,level:7,category:"advanced"},
  {key:"reinforced-bricks",name:"Reinforced bricks",description:"Cut slate with a Starsteel plate to make six strong building blocks.",cost:[[3,6],[14,1]],output:{id:18,count:6},stationId:17,level:7,category:"advanced"},
  {key:"starsteel-armor",name:"Starsteel armor",description:"60% protection. End-tier armor forged at an anvil. Crafting level 8.",cost:[[14,8],[13,4]],tool:"starsteel-armor",stationId:16,level:8,category:"advanced"},
  { key: "torch", name: "Torches", description: "Place for warm light and a 7-block creature-free area. Select a torch for a handheld light.", cost: [[7,1],[5,1]], output: {id:10,count:4} },
  { key: "wood-sword", name: "Timber sword", description: "4 damage. Automatically equipped. Click a creature or press F to attack.", cost: [[7,3]], tool:"wood-sword" },
  { key: "slate-sword", name: "Slate sword", description: "7 damage. Requires a crafting table.", cost: [[7,2],[3,3]], tool:"slate-sword", station:true },
  { key: "woven-armor", name: "Woven armor", description: "20% protection. Automatically worn.", cost: [[5,6],[7,2]], tool:"woven-armor" },
  { key: "slate-armor", name: "Slate armor", description: "40% protection. Replaces woven armor. Requires a crafting table.", cost: [[3,8],[7,2]], tool:"slate-armor", station:true },
  { key: "slate-helmet", name: "Slate helmet", description: "20% additional protection, up to 60% total. Requires a crafting table.", cost: [[3,5]], tool:"slate-helmet", station:true },
  {
    key: "table",
    name: "Crafting table",
    description:
      "Place this block, then stand within 3 blocks to craft advanced recipes.",
    cost: [[7, 4]],
    output: { id: 9, count: 1 },
  },
  {
    key: "backpack",
    name: "Backpack expansion",
    description:
      "Add three resource slots (9 → 12 → 15 → 18). Tools stay in your separate tool belt.",
    cost: [
      [7, 4],
      [5, 4],
    ],
    expand: 3,
  },
  {
    key: "boards",
    name: "Timber boards",
    description: "A warm building block.",
    cost: [[4, 1]],
    output: { id: 7, count: 4 },
  },
  {
    key: "bricks",
    name: "Slate bricks",
    description: "Cut stone for sturdier-looking builds.",
    cost: [[3, 2]],
    output: { id: 8, count: 2 },
  },
  {
    key: "terracotta",
    name: "Terracotta",
    description: "Shape earth with crushed slate.",
    cost: [
      [2, 2],
      [3, 1],
    ],
    output: { id: 6, count: 2 },
  },
  {
    key: "wood-pick",
    name: "Timber pick",
    description: "Starter pick: break stone without needing stone to craft it.",
    cost: [[7, 3]],
    tool: "wood-pick",
  },
  {
    key: "wood-axe",
    name: "Timber axe",
    description: "Chop wood 2× faster with longer tool reach.",
    cost: [[7, 3]],
    tool: "wood-axe",
  },
  {
    key: "slate-axe",
    name: "Slate axe",
    description: "Chop wood 3× faster with longer tool reach.",
    cost: [
      [7, 3],
      [3, 2],
    ],
    tool: "slate-axe",
  },
  {
    key: "wood-shovel",
    name: "Timber shovel",
    description: "Dig Meadow and Earth 2.2× faster.",
    cost: [[7, 2]],
    tool: "wood-shovel",
  },
  {
    key: "pick",
    name: "Slate pick",
    description:
      "Auto-equipped: mines slate, bricks and terracotta 1.8× faster.",
    cost: [
      [7, 3],
      [3, 2],
    ],
    tool: "slate-pick",
  },
];
export function restoreTools(saved = []) {
  if (
    !Array.isArray(saved) ||
    saved.length > TOOLS.length ||
    saved.some((t) => !TOOLS.some((tool) => tool.id === t)) ||
    new Set(saved).size !== saved.length
  )
    throw Error("Invalid saved tools.");
  return new Set(saved);
}
export function craftProblem(recipe, bag, tools, mode, atTable = false, progression = null, stations = []) {
  if (!RECIPES.includes(recipe)) return "Unknown recipe";
  if(mode!=="creative" && recipe.level && (progression?.skill("Crafting").level??1)<recipe.level)
    return `Crafting level ${recipe.level} required (current ${progression?.skill("Crafting").level??1})`;
  if(mode!=="creative" && recipe.stationId && !stations.includes(recipe.stationId))
    return `Requires a nearby ${({15:"furnace",16:"anvil",17:"stonecutter"})[recipe.stationId]}`;
  if (
    mode !== "creative" &&
    (recipe?.station || ["backpack", "bricks", "terracotta", "pick", "slate-axe"].includes(recipe?.key)) &&
    !atTable
  )
    return "Requires a nearby crafting table";
  if (!RECIPES.includes(recipe)) return "Unknown recipe";
  if (recipe.expand && bag.capacity >= 18) return "Backpack fully expanded";
  if (recipe.tool && tools.has(recipe.tool)) return "Already owned";
  if (
    recipe.output &&
    bag.counts[recipe.output.id] + recipe.output.count > 9999
  )
    return "Inventory full";
  if (
    mode !== "creative" &&
    recipe.cost.some(([id, count]) => bag.counts[id] < count)
  )
    return "Gather ingredients";
  const next = [...bag.counts];
  if (mode !== "creative") for (const [id, n] of recipe.cost) next[id] -= n;
  if (recipe.output) next[recipe.output.id] += recipe.output.count;
  if (!bag.canFit(next)) return "Backpack full · expand or use items";
  return "";
}
export function craft(
  key,
  bag,
  tools,
  progression,
  mode = "survival",
  atTable = false,
  stations = [],
) {
  const recipe = RECIPES.find((r) => r.key === key);
  if (craftProblem(recipe, bag, tools, mode, atTable, progression, stations)) return false;
  if (mode !== "creative")
    for (const [id, count] of recipe.cost) bag.counts[id] -= count;
  if (recipe.output) bag.counts[recipe.output.id] += recipe.output.count;
  if (recipe.tool) tools.add(recipe.tool);
  if (recipe.expand) bag.capacity = Math.min(18, bag.capacity + recipe.expand);
  bag.syncOrder();
  if (mode !== "creative") progression.earn("Crafting", 20);
  return true;
}
