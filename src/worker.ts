/// <reference lib="webworker" />
import { parseLitematic,summarize } from './core/litematic';
import { chunkOrigins,mesherContext,meshChunk,meshResources,CHUNK_SIZE } from './core/mesher';
import { modelFor } from './core/models';
import {textureDiagnostics} from './core/textures';
import { blockAt,type FrameEntity,type Schematic,type Filter,type Vec3 } from './core/types';
const scope=self as unknown as DedicatedWorkerGlobalScope;
let schematic:Schematic|undefined,job=0;
scope.onmessage=async ({data})=>{
  try {
    if(data.type==='load'){
      const token=++job;
      const parsed=await parseLitematic(data.buffer,(message,ratio)=>scope.postMessage({type:'progress',message,ratio}));
      if(token!==job)return;
      schematic=parsed;
      const models=schematic.states.map(modelFor),fallback=schematic.states.filter((_,id)=>models[id].fallback).map(s=>s.name);
      scope.postMessage({type:'loaded',summary:summarize(schematic),fallback:[...new Set(fallback)],missingTextures:textureDiagnostics(schematic.states,models)});
    } else if(data.type==='mesh'&&schematic){
      const token=++job,s=schematic,filter=data.filter as Filter,id=data.id;
      let chunks=0,triangles=0,processed=0;const start=performance.now(),models=s.states.map(modelFor),resources=meshResources(s,models);
      for(const r of s.regions){
        if(!filter.regions.includes(r.name))continue;
        const ctx=mesherContext(s,r,filter,models,resources);
        const frames=new Map<string,FrameEntity[]>(),hidden=new Set(filter.hidden),isolate=new Set(filter.isolate);
        for(const frame of r.frames??[]){const p=frame.anchor;if(hidden.has(frame.state)||isolate.size&&!isolate.has(frame.state)||p[1]<filter.yMin||p[1]>filter.yMax||filter.cutAxis==='x'&&p[0]>filter.cutValue||filter.cutAxis==='z'&&p[2]>filter.cutValue)continue;
          const key=frame.position.map((v,a)=>Math.floor((v-r.min[a])/CHUNK_SIZE)*CHUNK_SIZE).join(',');const list=frames.get(key)??[];list.push(frame);frames.set(key,list);}
        function* origins(){yield* chunkOrigins(r);for(const key of frames.keys()){const o=key.split(',').map(Number) as Vec3;if(o.some((v,a)=>v<0||v>=r.dimensions[a]))yield o;}}
        for(const origin of origins()){
          if(token!==job)return;
          if(origin[1]+r.min[1]>filter.yMax||origin[1]+r.min[1]+CHUNK_SIZE<=filter.yMin)continue;
          ctx.frames=frames.get(origin.join(','));const geometry=meshChunk(r,origin,ctx);
          if(geometry.positions.length){chunks++;triangles+=geometry.positions.length/9;
            if(triangles>2_000_000){scope.postMessage({type:'geometryLimit',id,message:'视图达到 200 万三角形上限。完整数据与材料统计已保留；选择 Y Layer、剖切或隔离材料以减少可见几何。'});return;}
            scope.postMessage({type:'chunk',id,geometry},[geometry.positions.buffer,geometry.normals.buffer,geometry.colors.buffer,geometry.uvs.buffer,geometry.textureIds.buffer,geometry.opacities.buffer]);}
          processed++;
          if(processed%8===0){scope.postMessage({type:'meshProgress',id,chunks});}
          // Bound transfers and give cancellation/inspection a chance even on sparse data.
          await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
      if(token===job)scope.postMessage({type:'meshDone',id,chunks,triangles,milliseconds:performance.now()-start});
    } else if(data.type==='cancel'){job++;
    } else if(data.type==='inspect'&&schematic){
      const pos=data.position as Vec3,results=[];
      for(const r of schematic.regions){const local=pos.map((v,a)=>v-r.min[a]) as Vec3;const id=blockAt(r,...local);if(id)results.push({region:r.name,state:schematic.states[id],id,local});
        for(const frame of r.frames??[])if(frame.anchor.every((v,a)=>v===pos[a])){const state=schematic.states[frame.state];results.push({region:r.name,state:{...state,properties:{...state.properties,...(frame.item?{item:frame.item}:{}),position:frame.position.join(', ')}},id:frame.state,local:frame.position.map((v,a)=>v-r.position[a]),entity:true});}}
      scope.postMessage({type:'inspected',position:pos,results});
    }
  }catch(e){scope.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});}
};
