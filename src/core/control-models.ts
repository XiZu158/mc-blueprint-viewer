import type {BlockState,Vec3} from './types';
import type {Box} from './models';
import {elementModel,orientPiston,type FaceSpec,type ModelPart,type ModelQuad} from './piston-model';
import {textureName} from './textures';

const unit=(v:number[])=>v.map(n=>n/16) as Box;
const face=(texture:string,uv:FaceSpec['uv']):FaceSpec=>({texture,uv});
type Detail={boxes:Box[];quads:ModelQuad[]};
function transform(model:Detail,point:(p:Vec3)=>Vec3,vector:(p:Vec3)=>Vec3):Detail {
 for(const q of model.quads){q.points=q.points.map(point);const n:Vec3=[0,0,0];n[q.axis]=q.sign;q.normal=vector(q.normal??n);q.axis=q.normal.reduce((a,v,i)=>Math.abs(v)>Math.abs(q.normal![a])?i:a,0);q.sign=Math.sign(q.normal[q.axis]);}
 model.boxes=model.boxes.map(b=>{const corners:Vec3[]=[];for(const x of [b[0],b[3]])for(const y of [b[1],b[4]])for(const z of [b[2],b[5]])corners.push(point([x,y,z]));return [...[0,1,2].map(a=>Math.min(...corners.map(p=>p[a]))),...[0,1,2].map(a=>Math.max(...corners.map(p=>p[a])))] as Box;});
 return model;
}
function install(model:Detail,s:BlockState):Detail {
 const attachment=s.properties.face??'wall',facing=s.properties.facing??'north';
 // Mojang's models start on the floor. Blockstate X=90 mounts on the south wall;
 // X=180 mounts on the ceiling, with a further half turn around Y.
 const mount=(p:Vec3):Vec3=>attachment==='wall'?[p[0],p[2],1-p[1]]:attachment==='ceiling'?[p[0],1-p[1],1-p[2]]:p;
 const spin=attachment==='ceiling'?({north:'south',east:'west',south:'north',west:'east'} as Record<string,string>)[facing]:facing;
 const point=(p:Vec3)=>orientPiston(mount(p),spin),center=point([.5,.5,.5]);
 return transform(model,point,n=>point(n.map(v=>v+.5) as Vec3).map((v,i)=>v-center[i]) as Vec3);
}
export function controlModel(s:BlockState):Detail|undefined {
 if(!s.name.startsWith('minecraft:'))return;
 const n=s.name.slice(10);
 if(n.endsWith('_button')){
  const texture=textureName(s,'up'),depth=s.properties.powered==='true'?1:2;
  const part:ModelPart={box:unit([5,0,6,11,depth,10]),faces:{down:face(texture,[5,6,11,10]),up:face(texture,[5,6,11,10]),north:face(texture,[5,16-depth,11,16]),south:face(texture,[5,16-depth,11,16]),west:face(texture,[6,16-depth,10,16]),east:face(texture,[6,16-depth,10,16])}};
  return install(elementModel([part]),s);
 }
 if(n!=='lever')return;
 const base:ModelPart={box:unit([5,-.02,4,11,2.98,12]),faces:{down:face('cobblestone',[5,4,11,12]),up:face('cobblestone',[5,4,11,12]),north:face('cobblestone',[5,0,11,3]),south:face('cobblestone',[5,0,11,3]),west:face('cobblestone',[4,0,12,3]),east:face('cobblestone',[4,0,12,3])}};
 const stem:ModelPart={box:unit([7,1,7,9,11,9]),faces:{up:face('lever',[7,6,9,8]),north:face('lever',[7,6,9,16]),south:face('lever',[7,6,9,16]),west:face('lever',[7,6,9,16]),east:face('lever',[7,6,9,16])}};
 const angle=(s.properties.powered==='true'? -1:1)*(s.properties.face==='ceiling'?-1:1)*Math.PI/4,c=Math.cos(angle),t=Math.sin(angle);
 const rotate=(p:Vec3):Vec3=>[p[0],p[1]*c-p[2]*t,p[1]*t+p[2]*c];
 const tilted=transform(elementModel([stem]),p=>{const v=rotate([p[0]-.5,p[1]-1/16,p[2]-.5]);return [v[0]+.5,v[1]+1/16,v[2]+.5];},rotate);
 const model=elementModel([base]);model.boxes.push(...tilted.boxes);model.quads.push(...tilted.quads);
 return install(model,s);
}
