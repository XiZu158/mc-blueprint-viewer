import {test} from 'node:test';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
import {fixture,type FixtureRegion} from './fixture';import {parseLitematic} from '../src/core/litematic';
import {modelFor} from '../src/core/models';import {textureByName,textureDiagnostics} from '../src/core/textures';
import {fluidQuads} from '../src/core/fluid-model';import {meshChunk,mesherContext} from '../src/core/mesher';
import {stateKey,type BlockState,type Filter,type Schematic,type Vec3} from '../src/core/types';
const state=(n:string,p:Record<string,string>={}):BlockState=>({name:'minecraft:'+n,properties:p,key:stateKey('minecraft:'+n,p)});
const filter:Filter={regions:[],hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity};
const load=async(r:FixtureRegion[])=>{const b=fixture(r,true);return parseLitematic(b.buffer.slice(b.byteOffset,b.byteOffset+b.length) as ArrayBuffer);};
const context=(s:Schematic,i=0,f:Partial<Filter>={})=>mesherContext(s,s.regions[i],{...filter,regions:s.regions.map(r=>r.name),...f});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('buttons mount on all six support directions; pressed thickness and exact face UVs survive rotations',()=>{
 for(const n of ['stone_button','oak_button','polished_blackstone_button'])for(const face of ['floor','wall','ceiling'])for(const facing of ['north','east','south','west'])for(const powered of ['false','true']){
  const s=state(n,{face,facing,powered}),m=modelFor(s),b=m.boxes[0],depth=(powered==='true'?1:2)/16;
  const axis=face==='wall'?(facing==='east'||facing==='west'?0:2):1,positive=face==='ceiling'||face==='wall'&&(facing==='north'||facing==='west');
  close(b[axis+3]-b[axis],depth);close(positive?b[axis+3]:b[axis],positive?1:0);
  assert.equal(m.full,false);assert.equal(m.fallback,false);assert.deepEqual(textureDiagnostics([s],[m]),[]);
  for(const q of m.quads!){assert.ok(q.uv.flat().every(Number.isFinite));close(Math.hypot(...q.normal!),1);}
 }
 const up=modelFor(state('stone_button',{face:'floor',facing:'north'})).quads!.find(q=>q.axis===1&&q.sign===1)!;
 assert.deepEqual([Math.min(...up.uv.map(p=>p[0])),Math.max(...up.uv.map(p=>p[0])),Math.min(...up.uv.map(p=>p[1])),Math.max(...up.uv.map(p=>p[1]))],[5/16,11/16,6/16,10/16]);
});
test('lever has a cobblestone base and cropped tilted handle; all 24 states use true perpendicular normals and switch direction',()=>{
 for(const face of ['floor','wall','ceiling'])for(const facing of ['north','east','south','west']){
  const off=modelFor(state('lever',{face,facing,powered:'false'})),on=modelFor(state('lever',{face,facing,powered:'true'}));
  assert.equal(off.boxes.length,2);assert.equal(off.quads!.length,11);assert.equal(off.fallback,false);assert.notDeepEqual(off.quads!.slice(6).map(q=>q.points),on.quads!.slice(6).map(q=>q.points));
  for(const m of [off,on])for(const q of m.quads!){assert.ok(textureByName.has(q.texture));const n=q.normal!,u=q.points[1].map((v,i)=>v-q.points[0][i]),v=q.points[2].map((v,i)=>v-q.points[0][i]);close(Math.hypot(...n),1);close(u.reduce((a,v,i)=>a+v*n[i],0),0);close(v.reduce((a,v,i)=>a+v*n[i],0),0);}
 }
});
test('different water levels share corner heights and remove internal walls; lava remains a separate fluid',async()=>{
 const s=await load([{name:'r',position:[0,0,0],size:[3,1,2],palette:[{name:'minecraft:water',props:{level:'0'}},{name:'minecraft:water',props:{level:'7'}},{name:'minecraft:lava',props:{level:'3'}}],values:[0,1,2,0,1,2]}]),ctx=context(s),solid=()=>false;
 const a=fluidQuads(s.states,ctx.neighbors,solid,0,0,0),b=fluidQuads(s.states,ctx.neighbors,solid,1,0,0),at=a.find(q=>q.axis===1&&q.sign===1)!,bt=b.find(q=>q.axis===1&&q.sign===1)!;
 for(const z of [0,1])close(at.points.find(p=>p[0]===1&&p[2]===z)![1],bt.points.find(p=>p[0]===0&&p[2]===z)![1]);
 assert.ok(!a.some(q=>q.axis===0&&q.sign===1));assert.ok(!b.some(q=>q.axis===0&&q.sign===-1));assert.ok(b.some(q=>q.axis===0&&q.sign===1));assert.ok(at.points.every(p=>p[1]>0&&p[1]<1));
});
test('water/bubble columns and falling levels join vertically; stacked cells are full height without internal top/bottom',async()=>{
 const s=await load([{name:'r',position:[0,0,0],size:[1,2,1],palette:[{name:'minecraft:water',props:{level:'8'}},{name:'minecraft:bubble_column',props:{drag:'true'}}],values:[0,1]}]),ctx=context(s),a=fluidQuads(s.states,ctx.neighbors,()=>false,0,0,0),b=fluidQuads(s.states,ctx.neighbors,()=>false,0,1,0);
 assert.ok(!a.some(q=>q.axis===1&&q.sign===1));assert.ok(!b.some(q=>q.axis===1&&q.sign===-1));assert.equal(Math.max(...a.flatMap(q=>q.points.map(p=>p[1]))),1);assert.ok(a.every(q=>q.texture.startsWith('water_')));
});
test('liquid continuity crosses chunk 32 and negative-size Region boundaries; visible filters expose boundaries',async()=>{
 const s=await load([{name:'left',position:[-32,0,0],size:[33,1,1],palette:[{name:'minecraft:water',props:{level:'0'}}],values:Array(33).fill(0)},{name:'right',position:[2,0,0],size:[-2,1,1],palette:[{name:'minecraft:water',props:{level:'3'}}],values:[0,0]}]);
 const ctx=context(s),g0=meshChunk(s.regions[0],[0,0,0],ctx),g1=meshChunk(s.regions[0],[32,0,0],ctx),right=context(s,1);
 const top=(g:typeof g0,bound:number,offset:number)=>{const points:Vec3[]=[];for(let i=0;i<g.positions.length;i+=3)if(g.normals[i+1]>.5&&Math.abs(g.positions[i]+offset-bound)<1e-6)points.push([g.positions[i]+offset,g.positions[i+1],g.positions[i+2]]);return points;};
 const edge0=top(g0,32,0),edge1=top(g1,32,32);assert.ok(edge0.length&&edge1.length);for(const a of edge0)assert.ok(edge1.some(b=>Math.abs(a[1]-b[1])<1e-6&&a[2]===b[2]));
 const a=fluidQuads(s.states,ctx.neighbors,()=>false,32,0,0),b=fluidQuads(s.states,right.neighbors,()=>false,0,0,0);assert.ok(!a.some(q=>q.axis===0&&q.sign===1));assert.ok(!b.some(q=>q.axis===0&&q.sign===-1));
 const hidden=context(s,0,{regions:['left']});assert.ok(fluidQuads(s.states,hidden.neighbors,()=>false,32,0,0).some(q=>q.axis===0&&q.sign===1));
});
test('missing textures default to no geometry, expose neighbors, retain inventory and inspector data; opt-in renders placeholders',async()=>{
 const s=await load([{name:'r',position:[0,0,0],size:[2,1,1],palette:[{name:'minecraft:stone'},{name:'other:unknown'}],values:[0,1]}]),r=s.regions[0];
 const hidden=meshChunk(r,[0,0,0],context(s)),visible=meshChunk(r,[0,0,0],context(s,0,{renderMissing:true}));
 assert.equal(hidden.positions.length/9,12);assert.equal(visible.positions.length/9,20);assert.ok(!hidden.textureIds.includes(0));assert.ok(visible.textureIds.includes(0));assert.equal(s.totalBlocks,2);assert.equal(s.materials.length,2);assert.equal(r.blocks[1],s.states.findIndex(s=>s.name==='other:unknown'));
});

// Real gzip fixtures used by the offline browser test, with mounted supports.
const controls:FixtureRegion={name:'Controls',position:[-12,0,-7],size:[24,6,16],palette:[{name:'minecraft:air'},{name:'minecraft:stone'}],values:Array(24*6*16).fill(0)};
const set=(r:FixtureRegion,x:number,y:number,z:number,id:number)=>r.values[x+z*Math.abs(r.size[0])+y*Math.abs(r.size[0]*r.size[2])]=id;
let index=0;
for(const name of ['stone_button','oak_button','lever'])for(const face of ['floor','wall','ceiling'])for(const facing of ['north','east','south','west'])for(const powered of ['false','true']){
 const id=controls.palette.push({name:'minecraft:'+name,props:{face,facing,powered}})-1,x=1+index%12*2,z=1+Math.floor(index/12)*2,y=2;set(controls,x,y,z,id);
 const support:Record<string,Vec3>={floor:[0,-1,0],ceiling:[0,1,0],north:[0,0,1],south:[0,0,-1],east:[-1,0,0],west:[1,0,0]},d=support[face==='wall'?facing:face];set(controls,x+d[0],y+d[1],z+d[2],1);index++;
}
controls.palette.push({name:'example:missing_block'});set(controls,2,1,14,controls.palette.length-1);
const liquids:FixtureRegion={name:'Pool',position:[-20,0,-4],size:[34,4,9],palette:[{name:'minecraft:air'},{name:'minecraft:stone'},{name:'minecraft:water',props:{level:'0'}},{name:'minecraft:bubble_column',props:{drag:'false'}},{name:'minecraft:lava',props:{level:'0'}}],values:Array(34*4*9).fill(0)};
for(let x=0;x<34;x++)for(let z=0;z<9;z++){set(liquids,x,0,z,1);if(z===0||z===8)set(liquids,x,1,z,1);else set(liquids,x,1,z,z<4?(x%3?2:3):4);}
for(let level=1;level<=7;level++){const id=liquids.palette.push({name:'minecraft:water',props:{level:String(level)}})-1;for(let z=1;z<4;z++)set(liquids,8+level,1,z,id);}
for(let y=1;y<=2;y++)set(liquids,5,y,2,2);
const extension:FixtureRegion={name:'Negative extension',position:[15,0,-4],size:[-2,4,9],palette:liquids.palette,values:Array(2*4*9).fill(0)};
for(let x=0;x<2;x++)for(let z=0;z<9;z++){set(extension,x,0,z,1);set(extension,x,1,z,z===0||z===8?1:z<4?2:4);}
writeFileSync('public/fixtures/controls-gallery.litematic',fixture([controls],true,'按钮与拉杆 · Controls'));
writeFileSync('public/fixtures/fluids-gallery.litematic',fixture([liquids,extension],true,'连续液面 · Fluid levels'));
