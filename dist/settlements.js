// Generation is deterministic; only supply refill timestamps change during play.
export const SUPPLY_REGEN_MS = 3 * 60 * 60 * 1000;
export function generateSettlements(world, noise) {
  const names = ['Alderwick', 'Stonehaven', 'Briar Crossing', 'Copper Hollow'];
  for (let index = 0; index < 2; index++) {
    const corner = index === 0 ? 14 : 49;
    const x = corner + Math.floor(noise(index, 701) * 3) - 1;
    const z = (noise(index, 709) > .5 ? corner : 63-corner) + Math.floor(noise(index, 713)*3)-1;
    const y = world.surface(x,z);
    const town = { name:names[Math.floor(noise(index,719)*names.length)], x,y,z };
    world.towns.push(town);
    // A level plaza and foundations; do not regenerate buildings after destruction.
    for(let dx=-10;dx<=10;dx++)for(let dz=-10;dz<=10;dz++) {
      for(let by=1;by<y;by++) if(!world.get(x+dx,by,z+dz)) world.raw(x+dx,by,z+dz,3);
      for(let by=y;by<40;by++)world.raw(x+dx,by,z+dz,0);
      world.raw(x+dx,y-1,z+dz,Math.abs(dx)<=1||Math.abs(dz)<=1?8:1);
    }
    for(const [number,offset] of [[0,[-5,-5]],[1,[5,-5]],[2,[0,5]]]) {
      const [dx,dz]=offset,bx=x+dx,bz=z+dz;
      const wall = number===1?8:7;
      for(let xx=-3;xx<=3;xx++)for(let zz=-3;zz<=3;zz++) {
        world.raw(bx+xx,y-1,bz+zz,8);
        for(let h=0;h<4;h++) {
          const edge=Math.abs(xx)===3||Math.abs(zz)===3;
          const corner=Math.abs(xx)===3&&Math.abs(zz)===3;
          const door=xx===0&&zz===3&&h<2;
          const window=h===1&&((Math.abs(xx)===3&&zz===0)||(Math.abs(zz)===3&&xx===0));
          world.raw(bx+xx,y+h,bz+zz,door||window||!edge?0:corner?4:wall);
        }
        world.raw(bx+xx,y+4,bz+zz,number===1?3:8);
      }
      world.raw(bx-1,y,bz-1,9); // A usable crafting table in each house.
      if(number===1)world.raw(bx+1,y,bz-1,15); // Smithy's usable furnace.
      const crate={ x:bx+1,y,z:bz+1,nextAt:0,town:town.name,
        loot:number===1?[[3,4],[7,2],[11,1]]:number===0?[[4,4],[7,3],[5,3]]:[[2,4],[3,3],[5,4]] };
      world.supplies.push(crate);world.raw(crate.x,crate.y,crate.z,19);
    }
    // A small quarry exposes the first iron tier without handing out refined metal.
    world.raw(x+9,y-1,z+8,11);
  }
}
export function generateOres(world, noise) {
  for(let x=2;x<62;x++)for(let z=2;z<62;z++)for(let y=2;y<10;y++) {
    if(world.get(x,y,z)!==3)continue;
    const vein=noise(Math.floor(x/2)+y*61,Math.floor(z/2)+811);
    if(y<6&&vein>.985)world.raw(x,y,z,12);
    else if(vein>.94)world.raw(x,y,z,11);
  }
}
