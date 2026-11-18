// The original one-block Woven bed model: legs, timber frame, quilt and pillow.
// Each piece is [x, y, z, width, height, depth, brightness].
export const BED_PIECES = [
  [.05,0,.06,.12,.38,.12,.65],
  [.83,0,.06,.12,.38,.12,.65],
  [.05,0,.82,.12,.38,.12,.65],
  [.83,0,.82,.12,.38,.12,.65],
  [.04,.28,.04,.92,.11,.92,.65],
  [.06,.39,.06,.88,.12,.88,1.28],
  [.09,.51,.08,.82,.09,.26,1.75],
  [.02,.31,.88,.96,.52,.08,.8],
  [.03,.76,.86,.94,.06,.12,1.12],
];
export function bedVertex(x,y,z,a,b,c,turns=0) {
  turns=((turns%4)+4)%4;
  for(let i=0;i<turns;i++)[a,c]=[1-c,a];
  return [x+a,y+b,z+c];
}
