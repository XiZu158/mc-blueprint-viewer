import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {modelFor} from '../src/core/models';import {orientPiston} from '../src/core/piston-model';
import {textureDiagnostics,textureName,textureByName,faces} from '../src/core/textures';
import {stateKey,detailedPick,type BlockState,type Filter} from '../src/core/types';
import {parseLitematic} from '../src/core/litematic';import {mesherContext,meshChunk} from '../src/core/mesher';import {fixture} from './fixture';
const state=(name:string,properties:Record<string,string>):BlockState=>({name:'minecraft:'+name,properties,key:stateKey('minecraft:'+name,properties)});
const directions=['north','east','south','west','up','down'];
const filter:Filter={regions:['r'],hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity};
test('piston head: all 24 facing/type/short combinations preserve plate, rod, outward normals and exact textured strips',()=>{
  for(const facing of directions)for(const type of ['normal','sticky'])for(const short of ['false','true']){
    const s=state('piston_head',{facing,type,short}),m=modelFor(s);assert.equal(m.full,false);assert.equal(m.fallback,false);assert.equal(m.boxes.length,2);assert.equal(m.quads!.length,10);assert.deepEqual(textureDiagnostics([s]),[]);
    const volume=m.boxes.reduce((sum,b)=>sum+(b[3]-b[0])*(b[4]-b[1])*(b[5]-b[2]),0);assert.equal(volume,short==='true'?.296875:.3125);
    const front=m.quads!.find(q=>q.texture===(type==='sticky'?'piston_top_sticky':'piston_top'))!;
    const normal=orientPiston([.5,.5,-.5],facing).map((v,i)=>v-orientPiston([.5,.5,.5],facing)[i]);assert.equal(front.sign,normal[front.axis]);
    for(const q of m.quads!){const a=q.points[0],b=q.points[1],c=q.points[2],u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(cross[q.axis]*q.sign>0);assert.ok(textureByName.has(q.texture));assert.ok(q.uv.every(p=>p.every(v=>v>=0&&v<=1)));}
    for(const q of m.quads!.filter(q=>q.texture==='piston_side')){assert.equal(Math.min(...q.uv.map(p=>p[1])),.75);assert.equal(Math.max(...q.uv.map(p=>p[1])),1);}
    assert.equal(textureName(s,facing as typeof faces[number]),type==='sticky'?'piston_top_sticky':'piston_top');
  }
});
test('extended and retracted pistons: six directions, correct inner/front/back and shortened base',()=>{
  for(const facing of directions)for(const n of ['piston','sticky_piston'])for(const extended of ['true','false']){
    const s=state(n,{facing,extended}),m=modelFor(s),b=m.boxes[0];assert.equal(m.fallback,false);assert.equal(m.quads!.length,6);assert.equal((b[3]-b[0])*(b[4]-b[1])*(b[5]-b[2]),extended==='true'?.75:1);assert.deepEqual(textureDiagnostics([s]),[]);
    assert.equal(textureName(s,facing as typeof faces[number]),extended==='true'?'piston_inner':n==='sticky_piston'?'piston_top_sticky':'piston_top');
    assert.ok(m.quads!.some(q=>q.texture==='piston_bottom'));assert.ok(m.quads!.some(q=>q.texture===(extended==='true'?'piston_inner':n==='sticky_piston'?'piston_top_sticky':'piston_top')));
  }
});
test('protruding rod survives chunk meshing, ray picking resolves source head, filtering preserves exact inventory',async()=>{
  const bytes=fixture([{name:'r',position:[100,-4,20],size:[3,3,3],palette:[{name:'minecraft:air'},{name:'minecraft:piston_head',props:{facing:'north',type:'sticky',short:'false'}}],values:Array.from({length:27},(_,i)=>i===13?1:0)}]);
  const s=await parseLitematic(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length) as ArrayBuffer),r=s.regions[0],g=meshChunk(r,[0,0,0],mesherContext(s,r,filter));
  assert.equal(s.totalBlocks,1);assert.equal(g.positions.length/9,20);assert.equal(Math.max(...[...g.positions].filter((_,i)=>i%3===2)),2.25);assert.ok([...g.textureIds].every(id=>id!==0));
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(g.positions,3));const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial());
  const hit=new THREE.Raycaster(new THREE.Vector3(0,1.5,2.1),new THREE.Vector3(1,0,0)).intersectObject(mesh)[0];assert.ok(hit);assert.equal(Math.floor(hit.point.z),2);assert.deepEqual(detailedPick(g.picks!,hit.faceIndex!*3),[101,-3,21]);
  assert.equal(meshChunk(r,[0,0,0],mesherContext(s,r,{...filter,hidden:[1]})).positions.length,0);assert.equal(meshChunk(r,[0,0,0],mesherContext(s,r,{...filter,yMin:0,yMax:0})).positions.length,0);assert.equal(s.totalBlocks,1);
});
test('anvil variants retain slender geometry, facing and distinct damage top resources; mod names stay missing',()=>{
  for(const n of ['anvil','chipped_anvil','damaged_anvil']){const a=modelFor(state(n,{facing:'north'})),b=modelFor(state(n,{facing:'east'}));assert.equal(a.full,false);assert.equal(a.boxes.length,4);assert.equal(a.fallback,false);assert.notDeepEqual(a.boxes,b.boxes);assert.equal(textureName(state(n,{}),'up'),n+'_top');assert.equal(textureName(state(n,{}),'north'),'anvil');assert.deepEqual(textureDiagnostics([state(n,{})]),[]);}
  assert.equal(modelFor({name:'mod:piston_head',key:'',properties:{facing:'north'}}).quads,undefined);assert.equal(textureDiagnostics([{name:'mod:piston_head',key:'',properties:{}}]).length,1);
});
test('real binary piston fixture loads all states without missing resources and retains all materials',async()=>{
  const b=readFileSync('public/fixtures/piston-gallery.litematic'),s=await parseLitematic(b.buffer.slice(b.byteOffset,b.byteOffset+b.length) as ArrayBuffer);assert.equal(s.totalBlocks,1090);assert.deepEqual(textureDiagnostics(s.states),[]);
  assert.equal(s.materials.find(m=>m.name==='minecraft:piston_head')!.count,24);assert.equal(s.materials.find(m=>m.name==='minecraft:piston')!.count,18);assert.equal(s.materials.find(m=>m.name==='minecraft:sticky_piston')!.count,18);
});

