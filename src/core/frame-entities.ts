import type {Compound,Nbt} from './nbt';
import type {BlockState,FrameEntity,Vec3} from './types';
import {stateKey} from './types';
const record=(v:Nbt|undefined):Compound|undefined=>v&&typeof v==='object'&&!Array.isArray(v)&&!(v instanceof Int8Array)&&!(v instanceof Int32Array)&&!('kind' in v)?v as Compound:undefined;
export function readFrames(data:Compound,position:Vec3,version:number,register:(state:BlockState)=>number,warnings:string[]):FrameEntity[]{
 const frames:FrameEntity[]=[];
 if(!Array.isArray(data.Entities))return frames;
 let skipped=0;
 for(const raw of data.Entities){
  const wrapper=record(raw);if(!wrapper)continue;
  const entity=version===1?record(wrapper.EntityData):wrapper;if(!entity)continue;
  const id=String(entity.id??'');if(!['minecraft:item_frame','minecraft:glow_item_frame','ItemFrame'].includes(id))continue;
  const pos=version===1?[wrapper.x,wrapper.y,wrapper.z]:entity.Pos;
  if(!Array.isArray(pos)||pos.length!==3||!pos.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<Number.MAX_SAFE_INTEGER)){skipped++;continue;}
  // Litematica stores entity Pos relative to Region Position, even for negative sizes.
  // TileX/Y/Z can retain original-world hanging coordinates; they must not override Pos.
  const world=pos.map((v,a)=>(v as number)+position[a]) as Vec3;
  const facing=typeof entity.Facing==='number'?['down','up','north','south','west','east'][entity.Facing]:typeof entity.Direction==='number'?['south','west','north','east'][entity.Direction]:undefined;
  if(!facing){skipped++;continue;}
  const rotation=((Number(entity.ItemRotation)||0)%8+8)%8,properties={entity:'true',facing,rotation:String(rotation)},name=id==='ItemFrame'?'minecraft:item_frame':id;
  const state=register({name,properties,key:stateKey(name,properties)}),item=String(record(entity.Item)?.id??'');
  frames.push({position:world,anchor:world.map(Math.floor) as Vec3,state,item,rotation});
 }
 if(skipped)warnings.push(`跳过 ${skipped} 个位置或朝向无效的展示框；方块数据和统计不受影响。`);
 return frames;
}
