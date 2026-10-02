import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {modelFor} from '../src/core/models';import {orientPiston} from '../src/core/piston-model';import {surfaceFor,textureDiagnostics,textureName,textureByName} from '../src/core/textures';import {stateKey,type BlockState,type Filter} from '../src/core/types';import {parseLitematic} from '../src/core/litematic';import {meshChunk,mesherContext,chunkOrigins} from '../src/core/mesher';
const state=(name:string,properties:Record<string,string>={}):BlockState=>({name:'minecraft:'+name,properties,key:stateKey('minecraft:'+name,properties)}),directions=['north','east','south','west'];
test('repeaters: 64 states keep 1/8 base, two indicators, moving delay and locking bar; correct on/off surfaces',()=>{
 for(const facing of directions)for(const powered of ['true','false'])for(const delay of ['1','2','3','4'])for(const locked of ['false','true']){const s=state('repeater',{facing,powered,delay,locked}),m=modelFor(s);assert.equal(m.full,false);assert.equal(m.boxes.length,3);assert.equal(m.boxes[0][4],.125);assert.equal(m.fallback,false);assert.deepEqual(textureDiagnostics([s]),[]);assert.equal(textureName(s,'up'),powered==='true'?'repeater_on':'repeater');assert.ok(m.quads!.some(q=>q.texture===(locked==='true'?'bedrock':powered==='true'?'redstone_torch':'redstone_torch_off')));}
 const one=modelFor(state('repeater',{delay:'1'})),four=modelFor(state('repeater',{delay:'4'}));assert.equal(one.boxes[2][2],6/16);assert.equal(four.boxes[2][2],12/16);
});
test('comparators: four directions, independent mode indicator and two output indicators, correct top and stone side',()=>{
 for(const facing of directions)for(const powered of ['true','false'])for(const mode of ['compare','subtract']){const s=state('comparator',{facing,powered,mode}),m=modelFor(s);assert.equal(m.boxes.length,4);assert.equal(m.boxes[0][4],.125);assert.equal(m.boxes[3][4],mode==='subtract'?5/16:7/16);assert.equal(textureName(s,'north'),'smooth_stone');assert.deepEqual(textureDiagnostics([s]),[]);assert.equal(m.quads!.slice(-5).every(q=>q.texture===(mode==='subtract'?'redstone_torch':'redstone_torch_off')),true);}
});
test('single/double/trapped/ender chests: body, lid and latch leave correct margins, seam and facing; all supplied chest faces resolve',()=>{
 for(const n of ['chest','trapped_chest','ender_chest'])for(const facing of directions)for(const type of ['single','left','right']){const s=state(n,{facing,type}),m=modelFor(s);assert.equal(m.full,false);assert.equal(m.fallback,false);assert.equal(m.boxes.length,3);assert.equal(Math.max(...m.boxes.map(b=>b[4])),.875);assert.ok(m.boxes.every(b=>b.every(v=>v>=0&&v<=1)));const d=textureDiagnostics([s]);assert.equal(d.length,0);}
 const left=modelFor(state('chest',{facing:'north',type:'left'})),right=modelFor(state('chest',{facing:'north',type:'right'}));assert.equal(left.boxes[0][3],1);assert.equal(right.boxes[0][0],0);assert.equal(left.boxes[0][0],1/16);assert.equal(right.boxes[0][3],15/16);
});
test('supplied chest artwork maps six independent surfaces, separate clasp, four facings and a distinct trapped clasp',()=>{
 for(const facing of directions){const s=state('chest',{facing,type:'single'}),m=modelFor(s);for(const name of ['top','bottom','front','back','left','right','lock_front','lock_side'])assert.ok(m.quads!.some(q=>q.texture==='user_chest_'+name));
  for(const q of m.quads!)assert.ok(textureByName.has(q.texture));assert.equal(textureName(s,facing as 'north'),'user_chest_front');assert.deepEqual(textureDiagnostics([s]),[]);
  const normal=orientPiston([.5,.5,-.5],facing).map((v,i)=>v-orientPiston([.5,.5,.5],facing)[i]),front=m.quads!.find(q=>q.texture==='user_chest_front')!;assert.equal(front.sign,normal[front.axis]);
 }
 assert.deepEqual(surfaceFor(state('chest'),'north','user_chest_lock_front').tint,[1,1,1]);assert.notDeepEqual(surfaceFor(state('trapped_chest'),'north','user_chest_lock_front').tint,[1,1,1]);assert.equal(textureByName.get('user_chest_front')!.width,16);
});
test('double chest texture halves join continuously, without interior black borders or internal overlapping side faces',()=>{
 const left=modelFor(state('chest',{facing:'north',type:'left'})),right=modelFor(state('chest',{facing:'north',type:'right'}));
 const lf=left.quads!.find(q=>q.texture==='user_chest_front')!,rf=right.quads!.find(q=>q.texture==='user_chest_front')!;
 for(const y of [0,10/16]){const li=lf.points.findIndex(p=>p[0]===1&&p[1]===y),ri=rf.points.findIndex(p=>p[0]===0&&p[1]===y);assert.ok(li>=0&&ri>=0);assert.deepEqual(lf.uv[li],rf.uv[ri]);}
 assert.ok(!left.quads!.some(q=>q.texture==='user_chest_right'));assert.ok(!right.quads!.some(q=>q.texture==='user_chest_left'));
});
test('hoppers have hollow upper bowl, 5 directed outputs and three correct resources',()=>{
 for(const facing of [...directions,'down']){const s=state('hopper',{facing}),m=modelFor(s);assert.equal(m.full,false);assert.equal(m.boxes.length,7);assert.equal(m.boxes[0][4],11/16);assert.ok(['hopper_inside','hopper_outside','hopper_top'].every(t=>m.quads!.some(q=>q.texture===t)));assert.deepEqual(textureDiagnostics([s]),[]);}
 assert.equal(modelFor(state('hopper',{facing:'down'})).boxes[6][1],0);assert.equal(modelFor(state('hopper',{facing:'north'})).boxes[6][2],0);
});
test('rails: transparent plane, curve connection UV direction, ascent points and normalized perpendicular normals',()=>{
 for(const shape of ['north_south','east_west','south_east','south_west','north_east','north_west','ascending_north','ascending_east','ascending_south','ascending_west']){const s=state('rail',{shape}),m=modelFor(s),q=m.quads![0];assert.equal(m.full,false);assert.equal(m.quads!.length,1);assert.ok(q.uv.every(p=>p.every(v=>v>=0&&v<=1)));assert.deepEqual(textureDiagnostics([s]),[]);const a=q.points[0],b=q.points[1],c=q.points[2],u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=q.normal!;assert.ok(Math.abs(n.reduce((sum,v)=>sum+v*v,0)-1)<1e-6);assert.ok(Math.abs(u.reduce((sum,v,i)=>sum+v*n[i],0))<1e-6);assert.ok(Math.abs(v.reduce((sum,v,i)=>sum+v*n[i],0))<1e-6);
  if(shape.startsWith('ascending'))assert.equal(Math.max(...q.points.map(p=>p[1])),1.0625);else assert.equal(Math.max(...q.points.map(p=>p[1])),.0625);
  if(q.texture==='rail_corner'){for(const direction of shape.split('_')){const axis=direction==='east'||direction==='west'?0:2,bound=direction==='east'||direction==='south'?1:0;assert.ok(q.points.filter((p,i)=>q.uv[i][0]===1||q.uv[i][1]===0).some(p=>p[axis]===bound));}}
 }
 for(const n of ['powered_rail','activator_rail','detector_rail'])assert.equal(modelFor(state(n,{powered:'true'})).quads![0].texture,n+'_on');
});
test('redstone wire lies on ground, respects connections/climbs and colors by power without opaque cubes',()=>{
 const isolated=modelFor(state('redstone_wire',{})),cross=modelFor(state('redstone_wire',{north:'side',south:'side',east:'side',west:'side'})),up=modelFor(state('redstone_wire',{north:'up'}));assert.equal(isolated.quads!.length,1);assert.equal(cross.quads!.length,5);assert.equal(up.quads!.length,3);assert.ok(cross.quads!.every(q=>q.points.every(p=>p[1]<.02)));assert.equal(surfaceFor(state('redstone_wire',{power:'15'}),'up').layer,1);assert.notDeepEqual(surfaceFor(state('redstone_wire',{power:'0'}),'up').tint,surfaceFor(state('redstone_wire',{power:'15'}),'up').tint);
});
test('buttons attach to floor/wall/ceiling, powered depth shrinks; plates, bitten cake, sensors and cauldrons are partial',()=>{
 for(const facing of directions)for(const powered of ['false','true']){const floor=modelFor(state('stone_button',{face:'floor',facing,powered})),ceiling=modelFor(state('oak_button',{face:'ceiling',facing,powered}));assert.equal(floor.boxes[0][4],powered==='true'?1/16:2/16);assert.equal(ceiling.boxes[0][1],powered==='true'?15/16:14/16);assert.deepEqual(textureDiagnostics([state('oak_button',{face:'floor',facing,powered})]),[]);}
 assert.equal(modelFor(state('heavy_weighted_pressure_plate',{power:'15'})).boxes[0][4],1/32);assert.equal(modelFor(state('cake',{bites:'6'})).boxes[0][0],13/16);assert.equal(modelFor(state('daylight_detector')).boxes[0][4],.375);
 for(const n of ['cauldron','water_cauldron','lava_cauldron','powder_snow_cauldron']){const s=state(n,{level:'3'}),m=modelFor(s);assert.equal(m.full,false);assert.ok(m.boxes.length>=9);assert.deepEqual(textureDiagnostics([s]),[]);}
 assert.equal(modelFor(state('water_cauldron',{level:'1'})).quads!.at(-1)!.points[0][1],9/16);
});
test('binary partial gallery meshes exact original inventory, including supplied Ender Chest; filtering never changes count',async()=>{
 const b=readFileSync('public/fixtures/partial-gallery.litematic'),s=await parseLitematic(b.buffer.slice(b.byteOffset,b.byteOffset+b.length) as ArrayBuffer),r=s.regions[0],filter:Filter={regions:[r.name],hidden:[],isolate:[],highlight:[],yMin:-Infinity,yMax:Infinity,cutAxis:'none',cutValue:Infinity};assert.equal(s.totalBlocks,2378);assert.equal(s.materials.find(m=>m.name==='minecraft:repeater')!.count,64);assert.equal(s.materials.find(m=>m.name==='minecraft:comparator')!.count,16);assert.equal(s.materials.find(m=>m.name==='minecraft:chest')!.count,12);assert.deepEqual(textureDiagnostics(s.states),[]);
 const ctx=mesherContext(s,r,filter);let triangles=0;for(const origin of chunkOrigins(r)){const g=meshChunk(r,origin,ctx);triangles+=g.positions.length/9;assert.ok([...g.positions,...g.normals,...g.uvs].every(Number.isFinite));for(let i=0;i<g.positions.length;i+=9){const p=g.positions,n=g.normals,u=[p[i+3]-p[i],p[i+4]-p[i+1],p[i+5]-p[i+2]],v=[p[i+6]-p[i],p[i+7]-p[i+1],p[i+8]-p[i+2]],cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(cross.reduce((sum,v,a)=>sum+v*n[i+a],0)>0);}}assert.ok(triangles>5000);assert.equal(s.materials.reduce((sum,m)=>sum+m.count,0),2378);
});

