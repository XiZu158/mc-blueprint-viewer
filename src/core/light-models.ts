import type {BlockState,Vec3} from './types';
import type {Box} from './models';
import {elementModel,orientPiston,type ModelPart,type ModelQuad,type FaceSpec} from './piston-model';
import {faces,type Face} from './textures';

const box=(v:number[])=>v.map(n=>n/16) as Box;
const face=(texture:string,uv:number[]):FaceSpec=>({texture,uv:uv as FaceSpec['uv']});
// Mojang's torch/lantern model rectangles, sampled from the supplied block.zip atlas.
// Rotated elements retain both their UVs and true normals; their owning cell remains pickable.
function rotated(part:ModelPart,axis:0|1|2,angle:number,origin:Vec3,facing='north'){
 const model=elementModel([part]),r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),a=(axis+1)%3,b=(axis+2)%3;
 const spin=(p:Vec3,center:Vec3):Vec3=>{const q=p.map((v,i)=>v-center[i]) as Vec3,x=q[a],y=q[b];q[a]=x*c-y*s;q[b]=x*s+y*c;return q.map((v,i)=>v+center[i]) as Vec3;};
 const center=orientPiston([.5,.5,.5],facing);
 for(const q of model.quads){
  q.points=q.points.map(p=>orientPiston(spin(p,origin),facing));
  const n:Vec3=[0,0,0];n[q.axis]=q.sign;
  const normal=spin(n,[0,0,0]);q.normal=orientPiston(normal.map(v=>v+.5) as Vec3,facing).map((v,i)=>v-center[i]) as Vec3;
  q.axis=q.normal.reduce((best,v,i)=>Math.abs(v)>Math.abs(q.normal![best])?i:best,0);q.sign=Math.sign(q.normal[q.axis]);
 }
 const points=model.quads.flatMap(q=>q.points);
 model.boxes=[[...[0,1,2].map(a=>Math.min(...points.map(p=>p[a]))),...[0,1,2].map(a=>Math.max(...points.map(p=>p[a])))] as Box];
 return model;
}
function torchModel(s:BlockState,n:string){
 const wall=n.includes('wall_torch'),texture=n.startsWith('redstone_')?(s.properties.lit==='false'?'redstone_torch_off':'redstone_torch'):n.startsWith('soul_')?'soul_torch':n.startsWith('copper_')?'copper_torch':'torch';
 const part:ModelPart={box:box(wall?[-1,3.5,7,1,13.5,9]:[7,0,7,9,10,9]),faces:Object.fromEntries(faces.map(f=>[f,face(texture,f==='up'?[7,6,9,8]:f==='down'?[7,13,9,15]:[7,6,9,16])]))};
 if(!wall)return elementModel([part]);
 // The canonical wall model points east; rotate it around the block center to face the requested direction.
 const facing=({east:'north',south:'east',west:'south',north:'west'} as Record<string,string>)[s.properties.facing??'north'];
 return rotated(part,2,-22.5,[0,3.5/16,.5],facing);
}
function lanternModel(s:BlockState,n:string){
 const texture=n.replace(/^waxed_/,''),hanging=s.properties.hanging==='true',y=hanging?1:0;
 const sides=(uv:number[]):Partial<Record<Face,FaceSpec>>=>Object.fromEntries(['north','south','west','east'].map(f=>[f,face(texture,uv)]));
 const body:ModelPart={box:box([5,y,5,11,7+y,11]),faces:{...sides([0,2,6,9]),down:face(texture,[0,9,6,15]),up:face(texture,[0,9,6,15])}};
 const cap:ModelPart={box:box([6,7+y,6,10,9+y,10]),faces:{...sides([1,0,5,2]),up:face(texture,[1,10,5,14]),...(hanging?{down:face(texture,[1,10,5,14])}:{})}};
 const model=elementModel([body,cap]);
 const hooks:ModelPart[]=[
  {box:box(hanging?[6.5,11,8,9.5,15,8]:[6.5,9,8,9.5,11,8]),faces:{north:face(texture,hanging?[14,1,11,5]:[14,1,11,3]),south:face(texture,hanging?[11,1,14,5]:[11,1,14,3])}},
  {box:box(hanging?[8,10,6.5,8,16,9.5]:[8,9,6.5,8,11,9.5]),faces:{west:face(texture,hanging?[14,6,11,12]:[14,10,11,12]),east:face(texture,hanging?[11,6,14,12]:[11,10,14,12])}}
 ];
 for(const hook of hooks){const m=rotated(hook,1,45,[.5,.5,.5]);model.quads.push(...m.quads);model.boxes.push(...m.boxes);}
 return model;
}
function chainModel(s:BlockState,n:string){
 const texture=n==='chain'?'iron_chain':n.replace(/^waxed_/,''),parts:ModelPart[]=[
  {box:box([6.5,0,8,9.5,16,8]),faces:{north:face(texture,[3,0,0,16]),south:face(texture,[0,0,3,16])}},
  {box:box([8,0,6.5,8,16,9.5]),faces:{west:face(texture,[6,0,3,16]),east:face(texture,[3,0,6,16])}}
 ];
 const model={boxes:[] as Box[],quads:[] as ModelQuad[]};
 for(const part of parts){const m=rotated(part,1,45,[.5,.5,.5]);model.boxes.push(...m.boxes);model.quads.push(...m.quads);}
 const direction=s.properties.axis==='x'?'east':s.properties.axis==='z'?'south':undefined;
 if(direction){
  // Rotate a vertical chain into the X or Z axis while preserving its crossed planes.
  const transform=(p:Vec3):Vec3=>direction==='east'?[p[1],1-p[0],p[2]]:[p[0],1-p[2],p[1]];
  for(const q of model.quads){q.points=q.points.map(transform);q.normal=transform(q.normal!.map(v=>v+.5) as Vec3).map(v=>v-.5) as Vec3;q.axis=q.normal.reduce((best,v,i)=>Math.abs(v)>Math.abs(q.normal![best])?i:best,0);q.sign=Math.sign(q.normal[q.axis]);}
  model.boxes=model.boxes.map(b=>{const lo=transform(b.slice(0,3) as Vec3),hi=transform(b.slice(3) as Vec3);return [...lo.map((v,i)=>Math.min(v,hi[i])),...lo.map((v,i)=>Math.max(v,hi[i]))] as Box;});
 }
 return model;
}
export function lightModel(s:BlockState):{boxes:Box[];quads:ModelQuad[]}|undefined {
 if(!s.name.startsWith('minecraft:'))return;
 const n=s.name.slice(10);
 if(/^(?:(?:redstone|soul|copper)_)?(?:wall_)?torch$/.test(n))return torchModel(s,n);
 if(/^(?:soul_lantern|lantern|(?:waxed_)?(?:(?:exposed|weathered|oxidized)_)?copper_lantern)$/.test(n))return lanternModel(s,n);
 if(/^(?:chain|iron_chain|(?:waxed_)?(?:(?:exposed|weathered|oxidized)_)?copper_chain)$/.test(n))return chainModel(s,n);
}
