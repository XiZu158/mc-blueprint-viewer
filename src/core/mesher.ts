import { blockAt, type FrameEntity, type PickRange, type ChunkGeometry, type Filter, type Region, type Schematic, type Vec3 } from './types';
import { modelFor, type Model, type Box } from './models';
import {faces,surfaceFor,faceUv,type Surface} from './textures';
import type {BlockState} from './types';
import {orientPiston,type ModelQuad} from './piston-model';
import {fluidKind,fluidQuads} from './fluid-model';
export const CHUNK_SIZE=32;
export function createSampler(region:Region,filter:Filter,missing=new Set<number>()) {
  const hidden=new Set(filter.hidden),isolate=new Set(filter.isolate);
  return (x:number,y:number,z:number):number => {
    const wy=y+region.min[1];if(wy<filter.yMin||wy>filter.yMax)return 0;
    if(filter.cutAxis==='x'&&x+region.min[0]>filter.cutValue||filter.cutAxis==='z'&&z+region.min[2]>filter.cutValue)return 0;
    const id=blockAt(region,x,y,z);return hidden.has(id)||!filter.renderMissing&&missing.has(id)||isolate.size&&!isolate.has(id)?0:id;
  };
}
export function* chunkOrigins(region:Region):Generator<Vec3> {
  const [sx,sy,sz]=region.dimensions;
  for(let y=0;y<sy;y+=CHUNK_SIZE)for(let z=0;z<sz;z+=CHUNK_SIZE)for(let x=0;x<sx;x+=CHUNK_SIZE)yield [x,y,z];
}
export interface MeshResources { models:Model[]; states:BlockState[]; surfaces:Surface[][]; detailed:{quad:ModelQuad;surface:Surface}[][]; layers:number[]; missing:Set<number> }
export interface MesherContext extends MeshResources { sample:(x:number,y:number,z:number)=>number; neighbors:(x:number,y:number,z:number)=>number; highlight:Set<number>; frames?:FrameEntity[]; renderMissing:boolean }
export function meshResources(s:Schematic,models:Model[]=s.states.map(modelFor)):MeshResources {
  const surfaces=s.states.map(state=>faces.map(face=>surfaceFor(state,face)));
  const detailed=models.map((m,id)=>(m.quads??[]).map(quad=>({quad,surface:surfaceFor(s.states[id],faces[quad.axis*2+(quad.sign>0?1:0)],quad.texture)})));
  const missing=new Set<number>();for(let id=1;id<models.length;id++)if((detailed[id].length?detailed[id].map(q=>q.surface):surfaces[id]).some(f=>f.missing))missing.add(id);
  return {models,states:s.states,surfaces,detailed,layers:surfaces.map(a=>Math.max(...a.map(f=>f.layer))),missing};
}
export function mesherContext(s:Schematic,r:Region,f:Filter,models:Model[]=s.states.map(modelFor),resources=meshResources(s,models)):MesherContext {
  const sample=createSampler(r,f,resources.missing);
  // Only neighboring visible Regions are queried. No per-block global occupancy map.
  const candidates=s.regions.filter(other=>other!==r&&f.regions.includes(other.name)&&other.min.every((min,a)=>min<=r.min[a]+r.dimensions[a]&&min+other.dimensions[a]>=r.min[a]-1)).map(other=>({region:other,sample:createSampler(other,f,resources.missing)}));
  const neighbors=(x:number,y:number,z:number)=>{
    const id=sample(x,y,z);if(id)return id;
    for(const c of candidates){const other=c.sample(x+r.min[0]-c.region.min[0],y+r.min[1]-c.region.min[1],z+r.min[2]-c.region.min[2]);if(other)return other;}return 0;
  };
  return {...resources,sample,neighbors,highlight:new Set(f.highlight),renderMissing:!!f.renderMissing};
}
export function meshChunk(region:Region,origin:Vec3,ctx:MesherContext):ChunkGeometry {
  const {models,states,surfaces,detailed,layers,sample,neighbors,highlight}=ctx;
  const fluidCorners=new Map<string,number>(),solid=(id:number)=>!!id&&models[id].full&&layers[id]===0;
  const dims=region.dimensions.map((d,a)=>Math.max(0,Math.min(CHUNK_SIZE,d-origin[a])));
  const buckets=Array.from({length:3},()=>({pos:[] as number[],normal:[] as number[],color:[] as number[],uv:[] as number[],texture:[] as number[],opacity:[] as number[],picks:[] as PickRange[]}));
  function quad(points:number[][],axis:number,sign:number,id:number,offset:Vec3=[0,0,0],box?:Box,detail?:{surface:Surface;uv:[number,number][];normal?:Vec3}) {
    const surface=detail?.surface??surfaces[id][axis*2+(sign>0?1:0)],bucket=buckets[surface.layer];
    const c=highlight.size?(highlight.has(id)?[1,.57,.08]:surface.tint.map(v=>v*.18)):surface.tint;
    const order=detail||sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
    const isPane=states[id].name.endsWith('_pane');
    const uv=detail?.uv??points.map(p=>{
      const local=p.map((v,a)=>v-offset[a]);
      if(isPane&&axis===1&&box&&box[3]-box[0]>box[5]-box[2])return [local[2],local[0]];
      return faceUv(states[id],axis,sign,local);
    });
    for(const i of order){bucket.pos.push(...points[i]);bucket.normal.push(...(detail?.normal??[axis===0?sign:0,axis===1?sign:0,axis===2?sign:0]));bucket.color.push(...c);bucket.uv.push(...uv[i]);bucket.texture.push(surface.id);bucket.opacity.push(surface.opacity);}
  }
  // Greedy surface rectangles, one color/state per rectangle. Chunk-edge queries use the full region.
  for(let d=0;d<3;d++) {
    const u=(d+1)%3,v=(d+2)%3,w=dims[u],h=dims[v],mask=new Uint32Array(w*h);
    for(const sign of [-1,1])for(let slice=0;slice<dims[d];slice++) {
      for(let j=0;j<h;j++)for(let i=0;i<w;i++) {
        const c=[0,0,0];c[d]=slice+origin[d];c[u]=i+origin[u];c[v]=j+origin[v];
        const id=sample(c[0],c[1],c[2]);let face=0;
        if(id&&models[id].full) {
          c[d]+=sign;const other=sample(c[0],c[1],c[2]);
          if(!other||!models[other].full||layers[other]!==0&&other!==id)face=id;
        }
        mask[i+j*w]=face;
      }
      for(let j=0;j<h;j++)for(let i=0;i<w;) {
        const id=mask[i+j*w];if(!id){i++;continue;}
        let rw=1,rh=1;while(i+rw<w&&mask[i+rw+j*w]===id)rw++;
        outer:while(j+rh<h){for(let k=0;k<rw;k++)if(mask[i+k+(j+rh)*w]!==id)break outer;rh++;}
        const p=[0,0,0];p[d]=slice+(sign>0?1:0);p[u]=i;p[v]=j;
        const a=[...p],b=[...p],c=[...p];a[u]+=rw;b[u]+=rw;b[v]+=rh;c[v]+=rh;
        quad([p,a,b,c],d,sign,id);
        for(let y=0;y<rh;y++)mask.fill(0,i+(j+y)*w,i+rw+(j+y)*w);i+=rw;
      }
    }
  }
  // Non-cubic states are merged into the same chunk geometry, never one Mesh per block.
  function box(b:Box,offset:Vec3,id:number) {
    for(let d=0;d<3;d++)for(const sign of [-1,1]){
      const u=(d+1)%3,v=(d+2)%3;
      const p=[0,0,0];p[d]=b[d+(sign>0?3:0)]+offset[d];p[u]=b[u]+offset[u];p[v]=b[v]+offset[v];
      const a=[...p],c=[...p],e=[...p];a[u]=b[u+3]+offset[u];c[u]=a[u];c[v]=b[v+3]+offset[v];e[v]=c[v];quad([p,a,c,e],d,sign,id,offset,b);
    }
  }
  for(let y=0;y<dims[1];y++)for(let z=0;z<dims[2];z++)for(let x=0;x<dims[0];x++) {
    const id=sample(x+origin[0],y+origin[1],z+origin[2]);if(id&&!models[id].full){
      if(fluidKind(states[id])){
        const starts=buckets.map(b=>b.pos.length/3);
        for(const q of fluidQuads(states,neighbors,solid,x+origin[0],y+origin[1],z+origin[2],fluidCorners))quad(q.points.map(p=>[p[0]+x,p[1]+y,p[2]+z]),q.axis,q.sign,id,[x,y,z],undefined,{surface:surfaces[id][q.axis*2+(q.sign>0?1:0)],uv:q.uv,normal:q.normal});
        buckets.forEach((b,i)=>{const count=b.pos.length/3-starts[i];if(count)b.picks.push({start:starts[i],count,position:[x+origin[0]+region.min[0],y+origin[1]+region.min[1],z+origin[2]+region.min[2]]});});
      }else if(detailed[id].length){
        const starts=buckets.map(b=>b.pos.length/3);
        for(const {quad:q,surface} of detailed[id])quad(q.points.map(p=>[p[0]+x,p[1]+y,p[2]+z]),q.axis,q.sign,id,[x,y,z],undefined,{surface,uv:q.uv,normal:q.normal});
        buckets.forEach((b,i)=>{const count=b.pos.length/3-starts[i];if(count)b.picks.push({start:starts[i],count,position:[x+origin[0]+region.min[0],y+origin[1]+region.min[1],z+origin[2]+region.min[2]]});});
      }else for(const b of models[id].boxes)box(b,[x,y,z],id);
    }
  }
  for(const frame of ctx.frames??[]){
    if(!ctx.renderMissing&&ctx.missing.has(frame.state))continue;
    const id=frame.state,center=orientPiston([.5,.5,.96875],states[id].properties.facing),offset=frame.position.map((v,a)=>v-region.min[a]-origin[a]-center[a]) as Vec3,starts=buckets.map(b=>b.pos.length/3);
    for(const {quad:q,surface} of detailed[id])quad(q.points.map(p=>p.map((v,a)=>v+offset[a])),q.axis,q.sign,id,offset,undefined,{surface,uv:q.uv,normal:q.normal});
    buckets.forEach((b,i)=>{const count=b.pos.length/3-starts[i];if(count)b.picks.push({start:starts[i],count,position:frame.anchor});});
  }
  const count=buckets.reduce((n,b)=>n+b.pos.length/3,0),positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=new Float32Array(count*3),uvs=new Float32Array(count*2),textureIds=new Float32Array(count),opacities=new Float32Array(count),groups=[];
  let start=0;const picks:PickRange[]=[];
  for(let materialIndex=0;materialIndex<3;materialIndex++){
    const b=buckets[materialIndex],n=b.pos.length/3;
    positions.set(b.pos,start*3);normals.set(b.normal,start*3);colors.set(b.color,start*3);uvs.set(b.uv,start*2);textureIds.set(b.texture,start);opacities.set(b.opacity,start);
    picks.push(...b.picks.map(p=>({...p,start:p.start+start})));if(n)groups.push({start,count:n,materialIndex});start+=n;
  }
  return {key:`${region.name}:${origin.join(',')}`,region:region.name,origin:origin.map((v,a)=>v+region.min[a]) as Vec3,positions,normals,colors,uvs,textureIds,opacities,groups,picks};
}
