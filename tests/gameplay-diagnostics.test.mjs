import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../dist/world.js';
import {Gathering} from '../dist/gathering.js';
import {playerVitals} from '../dist/survival.js';
import {gameplayDiagnostics} from '../dist/gameplay-diagnostics.js';

test('native QA state gives exact facing, food and crops without mutable references or credentials',()=>{
 const world=new World('wb002-qa-state',1),bag=new Gathering(),vitals=playerVitals({hunger:7.25});
 assert(bag.add(30,2));
 world.crops.set('32,13,30',{x:32,y:13,z:30,growth:145});
 const original={world,bag,vitals,yaw:-0.4,pitch:0.25,mode:'survival',worldId:'qa-world'};
 const result=gameplayDiagnostics(original);
 assert.deepEqual(result.facing,{yaw:-0.4,pitch:0.25});
 assert.equal(result.hunger,7.25);
 assert.equal(result.inventory[30],2);
 assert.deepEqual(result.crops,[{x:32,y:13,z:30,growth:145}]);
 assert.equal(result.mode,'survival');
 assert.equal(result.worldId,'qa-world');
 assert.deepEqual(Object.keys(result).sort(),['crops','facing','hunger','inventory','mode','worldId']);
 result.inventory[30]=900;result.crops[0].growth=999;result.facing.yaw=1;
 assert.equal(bag.counts[30],2,'read-only diagnostic must not edit backpack');
 assert.equal(world.crops.get('32,13,30').growth,145,'diagnostic must not edit crop');
 assert.equal(original.yaw,-0.4);
});
test('hosted-server QA omits local world ID and contains no session secrets',()=>{
 const result=gameplayDiagnostics({world:new World('hosted'),bag:new Gathering(),
   vitals:playerVitals(),yaw:0,pitch:0,mode:'creative',worldId:null});
 assert.equal(result.worldId,null);
 assert.equal(result.mode,'creative');
 assert(!JSON.stringify(result).includes('token'));
 assert(!JSON.stringify(result).includes('password'));
});
