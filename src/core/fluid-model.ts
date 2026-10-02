import type {BlockState,Vec3} from './types';
import type {ModelQuad} from './piston-model';

export function fluidKind(s:BlockState|undefined):'water'|'lava'|undefined {
 return s?.name==='minecraft:water'||s?.name==='minecraft:bubble_column'?'water':s?.name==='minecraft:lava'?'lava':undefined;
}
type Sample=(x:number,y:number,z:number)=>number;
export function fluidQuads(states:BlockState[],sample:Sample,solid:(id:number)=>boolean,x:number,y:number,z:number,cornerCache=new Map<string,number>()):ModelQuad[] {
 const kind=fluidKind(states[sample(x,y,z)])!;
 const same=(a:number,b:number,c:number)=>fluidKind(states[sample(a,b,c)])===kind;
 // Shared corner positions use the same four cells, even across chunks/regions.
 // Full/source fluid contributes extra weight; solid neighbors do not depress it.
 function corner(cx:number,cz:number):number {
  const key=`${kind}:${cx},${y},${cz}`,cached=cornerCache.get(key);if(cached!==undefined)return cached;
  let sum=0,weight=0;
  for(const dx of [-1,0])for(const dz of [-1,0]){
   const a=cx+dx,c=cz+dz,id=sample(a,y,c);
   if(same(a,y,c)){
    if(same(a,y+1,c)){cornerCache.set(key,1);return 1;}
    const level=Math.max(0,Math.min(15,Number(states[id].properties.level)||0)),height=(8-(level>=8?0:level))/9,w=height>=.8?11:1;
    sum+=height*w;weight+=w;
   }else if(!solid(id))weight++;
  }
  const height=weight?sum/weight:0;cornerCache.set(key,height);return height;
 }
 const nw=corner(x,z),sw=corner(x,z+1),se=corner(x+1,z+1),ne=corner(x+1,z),quads:ModelQuad[]=[];
 const add=(points:Vec3[],axis:number,sign:number,texture:string,uv:[number,number][])=>{
  const a=points[1].map((v,i)=>v-points[0][i]),b=points[2].map((v,i)=>v-points[0][i]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...n)||1;
  quads.push({points,axis,sign,texture,uv,normal:n.map(v=>v/length) as Vec3});
 };
 if(!same(x,y+1,z))add([[0,nw,0],[0,sw,1],[1,se,1],[1,ne,0]],1,1,kind+'_still',[[0,1],[0,0],[1,0],[1,1]]);
 if(!same(x,y-1,z)&&!solid(sample(x,y-1,z)))add([[0,0,0],[1,0,0],[1,0,1],[0,0,1]],1,-1,kind+'_still',[[0,0],[1,0],[1,1],[0,1]]);
 const sides:[number,number,number,number,Vec3[],number[]][]=[
  [-1,0,0,-1,[[0,0,0],[0,0,1],[0,sw,1],[0,nw,0]],[sw,nw]],
  [1,0,0,1,[[1,0,1],[1,0,0],[1,ne,0],[1,se,1]],[ne,se]],
  [0,-1,2,-1,[[1,0,0],[0,0,0],[0,nw,0],[1,ne,0]],[nw,ne]],
  [0,1,2,1,[[0,0,1],[1,0,1],[1,se,1],[0,sw,1]],[se,sw]]
 ];
 for(const [dx,dz,axis,sign,points,h] of sides)if(!same(x+dx,y,z+dz)&&!solid(sample(x+dx,y,z+dz)))add(points,axis,sign,kind+'_flow',[[0,0],[.5,0],[.5,h[0]/2],[0,h[1]/2]]);
 return quads;
}
