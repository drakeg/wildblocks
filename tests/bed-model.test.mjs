import test from 'node:test';
import assert from 'node:assert/strict';
import { BED_PIECES, bedVertex } from '../dist/bed-model.js';
import { World } from '../dist/world.js';
import { Gathering } from '../dist/gathering.js';

test('Woven bed pieces form an elevated mattress, headboard, and supported feet inside one voxel',()=>{
 assert(BED_PIECES.length>=7);
 for(const piece of BED_PIECES){
   assert.equal(piece.length,7);
   const [x,y,z,width,height,depth,tint]=piece;
   assert([x,y,z,width,height,depth,tint].every(Number.isFinite));
   assert(x>=0&&y>=0&&z>=0&&width>0&&height>0&&depth>0&&tint>0);
   assert(x+width<=1.000001&&y+height<=1.000001&&z+depth<=1.000001);
 }
 assert(BED_PIECES.some(([x,y,z,w,h,d])=>y>=.3&&w>.7&&d>.7));
 assert(BED_PIECES.some(([x,y,z,w,h,d])=>z>.8&&h>.4));
 assert(BED_PIECES.some(([x,y,z,w,h,d])=>y===0&&w<.2&&d<.2));
});

test('Woven bed vertices honor four orientations in world coordinates',()=>{
 const vertex=[.13,.45,.29], origin=[32,13,30];
 const expected=[
   [32.13,13.45,30.29],
   [32.71,13.45,30.13],
   [32.87,13.45,30.71],
   [32.29,13.45,30.87],
 ];
 for(let turn=0;turn<4;turn++){
   const actual=bedVertex(...origin,...vertex,turn);
   for(let i=0;i<3;i++)assert(Math.abs(actual[i]-expected[turn][i])<1e-9);
 }
 assert.deepEqual(bedVertex(...origin,...vertex,4),bedVertex(...origin,...vertex,0));
});

test('placed Woven bed saves its orientation with the world snapshot',()=>{
 const w=new World('render-bed-check',1), bag=new Gathering();
 bag.counts[33]=1;
 assert(bag.place(w,32,14,30,33,{x:28,y:14,z:28},'survival',3));
 const resumed=World.restore(w.snapshot());
 assert.equal(resumed.get(32,14,30),33);
 assert.equal(resumed.facing.get('32,14,30'),3);
 assert.notDeepEqual(bedVertex(32,14,30,.15,.5,.3,3),bedVertex(32,14,30,.15,.5,.3,0));
});
