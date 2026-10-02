import {test} from 'node:test';import assert from 'node:assert/strict';
import {readNbt} from '../src/core/nbt';
import {parseLitematic,parseRoot,packedValue,bitsForPalette,regionMin} from '../src/core/litematic';
import {blockAt,stateKey,type Filter} from '../src/core/types';
import {meshChunk,mesherContext,chunkOrigins} from '../src/core/mesher';
import {modelFor} from '../src/core/models';
import {fixture,pack,edgeFixture,encodeNbt,t,schematicTag,type FixtureRegion} from './fixture';
import {readFileSync} from 'node:fs';
const buffer=(b:Buffer)=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer;
const all:Filter={regions:['r'],hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity};
const simple=(sx:number,sy:number,sz:number):FixtureRegion=>({name:'r',position:[0,0,0],size:[sx,sy,sz],palette:[{name:'minecraft:air'},{name:'minecraft:stone'}],values:Array(sx*sy*sz).fill(1)});
test('NBT tags 1–12, signed longs, Java modified UTF-8, Unicode and null prototypes',()=>{
  const tags=t.compound({byte:{type:1,value:-7},short:{type:2,value:-1234},int:t.int(-9999),long:t.long(-9223372036854775808n),float:{type:5,value:1.5},double:{type:6,value:Math.PI},bytes:{type:7,value:[255,0,1]},str:t.str('中\0😀'),list:t.list(8,['a','b']),nested:t.compound({'__proto__':t.str('safe')}),ints:{type:11,value:[-1,2147483647]},longs:t.longs([-1n,1n])});
  const n=readNbt(encodeNbt(tags));assert.equal(n.byte,-7);assert.equal(n.short,-1234);assert.equal(n.int,-9999);assert.equal(n.long,-9223372036854775808n);assert.equal(n.float,1.5);assert.equal(n.double,Math.PI);assert.equal(n.str,'中\0😀');assert.deepEqual(n.list,['a','b']);assert.equal(Object.getPrototypeOf(n),null);assert.deepEqual([...((n.longs as any).words)],[4294967295,4294967295,1,0]);assert.deepEqual([...(n.ints as Int32Array)],[-1,2147483647]);
});
test('all supported packed widths, signed longs and repeated 32/64-bit crossings against independent BigInt writer',()=>{
  for(const bits of [2,3,4,5,6,7,8,9,10,11,12,15,16,17,20,31,32]){
    const size=2**bits,values=Array.from({length:1003},(_,i)=>(Math.imul(i,2654435761)>>>0)%size),longs=pack(values,size),words=new Uint32Array(longs.length*2);
    longs.forEach((l,i)=>{words[2*i]=Number(l&0xffffffffn);words[2*i+1]=Number(l>>32n);});
    values.forEach((v,i)=>assert.equal(packedValue(words,i,bits),v,`bits=${bits} index=${i}`));
  }
  assert.equal(bitsForPalette(1),2);assert.equal(bitsForPalette(4),2);assert.equal(bitsForPalette(5),3);assert.equal(bitsForPalette(17),5);
});
test('gzip and raw binary NBT produce identical material totals, all palette states, x/z/y coordinates',async()=>{
  const specs=edgeFixture(),s=await parseLitematic(buffer(fixture(specs))),raw=await parseLitematic(buffer(fixture(specs,false)));
  assert.deepEqual(s.materials,raw.materials);assert.deepEqual(s.regions.map(r=>r.min),[[4,6,-6],[-20,0,12]]);
  assert.deepEqual(s.bounds,{min:[-20,0,-6],max:[11,9,15]});
  const counts=new Map<string,number>();let nonAir=0;
  specs.forEach((spec,r)=>spec.values.forEach((v,i)=>{
    const name=spec.palette[v].name,air=['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(name),sx=Math.abs(spec.size[0]),sz=Math.abs(spec.size[2]);
    const x=i%sx,z=Math.floor(i/sx)%sz,y=Math.floor(i/(sx*sz)),id=blockAt(s.regions[r],x,y,z);
    assert.equal(s.states[id].name,air?'minecraft:air':name);if(!air){nonAir++;counts.set(name,(counts.get(name)??0)+1);}
  }));
  assert.equal(s.totalBlocks,nonAir);assert.deepEqual(new Map(s.materials.map(m=>[m.name,m.count])),counts);
  assert.equal(s.states.filter(s=>s.name==='minecraft:oak_stairs').length,1,'property order must not duplicate global states');
  assert.equal(blockAt(s.regions[0],-1,0,0),0);
});
test('negative sizes on every axis and -1 boundary do not mirror the packed array',()=>{
  for(const size of [[-3,2,4],[3,-2,4],[3,2,-4],[-1,-1,-1]] as [number,number,number][]){const p:[number,number,number]=[5,7,9];assert.deepEqual(regionMin(p,size),p.map((v,i)=>v+(size[i]<0?size[i]+1:0)));}
});
test('palette of one, air at nonzero index, void air, unknown mod blocks and properties survive',async()=>{
  const r=simple(8,1,1);r.palette=[{name:'mod:custom_block',props:{axis:'z',odd:'property',kind:'custom'}}];r.values.fill(0);const s=await parseLitematic(buffer(fixture([r])));assert.equal(s.totalBlocks,8);assert.equal(s.materials[0].name,'mod:custom_block');assert.equal(s.states[1].properties.odd,'property');assert.equal(s.states[1].properties.kind,'custom');assert.equal(modelFor(s.states[1]).fallback,true);
  r.palette=[{name:'minecraft:stone'},{name:'minecraft:void_air'}];r.values=[0,1,0,1,0,1,0,1];assert.equal((await parseLitematic(buffer(fixture([r])))).totalBlocks,4);
});
test('invalid palette indices, truncated NBT, corrupt gzip, packed length, huge dimensions and zero sizes reject clearly',async()=>{
  const r=simple(3,1,1);r.palette.push({name:'minecraft:dirt'});r.values[0]=3;await assert.rejects(parseLitematic(buffer(fixture([r]))),/索引越界/);
  const valid=fixture([simple(8,1,1)],false);assert.throws(()=>readNbt(valid.subarray(0,valid.length-1)),/截断/);
  await assert.rejects(parseLitematic(buffer(Buffer.from([31,139,1,2,3]))));
  const root=readNbt(fixture([simple(8,1,1)],false));(root.Regions as any).r.BlockStates.words=new Uint32Array(0);assert.throws(()=>parseRoot(root),/长度错误/);
  for(const sz of [0,100000000]){const bad=simple(1,1,1);bad.size=[sz,1,1];await assert.rejects(parseLitematic(buffer(fixture([bad]))),sz===0?/零尺寸/:/上限/);}
});
test('overlapping regions have explicit per-region accounting; metadata is never trusted for totals',()=>{
  const a=simple(2,1,1),b={...a,name:'other'};const root=readNbt(encodeNbt(schematicTag([a,b])));(root.Metadata as any).TotalBlocks=999;const s=parseRoot(root);assert.equal(s.totalBlocks,4);assert.equal(s.warnings.length,2);
});
test('greedy solid 32³ cube becomes six quads; hidden material and Y slicing create correct surfaces',async()=>{
  const s=await parseLitematic(buffer(fixture([simple(32,32,32)]))),r=s.regions[0];
  const g=meshChunk(r,[0,0,0],mesherContext(s,r,all));assert.equal(g.positions.length/9,12);
  const hidden={...all,hidden:[1]};assert.equal(meshChunk(r,[0,0,0],mesherContext(s,r,hidden)).positions.length,0);
  const layer={...all,yMin:4,yMax:4};const l=meshChunk(r,[0,0,0],mesherContext(s,r,layer));const ys=[...l.positions].filter((_,i)=>i%3===1);assert.equal(Math.min(...ys),4);assert.equal(Math.max(...ys),5);assert.equal(l.positions.length/9,12);
});
test('greedy chunk boundaries cull interior faces, normals and winding point outwards',async()=>{
  const s=await parseLitematic(buffer(fixture([simple(64,1,1)]))),r=s.regions[0],ctx=mesherContext(s,r,all);let triangles=0;
  for(const o of chunkOrigins(r)){
    const g=meshChunk(r,o,ctx);triangles+=g.positions.length/9;
    for(let i=0;i<g.positions.length;i+=9){const p=g.positions,n=g.normals,ax=p[i+3]-p[i],ay=p[i+4]-p[i+1],az=p[i+5]-p[i+2],bx=p[i+6]-p[i],by=p[i+7]-p[i+1],bz=p[i+8]-p[i+2];assert.ok((ay*bz-az*by)*n[i]+(az*bx-ax*bz)*n[i+1]+(ax*by-ay*bx)*n[i+2]>0);}
  }
  assert.equal(triangles,20);
});
test('facing, half, stair shapes, slab type, fence connections, panes, doors and axis form finite in-block geometry',()=>{
  for(const facing of ['north','east','south','west'])for(const half of ['top','bottom'])for(const shape of ['straight','inner_left','inner_right','outer_left','outer_right']){
    const m=modelFor({name:'minecraft:oak_stairs',key:'',properties:{facing,half,shape}});assert.equal(m.full,false);for(const b of m.boxes){assert.ok(b.every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.ok(b[0]<b[3]&&b[1]<b[4]&&b[2]<b[5]);}
  }
  assert.equal(modelFor({name:'minecraft:oak_slab',key:'',properties:{type:'double'}}).full,true);
  assert.equal(modelFor({name:'minecraft:oak_fence',key:'',properties:{north:'true',south:'true'}}).boxes.length,5);
  assert.equal(modelFor({name:'minecraft:glass_pane',key:'',properties:{east:'true',west:'true'}}).boxes.length,3);
  const chain=modelFor({name:'minecraft:chain',key:'',properties:{axis:'x'}});assert.equal(chain.full,false);assert.equal(chain.quads!.length,4);assert.ok(chain.boxes.every(b=>b[0]===0&&b[3]===1));
  assert.notDeepEqual(modelFor({name:'minecraft:oak_door',key:'',properties:{open:'true',facing:'east'}}).boxes,modelFor({name:'minecraft:oak_door',key:'',properties:{open:'false',facing:'east'}}).boxes);
  assert.equal(stateKey('a',{y:'2',x:'1'}),'a[x=1,y=2]');
  assert.equal(modelFor({name:'minecraft:oak_log',key:'',properties:{axis:'z'}}).endAxis,2);
});
test('filters isolate materials and expose clipping faces; large world positions retain integer chunk offsets',async()=>{
  const spec=simple(4,2,2);spec.position=[1000000000,-1000000000,1000000000];spec.palette.push({name:'minecraft:dirt'});spec.values[0]=2;
  const s=await parseLitematic(buffer(fixture([spec]))),r=s.regions[0];
  const isolated=meshChunk(r,[0,0,0],mesherContext(s,r,{...all,isolate:[2]}));assert.equal(isolated.positions.length/9,12);assert.deepEqual(isolated.origin,spec.position);
  const cut=meshChunk(r,[0,0,0],mesherContext(s,r,{...all,cutAxis:'x',cutValue:1000000001}));const xs=[...cut.positions].filter((_,i)=>i%3===0);assert.equal(Math.max(...xs),2);
  const hi=meshChunk(r,[0,0,0],mesherContext(s,r,{...all,highlight:[2]}));assert.ok([...hi.colors].every(Number.isFinite));
});
test('independently produced real Litematica files: external house, negative-size multiregion Lite, entities and subversion',async()=>{
  const expected:Record<string,number>={SimpleHouse:78,Lite:122,ArmorStand:9,Subversion:8};
  for(const [name,total] of Object.entries(expected)){
    const file=readFileSync(`public/fixtures/${name}.litematic`),s=await parseLitematic(buffer(file));assert.equal(s.totalBlocks,total);assert.equal(s.materials.reduce((n,r)=>n+r.count,0),total);assert.equal(s.warnings.length,0);
    if(name==='Lite'){assert.equal(s.regions.length,4);assert.ok(s.regions.every(r=>r.size[1]<0));assert.deepEqual(s.bounds,{min:[-12,0,0],max:[17,14,1]});assert.deepEqual(Object.fromEntries(s.materials.map(m=>[m.name,m.count])),{'minecraft:warped_planks':41,'minecraft:bedrock':30,'minecraft:obsidian':29,'minecraft:crimson_planks':22});}
    if(name==='Subversion')assert.deepEqual(s.regions[0].min,[0,0,0]);
  }
});
