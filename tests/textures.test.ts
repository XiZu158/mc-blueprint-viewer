import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {textureName,surfaceFor,faceUv,textureDiagnostics,faces,textureByName} from '../src/core/textures';
import {textureManifest} from '../src/generated/texture-manifest';import {animationFrame} from '../src/viewer/block-textures';
import {stateKey,type BlockState,type Filter} from '../src/core/types';import {parseLitematic} from '../src/core/litematic';import {meshChunk,mesherContext} from '../src/core/mesher';import {fixture,type FixtureRegion} from './fixture';
const state=(name:string,properties:Record<string,string>={}):BlockState=>({name:name.includes(':')?name:'minecraft:'+name,properties,key:stateKey(name,properties)});
test('all 1152 imported PNGs (1112 pack + 40 supplied/derived surfaces) preserve sources, 54 animations and padded frames',()=>{
  const report=JSON.parse(readFileSync('public/textures/import-report.json','utf8'));assert.equal(report.pngCount,1152);assert.equal(report.originalPackPngCount,1112);assert.equal(report.additionalPngCount,16);assert.equal(report.metadataCount,102);assert.equal(report.models,0);assert.equal(report.blockstates,0);assert.equal(report.animatedTextures,54);assert.equal(report.frames,1693);assert.equal(report.padding,2);
  for(const a of report.textures){if(a.name==='__missing__')continue;assert.equal(createHash('sha256').update(readFileSync(`public/textures/block/${a.name}.png`)).digest('hex'),a.sha256);for(const r of a.rects){assert.ok(r[0]>0&&r[1]>0&&r[0]+r[2]<1&&r[1]+r[3]<1);}assert.ok(a.sequence.every((f:any)=>f.index<a.rects.length&&f.time>0));}
});
test('namespaces, wood families, axis ends, grass faces, sandstone and quartz inheritance',()=>{
  assert.equal(textureName(state('othermod:oak_log'),'up'),'__missing__');
  for(const a of ['x','y','z'])for(const face of faces)assert.equal(textureName(state('oak_log',{axis:a}),face),({x:['east','west'],y:['up','down'],z:['north','south']}[a] as string[]).includes(face)?'oak_log_top':'oak_log');
  assert.equal(textureName(state('oak_wood'),'up'),'oak_log');assert.equal(textureName(state('stripped_spruce_log',{axis:'y'}),'up'),'stripped_spruce_log_top');
  assert.deepEqual(faces.map(f=>textureName(state('grass_block'),f)),['grass_block_side','grass_block_side','dirt','grass_block_top','grass_block_side','grass_block_side']);
  assert.equal(textureName(state('grass_block',{snowy:'true'}),'east'),'grass_block_snow');
  for(const n of ['oak_stairs','oak_slab','oak_fence','oak_fence_gate'])assert.equal(textureName(state(n),'east'),'oak_planks');
  assert.equal(textureName(state('stone_brick_stairs'),'up'),'stone_bricks');assert.equal(textureName(state('waxed_cut_copper_slab'),'east'),'cut_copper');assert.equal(textureName(state('deepslate_tile_stairs'),'east'),'deepslate_tiles');
  assert.equal(textureName(state('smooth_stone_slab'),'east'),'smooth_stone_slab_side');assert.equal(textureName(state('smooth_stone_slab'),'up'),'smooth_stone');
  assert.equal(textureName(state('quartz_stairs'),'down'),'quartz_block_bottom');assert.equal(textureName(state('cut_red_sandstone'),'down'),'red_sandstone_bottom');
});
test('directional furnace/lit fronts, crafting table faces, doors and glass pane edge resources',()=>{
  for(const f of ['north','south','east','west'])for(const lit of ['true','false'])for(const face of faces)assert.equal(textureName(state('furnace',{facing:f,lit}),face),face===f?'furnace_front'+(lit==='true'?'_on':''):face==='up'||face==='down'?'furnace_top':'furnace_side');
  assert.deepEqual(faces.map(f=>textureName(state('crafting_table'),f)),['crafting_table_front','crafting_table_side','oak_planks','crafting_table_top','crafting_table_front','crafting_table_side']);
  assert.equal(textureName(state('oak_door',{half:'upper'}),'east'),'oak_door_top');assert.equal(textureName(state('oak_door',{half:'lower'}),'east'),'oak_door_bottom');
  assert.equal(textureName(state('red_stained_glass_pane'),'up'),'red_stained_glass_pane_top');assert.equal(textureName(state('glass_pane'),'north'),'glass');
});
test('UVs preserve image top, correct front orientation, horizontal log grain and do not stretch greedy faces',async()=>{
  assert.deepEqual(faceUv(state('stone'),2,-1,[0,1,0]),[1,1]);assert.deepEqual(faceUv(state('stone'),2,-1,[1,0,0]),[0,0]);
  assert.deepEqual(faceUv(state('furnace',{facing:'east'}),0,1,[1,1,0]),[1,1]);assert.deepEqual(faceUv(state('furnace',{facing:'east'}),0,1,[1,0,1]),[0,0]);
  assert.deepEqual(faceUv(state('oak_log',{axis:'x'}),2,1,[.25,.75,1]),[.25,.25]);
  const r:FixtureRegion={name:'r',position:[0,0,0],size:[32,1,1],palette:[{name:'minecraft:stone'}],values:Array(32).fill(0)},raw=fixture([r]),s=await parseLitematic(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length) as ArrayBuffer);
  const filter:Filter={regions:['r'],hidden:[],highlight:[],isolate:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity},g=meshChunk(s.regions[0],[0,0,0],mesherContext(s,s.regions[0],filter));
  assert.equal(g.positions.length/9,12);assert.ok(Math.max(...g.uvs)-Math.min(...g.uvs)>=32);assert.ok([...g.textureIds].every(id=>id===textureByName.get('stone')!.id));
});
test('cutout vs blend, grayscale-only tint, colored grass side remains untinted and missing faces are reported',()=>{
  assert.notDeepEqual(surfaceFor(state('grass_block'),'up').tint,[1,1,1]);assert.deepEqual(surfaceFor(state('grass_block'),'north').tint,[1,1,1]);
  assert.notDeepEqual(surfaceFor(state('oak_leaves'),'up').tint,[1,1,1]);assert.deepEqual(surfaceFor(state('cherry_leaves'),'up').tint,[1,1,1]);
  assert.equal(surfaceFor(state('oak_leaves'),'up').layer,1);assert.equal(surfaceFor(state('glass'),'up').layer,1);assert.equal(surfaceFor(state('red_stained_glass'),'up').layer,2);assert.equal(surfaceFor(state('water'),'up').layer,2);
  assert.equal(surfaceFor(state('minecraft:no_such_block'),'up').id,0);assert.equal(surfaceFor(state('other:stone'),'up').id,0);assert.deepEqual(textureDiagnostics([state('chest'),state('ender_chest')]),[]);assert.equal(textureDiagnostics([state('minecraft:no_such_block')])[0].faces.length,6);
  assert.deepEqual(textureDiagnostics(['air','cave_air','void_air'].map(n=>state(n))),[]);
  assert.equal(textureDiagnostics([state('other:stone')])[0].requested[0],'other:stone');
});
test('animation frame order, per-frame durations, interpolation and non-square image metadata are honored',()=>{
  const lava=textureByName.get('lava_still')!;assert.equal(animationFrame(lava,0).index,0);assert.equal(animationFrame(lava,2).index,1);assert.equal(animationFrame(lava,40).index,18);
  const animated=textureManifest.find(a=>a.interpolate&&a.animated)!;assert.ok(animated);assert.ok(animationFrame(animated,.5).mix>0);
  for(const a of textureManifest)assert.ok(a.sequence.every(f=>f.index>=0&&f.index<a.rects.length));
});

