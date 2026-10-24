import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectAirport, placeAirportLabels, LABEL_WIDTH, LABEL_HEIGHT } from '../standby-app/src/lib/globe-label-layout.ts';

test('airport projection matches the globe front center and hides the far side', () => {
  const front=projectAirport([0,0],-Math.PI/2,0,1,480);
  assert.ok(Math.abs(front.x-240)<1e-8 && Math.abs(front.y-240)<1e-8);
  assert.equal(front.visible,true);
  assert.equal(projectAirport([0,180],-Math.PI/2,0,1,480).visible,false);
  const point=projectAirport([0,20],-Math.PI/2,0,1,480);
  const zoomed=projectAirport([0,20],-Math.PI/2,0,2,480);
  assert.ok(Math.abs((zoomed.x-240)-2*(point.x-240))<1e-8);
});
function assertReadable(points,size) {
  const labels=placeAirportLabels(points,size);
  assert.equal(labels.length,points.length);
  labels.forEach((label,index)=>{
    assert.ok(label.x>=0 && label.y>=0 && label.x+LABEL_WIDTH<=size && label.y+LABEL_HEIGHT<=size);
    labels.slice(index+1).forEach(other=>assert.ok(!(label.x<other.x+LABEL_WIDTH && label.x+LABEL_WIDTH>other.x && label.y<other.y+LABEL_HEIGHT && label.y+LABEL_HEIGHT>other.y)));
  });
  return labels;
}
test('nearby Heathrow, Frankfurt and Paris labels remain distinct and in bounds',()=>{
  const positions=[[51.47,-.45],[50.03,8.57],[49.01,2.55]];
  const points=positions.map((position,index)=>({id:String(index),...projectAirport(position,-(-.45*Math.PI/180)-Math.PI/2,51.47*Math.PI/180,2,480)}));
  const labels=assertReadable(points,480);
  const repeat=placeAirportLabels(points,480,new Map(labels.map(label=>[label.id,label.slot])));
  assert.deepEqual(repeat,labels);
});
test('four coincident airports at the viewport edge still have separate labels',()=>{
  assertReadable(Array.from({length:4},(_,index)=>({id:String(index),x:4,y:4,visible:true})),192);
});
test('hidden and offscreen airport markers do not produce misleading floating labels',()=>{
  assert.deepEqual(placeAirportLabels([{id:'back',x:120,y:120,visible:false},{id:'outside',x:-100,y:120,visible:true}],240),[]);
});
