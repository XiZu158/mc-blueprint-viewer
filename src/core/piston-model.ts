import type {BlockState,Vec3} from './types';
import type {Box} from './models';
import {faces,type Face} from './textures';

export interface ModelQuad {points:Vec3[];uv:[number,number][];axis:number;sign:number;texture:string;normal?:Vec3}
export type FaceSpec={texture:string;uv:[number,number,number,number];rotation?:number};
export interface ModelPart {box:Box;faces:Partial<Record<Face,FaceSpec>>}
export function orientPiston(point:Vec3,facing:string):Vec3 {
  const [x,y,z]=point;
  switch(facing){case 'east':return [1-z,y,x];case 'south':return [1-x,y,1-z];case 'west':return [z,y,1-x];case 'up':return [x,1-z,y];case 'down':return [x,z,1-y];default:return [x,y,z];}
}
function projection(p:Vec3,face:Face):[number,number]{
  const [x,y,z]=p;switch(face){case 'north':return [1-x,1-y];case 'south':return [x,1-y];case 'west':return [z,1-y];case 'east':return [1-z,1-y];case 'up':return [x,z];case 'down':return [x,1-z];}
}
// Explicit per-element face rectangles keep thin strips and rod UVs independent of box size.
export function pistonModel(s:BlockState):{boxes:Box[];quads:ModelQuad[]}|undefined {
  if(!['minecraft:piston','minecraft:sticky_piston','minecraft:piston_head'].includes(s.name))return;
  const head=s.name==='minecraft:piston_head',facing=s.properties.facing??'north';
  const platform=s.name==='minecraft:sticky_piston'||s.properties.type==='sticky'?'piston_top_sticky':'piston_top';
  const specs:Partial<Record<Face,FaceSpec>>={
    down:{texture:'piston_side',uv:[0,0,16,head?4:16],rotation:180},up:{texture:'piston_side',uv:[0,0,16,head?4:16]},
    west:{texture:'piston_side',uv:[0,0,16,head?4:16],rotation:270},east:{texture:'piston_side',uv:[0,0,16,head?4:16],rotation:90},
    north:{texture:platform,uv:[0,0,16,16]},south:{texture:head?'piston_top':'piston_bottom',uv:[0,0,16,16]}
  };
  const parts:ModelPart[]=[];
  if(head){
    parts.push({box:[0,0,0,1,1,.25],faces:specs});
    parts.push({box:[.375,.375,.25,.625,.625,s.properties.short==='true'?1:1.25],faces:{
      down:{texture:'piston_side',uv:[0,0,16,4],rotation:90},up:{texture:'piston_side',uv:[0,0,16,4],rotation:270},
      west:{texture:'piston_side',uv:[16,4,0,0]},east:{texture:'piston_side',uv:[0,0,16,4]}
    }});
  }else{
    const extended=s.properties.extended==='true';
    if(extended){specs.north={texture:'piston_inner',uv:[0,0,16,16]};for(const face of ['up','down','east','west'] as Face[])specs[face]!.uv=[0,4,16,16];}
    parts.push({box:[0,0,extended?.25:0,1,1,1],faces:specs});
  }
  return elementModel(parts,facing);
}
export function elementModel(parts:ModelPart[],facing='north'):{boxes:Box[];quads:ModelQuad[]} {
  const boxes:Box[]=[],quads:ModelQuad[]=[];
  for(const part of parts){
    const lo=orientPiston(part.box.slice(0,3) as Vec3,facing),hi=orientPiston(part.box.slice(3) as Vec3,facing);
    boxes.push([...lo.map((v,i)=>Math.min(v,hi[i])),...lo.map((v,i)=>Math.max(v,hi[i]))] as Box);
    for(const face of faces){
      const spec=part.faces[face];if(!spec)continue;
      const index=faces.indexOf(face),d=Math.floor(index/2),sign=index%2?1:-1,u=(d+1)%3,v=(d+2)%3,b=part.box;
      const p:Vec3=[0,0,0];p[d]=b[d+(sign>0?3:0)];p[u]=b[u];p[v]=b[v];
      const a=[...p] as Vec3,c=[...p] as Vec3,e=[...p] as Vec3;a[u]=b[u+3];c[u]=a[u];c[v]=b[v+3];e[v]=c[v];
      const points=sign>0?[p,a,c,e]:[p,e,c,a]; // outward winding before the orientation rotation
      const projected=points.map(p=>projection(p,face)),min=[0,1].map(a=>Math.min(...projected.map(p=>p[a]))),max=[0,1].map(a=>Math.max(...projected.map(p=>p[a])));
      const uv=projected.map(p=>{let u=(p[0]-min[0])/(max[0]-min[0]),v=(p[1]-min[1])/(max[1]-min[1]);for(let i=0;i<(spec.rotation??0)/90;i++)[u,v]=[v,1-u];const [u0,v0,u1,v1]=spec.uv;return [(u0+u*(u1-u0))/16,1-(v0+v*(v1-v0))/16] as [number,number];});
      const center=orientPiston([.5,.5,.5],facing),n:Vec3=[.5,.5,.5];n[d]+=sign;const rotated=orientPiston(n,facing).map((v,i)=>v-center[i]);const axis=rotated.findIndex(v=>v!==0);
      quads.push({points:points.map(p=>orientPiston(p,facing)),axis,sign:rotated[axis],uv,texture:spec.texture});
    }
  }
  return {boxes,quads};
}
