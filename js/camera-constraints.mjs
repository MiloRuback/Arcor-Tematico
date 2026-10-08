// Conservative envelopes in metres; circulation remains outside modeled geometry.
export const envelopes = [
  {min:[-9.95,-.4,-2.9],max:[-3.65,4.4,2.9]},
  {min:[-3.55,-.4,-3.55],max:[3.55,4.5,3.55]},
  {min:[3.65,-.4,-2.9],max:[9.95,4.4,2.9]},
  {min:[-11.4,-.4,-5.35],max:[11.4,5.4,-3.75]},
];
export function insideEnvelope(point) {
  return envelopes.some(box=>point.every((v,i)=>v>box.min[i]&&v<box.max[i]));
}
export function constrainCamera(target, position, minimum, maximum) {
  const offset=position.map((v,i)=>v-target[i]);
  const length=Math.hypot(...offset)||1;
  const direction=offset.map(v=>v/length);
  let distance=Math.min(maximum,Math.max(minimum,length));
  // Find each ray/box interval. If the intended camera is inside a volume,
  // keep it beyond that volume's outer edge, with a 25 cm safety margin.
  for(let pass=0;pass<envelopes.length;pass++)for(const box of envelopes){
    let near=-Infinity,far=Infinity;
    for(let axis=0;axis<3;axis++){
      if(Math.abs(direction[axis])<1e-8){if(target[axis]<box.min[axis]||target[axis]>box.max[axis]){far=-Infinity;break;}}
      else{const a=(box.min[axis]-target[axis])/direction[axis],b=(box.max[axis]-target[axis])/direction[axis];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}
    }
    if(near<=far&&distance>near&&distance<far+.25)distance=Math.min(maximum,far+.25);
  }
  const result=target.map((v,i)=>v+direction[i]*distance);
  result[1]=Math.max(.65,result[1]);
  return result;
}
