import {writeFileSync,readFileSync} from 'node:fs';import {fixture,type FixtureRegion} from './fixture';
import {parseLitematic} from '../src/core/litematic';import {faces,surfaceFor,textureDiagnostics} from '../src/core/textures';import {modelFor} from '../src/core/models';
const blocks:FixtureRegion['palette']=[];
const add=(name:string,props:Record<string,string>={})=>blocks.push({name:name.includes(':')?name:'minecraft:'+name,props});
add('grass_block');add('grass_block',{snowy:'true'});for(const axis of ['x','y','z'])add('oak_log',{axis});add('stripped_spruce_log',{axis:'x'});add('oak_wood',{axis:'y'});add('bone_block',{axis:'z'});
add('crafting_table');for(const facing of ['north','east','south','west'])add('furnace',{facing,lit:'false'});add('furnace',{facing:'south',lit:'true'});add('smoker',{facing:'south',lit:'true'});add('blast_furnace',{facing:'east',lit:'true'});
add('barrel',{facing:'up',open:'true'});add('dispenser',{facing:'up'});add('dispenser',{facing:'north'});add('observer',{facing:'east',powered:'true'});add('sandstone');add('quartz_block');add('quartz_pillar',{axis:'x'});add('target');
for(const facing of ['north','east','south','west'])add('oak_stairs',{facing,half:'bottom',shape:'straight'});add('stone_brick_stairs',{facing:'east',half:'top',shape:'inner_left'});add('stone_brick_stairs',{facing:'west',half:'bottom',shape:'outer_right'});add('oak_slab',{type:'bottom'});add('oak_slab',{type:'top'});
add('oak_slab',{type:'double'});add('stone_brick_slab',{type:'bottom'});add('oak_fence',{north:'true',south:'true',east:'false',west:'false'});add('oak_fence',{north:'false',south:'false',east:'true',west:'true'});add('glass_pane',{north:'true',south:'true',east:'false',west:'false'});add('glass_pane',{north:'false',south:'false',east:'true',west:'true'});add('red_stained_glass_pane',{north:'false',south:'false',east:'true',west:'true'});add('glass');
add('red_stained_glass');for(const n of ['oak','birch','spruce','cherry'])add(n+'_leaves');add('water',{level:'0'});add('lava',{level:'0'});add('oak_trapdoor',{facing:'east',half:'top',open:'true'});
add('oak_door',{facing:'south',half:'lower',hinge:'left',open:'false'});add('oak_door',{facing:'east',half:'lower',hinge:'right',open:'true'});add('oak_door',{facing:'south',half:'upper',hinge:'left',open:'false'});add('lantern');add('chest',{facing:'south',type:'single'});add('examplemod:stone');add('no_such_block');add('red_tulip');
const sx=32,sy=4,sz=32,palette=[{name:'minecraft:air'},{name:'minecraft:stone'},...blocks],values=Array(sx*sy*sz).fill(0);
for(let z=0;z<sz;z++)for(let x=0;x<sx;x++)values[x+z*sx]=1;
blocks.forEach((_,i)=>{const x=2+(i%8)*4,z=2+Math.floor(i/8)*4;values[x+z*sx+sx*sz]=i+2;});
const bytes=fixture([{name:'Texture Gallery',position:[-16,0,-16],size:[sx,sy,sz],palette,values}],true,'Texture Verification Gallery');writeFileSync('public/fixtures/texture-gallery.litematic',bytes);
const detailNames:FixtureRegion['palette']=[{name:'minecraft:grass_block'},{name:'minecraft:oak_log',props:{axis:'x'}},{name:'minecraft:oak_log',props:{axis:'y'}},{name:'minecraft:oak_log',props:{axis:'z'}},
  {name:'minecraft:crafting_table'},{name:'minecraft:furnace',props:{facing:'east',lit:'false'}},{name:'minecraft:furnace',props:{facing:'south',lit:'false'}},{name:'minecraft:furnace',props:{facing:'south',lit:'true'}},
  {name:'minecraft:oak_stairs',props:{facing:'east',half:'bottom',shape:'straight'}},{name:'minecraft:stone_brick_stairs',props:{facing:'south',half:'top',shape:'inner_left'}},{name:'minecraft:oak_slab',props:{type:'bottom'}},{name:'minecraft:oak_slab',props:{type:'top'}},
  {name:'minecraft:glass_pane',props:{east:'true',west:'true',north:'false',south:'false'}},{name:'minecraft:red_stained_glass',props:{}},{name:'minecraft:oak_leaves',props:{}},{name:'minecraft:water',props:{level:'0'}},
  {name:'minecraft:chest'},{name:'examplemod:stone'},{name:'minecraft:oak_fence',props:{east:'true',west:'true'}},{name:'minecraft:oak_door',props:{facing:'south',half:'lower',hinge:'left',open:'false'}}];
const dw=11,dh=4,dd=14,detailValues=Array(dw*dh*dd).fill(0);
for(let z=0;z<dd;z++)for(let x=0;x<dw;x++)detailValues[x+z*dw]=1;
detailNames.forEach((_,i)=>detailValues[1+(i%4)*3+(1+Math.floor(i/4)*3)*dw+dw*dd]=i+2);
writeFileSync('public/fixtures/texture-detail.litematic',fixture([{name:'Texture Detail',position:[-5,0,-7],size:[dw,dh,dd],palette:[{name:'minecraft:air'},{name:'minecraft:stone'},...detailNames],values:detailValues}],true,'Texture Detail'));
const reports=[];
for(const filename of ['keep','SimpleHouse','Lite','texture-gallery','texture-detail']){
  const b=readFileSync(`public/fixtures/${filename}.litematic`),s=await parseLitematic(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer);
  reports.push({file:filename+'.litematic',totalBlocks:s.totalBlocks,missingTextures:textureDiagnostics(s.states),simplifiedGeometry:s.states.filter(st=>modelFor(st).fallback&&st.name!=='minecraft:air').map(st=>st.key),states:s.states.filter(st=>st.name!=='minecraft:air').map(st=>({state:st.key,faces:Object.fromEntries(faces.map(f=>[f,surfaceFor(st,f)]))}))});
}
writeFileSync('public/textures/mapping-report.json',JSON.stringify({source:'block.zip',namespace:'minecraft only; other namespaces require explicit mappings and use missing material',rules:'exact texture names + explicit multi-face/state rules + canonical block-family aliases',biome:'Default plains-style tint only for grayscale grass/leaves/water; colored pack textures remain unchanged',reports},null,2));
console.log('Texture gallery and per-state mapping/missing-resource report written.');
