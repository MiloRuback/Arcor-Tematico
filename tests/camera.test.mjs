import test from 'node:test';
import assert from 'node:assert/strict';
import {constrainCamera,insideEnvelope} from '../js/camera-constraints.mjs';
test('dolly has a finite near and far limit',()=>{
  const target=[0,2.2,0];
  assert.equal(constrainCamera(target,[0,2.2,1000],15.5,48)[2],48);
  assert.equal(constrainCamera(target,[0,2.2,1],15.5,48)[2],15.5);
});
test('camera remains outside stands and wall across the supported orbit',()=>{
  for(const x of [-6.8,0,6.8])for(let angle=0;angle<Math.PI*2;angle+=.06)for(const phi of [.25,.7,Math.PI*.46])for(const radius of [7.5,9,11,15.5,22]){
    const target=[x,1.9,0];const pos=[x+Math.sin(phi)*Math.cos(angle)*radius,1.9+Math.cos(phi)*radius,Math.sin(phi)*Math.sin(angle)*radius];
    const result=constrainCamera(target,pos,7.5,65);
    assert.equal(insideEnvelope(result),false,JSON.stringify({target,pos,result}));
    assert.ok(result[1]>=.65);
  }
});
test('camera cannot go below floor level',()=>assert.ok(constrainCamera([0,1.9,0],[0,-9,20],7.5,65)[1]>=.65));
