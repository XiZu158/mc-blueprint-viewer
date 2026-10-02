import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {modelFor} from '../src/core/models';import {surfaceFor,textureDiagnostics} from '../src/core/textures';
import {stateKey,detailedPick,type BlockState,type Filter} from '../src/core/types';
import {parseLitematic} from '../src/core/litematic';import {chunkOrigins,mesherContext,meshChunk} from '../src/core/mesher';
const state=(n:string,p:Record<string,string>={}):BlockState=>({name:'minecraft:'+n,properties:p,key:stateKey('minecraft:'+n,p)});
test('standing torch samples the 2×10 stem, cap and bottom UV instead of stretching the transparent sprite',()=>{
 for(const n of ['torch','soul_torch','copper_torch','redstone_torch'])for(const lit of ['true','false']){const s=state(n,{lit}),m=modelFor(s);assert.deepEqual(m.boxes,[[7/16,0,7/16,9/16,10/16,9/16]]);assert.equal(m.full,false);assert.equal(m.fallback,false);assert.equal(m.quads!.length,6);const q=m.quads!.find(q=>q.axis===2)!;assert.deepEqual([...new Set(q.uv.map(p=>p[0]))].sort((a,b)=>a-b),[7/16,9/16]);assert.deepEqual([...new Set(q.uv.map(p=>p[1]))].sort((a,b)=>a-b),[0,10/16]);assert.deepEqual(textureDiagnostics([s]),[]);assert.equal(q.texture,n==='redstone_torch'&&lit==='false'?'redstone_torch_off':n);}
});
test('wall torches attach to the correct support, incline 22.5 degrees and have perpendicular unit normals',()=>{
 for(const n of ['wall_torch','soul_wall_torch','redstone_wall_torch','copper_wall_torch'])for(const facing of ['north','east','south','west']){const m=modelFor(state(n,{facing,lit:'false'})),b=m.boxes[0];assert.equal(m.full,false);assert.ok(b[4]>13/16&&b[4]<14/16);const axis=facing==='north'||facing==='south'?2:0,positive=facing==='south'||facing==='east';assert.ok(positive?b[axis+3]<.35:b[axis]>.65,`${n} ${facing} support side`);
  // Facing east is attached at west, north at south; normal direction follows the visible stem.
  const correct=facing==='north'||facing==='west';assert.ok(correct?b[axis+3]>.99:b[axis]<.01);
  for(const q of m.quads!){const normal=q.normal!,a=q.points[1].map((v,i)=>v-q.points[0][i]),v=q.points[2].map((v,i)=>v-q.points[0][i]);assert.ok(Math.abs(normal.reduce((n,v)=>n+v*v,0)-1)<1e-8);assert.ok(Math.abs(a.reduce((n,v,i)=>n+v*normal[i],0))<1e-8);assert.ok(Math.abs(v.reduce((n,v,i)=>n+v*normal[i],0))<1e-8);}
 }
});
test('lantern body, cap and crossed handle/hanging chain use exact regions of the animated texture',()=>{
 for(const n of ['lantern','soul_lantern','copper_lantern','waxed_copper_lantern','oxidized_copper_lantern'])for(const hanging of ['false','true']){const s=state(n,{hanging}),m=modelFor(s),y=hanging==='true'?1:0;assert.deepEqual(m.boxes[0],[5/16,y/16,5/16,11/16,(7+y)/16,11/16]);assert.equal(m.boxes.length,4);assert.equal(m.quads!.length,hanging==='true'?16:15);assert.equal(Math.max(...m.quads!.flatMap(q=>q.points.map(p=>p[1]))),hanging==='true'?1:11/16);assert.ok(m.quads!.every(q=>q.texture===n.replace(/^waxed_/,'')));assert.deepEqual(textureDiagnostics([s]),[]);assert.ok(m.quads!.slice(-4).every(q=>q.normal&&Math.abs(q.normal[0])+Math.abs(q.normal[2])>1.4));assert.equal(surfaceFor(s,'north').layer,1);}
});
test('chain crossed cutout planes rotate into all three axes without an opaque enclosing box',()=>{
 for(const axis of ['x','y','z']){const m=modelFor(state('chain',{axis})),i=['x','y','z'].indexOf(axis);assert.equal(m.quads!.length,4);assert.ok(m.quads!.every(q=>q.texture==='iron_chain'));assert.equal(Math.min(...m.quads!.flatMap(q=>q.points.map(p=>p[i]))),0);assert.equal(Math.max(...m.quads!.flatMap(q=>q.points.map(p=>p[i]))),1);assert.ok(m.quads!.every(q=>Math.abs(q.normal![i])<1e-8));}
});
test('binary lighting fixture keeps exact materials and merges angled geometry with owner-cell picking and filters',async()=>{
 const data=readFileSync('public/fixtures/light-gallery.litematic'),s=await parseLitematic(data.buffer.slice(data.byteOffset,data.byteOffset+data.length) as ArrayBuffer),r=s.regions[0],filter:Filter={regions:[r.name],hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity};
 assert.equal(s.materials.reduce((n,m)=>n+m.count,0),s.totalBlocks);assert.deepEqual(textureDiagnostics(s.states),[]);
 const chunks=[...chunkOrigins(r)].map(o=>meshChunk(r,o,mesherContext(s,r,filter)));assert.equal(chunks.length,1);assert.ok(chunks[0].groups.some(g=>g.materialIndex===1));
 const picked=chunks[0].picks!.find(p=>s.states[r.blocks[(p.position[0]-r.min[0])+(p.position[2]-r.min[2])*r.dimensions[0]+(p.position[1]-r.min[1])*r.dimensions[0]*r.dimensions[2]]].name==='minecraft:wall_torch');assert.ok(picked);assert.deepEqual(detailedPick(chunks[0].picks!,picked!.start),picked!.position);
 const id=s.states.findIndex(s=>s.name==='minecraft:lantern'&&s.properties.hanging==='true');const only=meshChunk(r,[0,0,0],mesherContext(s,r,{...filter,isolate:[id]}));assert.equal(only.positions.length/9,32);assert.equal(s.materials.find(m=>m.name==='minecraft:lantern')!.count,2);
});
