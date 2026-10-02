import {performance} from 'node:perf_hooks';import {writeFileSync} from 'node:fs';
import {encodeNbt,schematicTag,t,type FixtureRegion} from './fixture';import {gzipSync} from 'node:zlib';
import {parseLitematic} from '../src/core/litematic';import {chunkOrigins,meshChunk,mesherContext} from '../src/core/mesher';
import type {Filter} from '../src/core/types';import assert from 'node:assert/strict';
const results=[];
for(const size of [128,256]) {
  const volume=size**3,r:FixtureRegion={name:'Large',position:[-size/2,-16,-size/2],size:[size,size,size],palette:[{name:'minecraft:air'},{name:'minecraft:stone'}],values:[]};
  const root=schematicTag([r]);(root.value.Regions.value.Large.value as any).BlockStates=t.longs(Array<bigint>(Math.ceil(volume*2/64)).fill(0x5555555555555555n));root.value.Metadata.value.TotalBlocks=t.int(volume);root.value.Metadata.value.TotalVolume=t.int(volume);
  const bytes=gzipSync(encodeNbt(root));if(size===128)writeFileSync('public/fixtures/large-128.litematic',bytes);
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,start=performance.now(),s=await parseLitematic(buffer),parsed=performance.now();assert.equal(s.totalBlocks,volume);
  const filter:Filter={regions:['Large'],hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity},ctx=mesherContext(s,s.regions[0],filter);let triangles=0,chunks=0;
  for(const origin of chunkOrigins(s.regions[0])){const g=meshChunk(s.regions[0],origin,ctx);if(g.positions.length){chunks++;triangles+=g.positions.length/9;}}
  assert.equal(triangles,12*(size/32)**2);const end=performance.now();const row={dimensions:[size,size,size],volume,blocks:s.totalBlocks,gzipBytes:bytes.length,parseMs:+(parsed-start).toFixed(1),meshMs:+(end-parsed).toFixed(1),chunks,triangles,geometryBytes:triangles*3*13*4};results.push(row);console.log(JSON.stringify(row));
}
writeFileSync('benchmark-results.json',JSON.stringify({runtime:process.version,platform:process.platform,date:new Date().toISOString(),scenario:'Fully solid stone volume. Greedy best case; complex builds produce more geometry.',results},null,2));
