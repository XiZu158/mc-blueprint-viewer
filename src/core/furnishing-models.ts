import type {BlockState,Vec3} from './types';import type {Box} from './models';
import {elementModel,type ModelPart,type ModelQuad,type FaceSpec} from './piston-model';import {faces,type Face} from './textures';
const unit=(a:number[])=>a.map(v=>v/16) as Box;
const spec=(texture:string,uv:number[]=[0,0,16,16]):FaceSpec=>({texture,uv:uv as FaceSpec['uv']});
const part=(b:number[],texture:string):ModelPart=>({box:unit(b),faces:Object.fromEntries(faces.map(f=>[f,spec(texture)]))});
type Detail={boxes:Box[];quads:ModelQuad[]};
function rotate(m:Detail,angle:number,axis:0|1|2=1,origin:Vec3=[.5,.5,.5],rescale=false):Detail{
 const r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),a=(axis+1)%3,b=(axis+2)%3;
 const spin=(p:Vec3,center:Vec3,scale=1):Vec3=>{const out=p.map((v,i)=>v-center[i]) as Vec3,x=out[a],y=out[b];out[a]=(x*c-y*s)*scale;out[b]=(x*s+y*c)*scale;return out.map((v,i)=>v+center[i]) as Vec3;};
 for(const q of m.quads){const n=q.normal??[q.axis===0?q.sign:0,q.axis===1?q.sign:0,q.axis===2?q.sign:0] as Vec3;q.points=q.points.map(p=>spin(p,origin,rescale?1/c:1));q.normal=spin(n,[0,0,0]);q.axis=q.normal.reduce((a,v,i)=>Math.abs(v)>Math.abs(q.normal![a])?i:a,0);q.sign=Math.sign(q.normal[q.axis]);}
 m.boxes=m.boxes.map(b=>{const points:Vec3[]=[];for(const x of [b[0],b[3]])for(const y of [b[1],b[4]])for(const z of [b[2],b[5]])points.push(spin([x,y,z],origin,rescale?1/c:1));return [...[0,1,2].map(a=>Math.min(...points.map(p=>p[a]))),...[0,1,2].map(a=>Math.max(...points.map(p=>p[a])))] as Box;});return m;
}
function scaffold(s:BlockState):Detail{
 const parts:ModelPart[]=[],faceNames:Record<Face,string>={up:'top',down:'bottom',north:'front',south:'back',east:'right',west:'left'};
 // Solid bamboo posts have thickness; the woven deck uses the supplied cutout texture.
 const beam=(b:number[],uv:number[])=>{const p=part(b,'user_scaffold_front');for(const f of faces)p.faces[f]=spec('user_scaffold_'+faceNames[f],uv);return p;};
 for(const x of [0,14])for(const z of [0,14])parts.push(beam([x,0,z,x+2,16,z+2],[0,0,2,16]));
 const level=(y:number)=>{for(const z of [0,14])parts.push(beam([2,y,z,14,y+2,z+2],[2,0,14,2]));for(const x of [0,14])parts.push(beam([x,y,2,x+2,y+2,14],[2,0,14,2]));parts.push({box:unit([0,y+1.99,0,16,y+2,16]),faces:{up:spec('user_scaffold_top'),down:spec('user_scaffold_bottom',[0,16,16,0])}});};
 level(14);if(s.properties.bottom==='true')level(0);return elementModel(parts);
}
function sign(s:BlockState):Detail{
 const n=s.name.slice(10),p=s.properties,hanging=n.endsWith('_hanging_sign'),wall=n.includes('_wall_'),parts:ModelPart[]=[];
 if(hanging){parts.push(part([1,3,7,15,13,9],'user_spruce_sign_board'));
  for(const x of [3,12])parts.push(part([x,13,7.5,x+1,16,8.5],'user_spruce_sign_post'));
  if(wall)parts.push(part([0,14,6,16,16,10],'user_spruce_sign_post'));
 }else if(wall)parts.push(part([0,4.5,14,16,12.5,16],'user_spruce_sign_board'));
 else{parts.push(part([0,8,7,16,16,9],'user_spruce_sign_board'),part([7.3333,0,7.3333,8.6667,8,8.6667],'user_spruce_sign_post'));}
 const m=elementModel(parts,wall?p.facing:'north');return wall?m:rotate(m,-(Number(p.rotation)||0)*22.5);
}
function fire(s:BlockState):Detail{
 const soul=s.name==='minecraft:soul_fire',prefix=soul?'soul_fire_':'fire_',m:Detail={boxes:[],quads:[]},p=s.properties;
 const add=(d:Detail)=>{m.boxes.push(...d.boxes);m.quads.push(...d.quads);};
 const connected=!soul&&['north','east','south','west','up'].some(f=>p[f]==='true');
 if(!connected){
  for(const [i,b] of [[0,0,8.8,16,22.4,8.8],[0,0,7.2,16,22.4,7.2],[8.8,0,0,8.8,22.4,16],[7.2,0,0,7.2,22.4,16]].entries()){
   const f=(['south','north','west','east'] as Face[])[i];add(rotate(elementModel([{box:unit(b),faces:{[f]:spec(prefix+(i%2))}}]),i%2?22.5:-22.5,i<2?0:2,[.5,.5,.5],true));
  }
 }else{
  for(const f of ['north','east','south','west'])if(p[f]==='true')add(elementModel([{box:unit([0,0,.01,16,22.4,.01]),faces:{south:spec(prefix+'1'),north:spec(prefix+'1')}}],f));
  if(p.up==='true')for(const angle of [-22.5,22.5])add(rotate(elementModel([{box:unit([0,16,0,16,16,16]),faces:{down:spec(prefix+'0')}}]),angle,2,[angle>0?1:0,1,.5],true));
 }
 return m;
}
export function furnishingModel(s:BlockState):Detail|undefined{
 if(!s.name.startsWith('minecraft:'))return;const n=s.name.slice(10);
 if(n==='scaffolding')return scaffold(s);
 if(n.endsWith('_sign'))return sign(s);
 if(n==='fire'||n==='soul_fire')return fire(s);
}
