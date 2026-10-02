import {test} from 'node:test';import assert from 'node:assert/strict';import {Worker} from 'node:worker_threads';
import {fixture,edgeFixture,type FixtureRegion} from './fixture';import type {Filter} from '../src/core/types';
function worker(){return new Worker(new URL('./worker-adapter.js',import.meta.url));}
function wait(w:Worker,type:string,id?:number):Promise<any>{return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{cleanup();reject(Error(`Timed out waiting for ${type}`));},30000);
  const message=(data:any)=>{if(data.type==='error'){cleanup();reject(Error(data.message));}else if(data.type===type&&(id===undefined||data.id===id)){cleanup();resolve(data);}};
  const error=(e:Error)=>{cleanup();reject(e);};function cleanup(){clearTimeout(timeout);w.off('message',message);w.off('error',error);}
  w.on('message',message);w.on('error',error);
});}
async function load(w:Worker,bytes:Buffer){const b=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,ready=wait(w,'loaded');w.postMessage({type:'load',buffer:b},[b]);assert.equal(b.byteLength,0);return ready;}
test('Worker transfers binary input, keeps decoded arrays private, meshes filters and inspects negative coordinates',async()=>{
  const w=worker();try{await wait(w,'ready');const loaded=await load(w,fixture(edgeFixture()));assert.equal(loaded.summary.regions.length,2);assert.equal('blocks' in loaded.summary.regions[0],false);
    const filter:Filter={regions:loaded.summary.regions.map((r:any)=>r.name),hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity};
    const done=wait(w,'meshDone',1);w.postMessage({type:'mesh',id:1,filter});assert.ok((await done).triangles>0);
    const inspected=wait(w,'inspected');w.postMessage({type:'inspect',position:[4,6,-6]});const hit=await inspected;assert.equal(hit.results[0].state.name,'fixture:block_13');assert.deepEqual(hit.results[0].local,[0,0,0]);
    const empty=wait(w,'meshDone',2);w.postMessage({type:'mesh',id:2,filter:{...filter,regions:[]}});assert.equal((await empty).triangles,0);
  }finally{await w.terminate();}
});
test('geometry budget leaves full material counts intact, allows slice recovery and cancels stale builds',async()=>{
  const w=worker(),size=96,cells=size**3,r:FixtureRegion={name:'Complex',position:[0,0,0],size:[size,size,size],palette:[{name:'minecraft:air'},{name:'minecraft:stone'}],values:Array.from({length:cells},(_,i)=>(i%size+Math.floor(i/size)%size+Math.floor(i/(size*size)))%2)};
  try{await wait(w,'ready');const loaded=await load(w,fixture([r]));assert.equal(loaded.summary.totalBlocks,cells/2);assert.equal(loaded.summary.materials[0].count,cells/2);
    const filter:Filter={regions:['Complex'],hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity};
    const limit=wait(w,'geometryLimit',1);w.postMessage({type:'mesh',id:1,filter});assert.match((await limit).message,/200 万/);
    const done=wait(w,'meshDone',2);w.postMessage({type:'mesh',id:2,filter:{...filter,yMin:0,yMax:0}});assert.ok((await done).triangles<100000);
    const hit=wait(w,'inspected');w.postMessage({type:'inspect',position:[1,0,0]});assert.equal((await hit).results[0].state.name,'minecraft:stone');
    const first=wait(w,'chunk',3);w.postMessage({type:'mesh',id:3,filter});await first;w.postMessage({type:'cancel'});
    const recovery=wait(w,'meshDone',4);w.postMessage({type:'mesh',id:4,filter:{...filter,regions:[]}});assert.equal((await recovery).triangles,0);
  }finally{await w.terminate();}
});
