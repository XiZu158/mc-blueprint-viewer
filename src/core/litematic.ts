import { compound, decompress, readNbt, type LongArray, type Compound } from './nbt';
import { isAir, stateKey, type Vec3, type Schematic, type Region, type BlockState, type Summary } from './types';
import {readFrames} from './frame-entities';
export const MAX_CELLS = 64_000_000;
export function bitsForPalette(length:number) { return Math.max(2,Math.ceil(Math.log2(length))); }
// A continuous little-bit-endian stream in big-endian NBT longs. No per-long padding.
export function packedValue(words:Uint32Array,index:number,bits:number):number {
  const bit=index*bits,word=Math.floor(bit/32),shift=bit%32;
  let value=words[word]>>>shift;
  if(shift+bits>32) value|=words[word+1]<<(32-shift);
  return bits===32?(value>>>0):((value>>>0) & (2**bits-1));
}
function vector(n:unknown,label:string):Vec3 {
  const c=compound(n as never,label);
  return ['x','y','z'].map(k=>{const v=c[k];if(typeof v!=='number'||!Number.isSafeInteger(v))throw new Error(`${label}.${k} 不是整数`);return v;}) as Vec3;
}
export function regionMin(pos:Vec3,size:Vec3):Vec3 {
  return pos.map((p,a)=>p+Math.min(0,size[a]+1)) as Vec3;
}
export function summarize(s:Schematic):Summary {
  return {...s,regions:s.regions.map(({blocks:_,...r})=>r)};
}
export async function parseLitematic(input:ArrayBuffer,progress:(message:string,ratio:number)=>void=()=>{}):Promise<Schematic> {
  progress('解压 gzip / 读取 NBT',0.03); const bytes=await decompress(input);
  const root=readNbt(bytes); return parseRoot(root,progress);
}
export function parseRoot(root:Compound,progress:(message:string,ratio:number)=>void=()=>{}):Schematic {
  const version=root.Version;
  if(typeof version!=='number'||version<1)throw new Error('缺少有效的 Litematica Version');
  const rawRegions=compound(root.Regions,'Regions'), metadata=root.Metadata?compound(root.Metadata,'Metadata'):Object.create(null);
  const states:BlockState[]=[{name:'minecraft:air',properties:{},key:'minecraft:air'}];const stateIds=new Map<string,number>([['minecraft:air',0]]);
  const regions:Region[]=[],warnings:string[]=[];let volume=0,totalBlocks=0;
  const names=Object.keys(rawRegions);if(!names.length)throw new Error('文件没有 Region');
  const bounds={min:[Infinity,Infinity,Infinity] as Vec3,max:[-Infinity,-Infinity,-Infinity] as Vec3};
  for(let r=0;r<names.length;r++) {
    const name=names[r],data=compound(rawRegions[name],`Region ${name}`),position=vector(data.Position,'Position'),size=vector(data.Size,'Size');
    if(size.some(n=>n===0))throw new Error(`Region ${name} 有零尺寸`);
    const dimensions=size.map(Math.abs) as Vec3,min=regionMin(position,size),cells=dimensions.reduce((a,b)=>a*b,1);
    volume+=cells;
    if(!Number.isSafeInteger(cells)||volume>MAX_CELLS)throw new Error(`总 Region 体积超过 ${MAX_CELLS.toLocaleString()} 格上限，请分拆建筑。`);
    if(min.some((n,a)=>!Number.isSafeInteger(n)||!Number.isSafeInteger(n+dimensions[a])))throw new Error('Region 坐标溢出');
    const palette=data.BlockStatePalette;
    if(!Array.isArray(palette)||!palette.length)throw new Error(`Region ${name} 缺少 BlockStatePalette`);
    const ids=new Uint32Array(palette.length);
    for(let i=0;i<palette.length;i++) {
      const entry=compound(palette[i],'Palette entry'),blockName=entry.Name;
      if(typeof blockName!=='string'||!blockName)throw new Error('Palette 方块 Name 无效');
      const properties:Record<string,string>=Object.create(null);
      if(entry.Properties)for(const [k,v] of Object.entries(compound(entry.Properties,'Properties'))) {
        if(typeof v!=='string')throw new Error('BlockState 属性必须是字符串');properties[k]=v;
      }
      if(isAir(blockName)){ids[i]=0;continue;}
      const key=stateKey(blockName,properties);let id=stateIds.get(key);
      if(id===undefined){id=states.length;states.push({name:blockName,properties,key});stateIds.set(key,id);}ids[i]=id;
    }
    const packed=data.BlockStates as LongArray|undefined,bits=bitsForPalette(palette.length),needed=Math.ceil(cells*bits/64);
    if(!packed||packed.kind!=='long-array'||packed.words.length!==needed*2)throw new Error(`Region ${name} 的 BlockStates 长度错误，期望 ${needed} 个 Long`);
    const blocks=new Uint32Array(cells),counts:Record<number,number>=Object.create(null);let nonAir=0;
    for(let i=0;i<cells;i++) {
      const local=packedValue(packed.words,i,bits);
      if(local>=palette.length)throw new Error(`Region ${name} 第 ${i} 格 Palette 索引越界：${local}`);
      const id=ids[local];blocks[i]=id;
      if(id){nonAir++;counts[id]=(counts[id]??0)+1;}
    }
    const frames=readFrames(data,position,version,state=>{let id=stateIds.get(state.key);if(id===undefined){id=states.length;states.push(state);stateIds.set(state.key,id);}return id;},warnings);
    totalBlocks+=nonAir;regions.push({name,position,size,min,dimensions,blocks,counts,nonAir,frames});
    min.forEach((v,a)=>{bounds.min[a]=Math.min(bounds.min[a],v);bounds.max[a]=Math.max(bounds.max[a],v+dimensions[a]);});
    progress(`解码 Region ${r+1}/${names.length} · ${name}`,0.15+0.8*(r+1)/names.length);
  }
  const byName=new Map<string,{name:string,count:number,states:number[]}>();
  for(const region of regions)for(const [idString,count] of Object.entries(region.counts)) {
    const id=+idString,name=states[id].name;let row=byName.get(name);
    if(!row){row={name,count:0,states:[]};byName.set(name,row);}row.count+=count;if(!row.states.includes(id))row.states.push(id);
  }
  if(typeof metadata.TotalBlocks==='number'&&metadata.TotalBlocks!==totalBlocks)warnings.push(`元数据 TotalBlocks=${metadata.TotalBlocks}，实际解码=${totalBlocks}；使用实际数量。`);
  if(version>7)warnings.push(`Version ${version} 高于已验证版本；已按连续 Packed Long 格式读取。`);
  // Overlapping regions are independent containers, as in Litematica's per-region material accounting.
  for(let a=0;a<regions.length;a++)for(let b=a+1;b<regions.length;b++){
    const x=regions[a],y=regions[b];if(x.min.every((v,i)=>v<y.min[i]+y.dimensions[i]&&y.min[i]<v+x.dimensions[i])){warnings.push('存在重叠 Region；材料按各 Region 分别累加，重叠坐标可能计数多次。');a=regions.length;break;}
  }
  const entityCounts=new Map<string,{name:string;count:number;states:number[]}>();
  for(const r of regions)for(const frame of r.frames??[]){const name=states[frame.state].name;let row=entityCounts.get(name);if(!row){row={name,count:0,states:[]};entityCounts.set(name,row);}row.count++;if(!row.states.includes(frame.state))row.states.push(frame.state);}
  return {name:String(metadata.Name??'Untitled blueprint'),author:String(metadata.Author??''),description:String(metadata.Description??''),version,dataVersion:Number(root.MinecraftDataVersion??0),states,regions,bounds,materials:[...byName.values()].sort((a,b)=>b.count-a.count),entityMaterials:[...entityCounts.values()],totalEntities:regions.reduce((n,r)=>n+(r.frames?.length??0),0),totalBlocks,volume,warnings};
}
