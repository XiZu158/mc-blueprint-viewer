import {writeFileSync} from 'node:fs';import {fixture,type FixtureRegion} from './fixture';import {parseLitematic} from '../src/core/litematic';import {textureDiagnostics,faces,surfaceFor} from '../src/core/textures';import {modelFor} from '../src/core/models';
const states:FixtureRegion['palette']=[],directions=['north','east','south','west'];
const add=(n:string,props:Record<string,string>={})=>states.push({name:'minecraft:'+n,props});
for(const facing of directions)for(const powered of ['false','true'])for(const delay of ['1','2','3','4'])for(const locked of ['false','true'])add('repeater',{facing,powered,delay,locked});
for(const facing of directions)for(const powered of ['false','true'])for(const mode of ['compare','subtract'])add('comparator',{facing,powered,mode});
for(const n of ['chest','trapped_chest'])for(const facing of directions)for(const type of ['single','left','right'])add(n,{facing,type});for(const facing of directions)add('ender_chest',{facing});
for(const facing of [...directions,'down'])add('hopper',{facing});
for(const shape of ['north_south','east_west','south_east','south_west','north_east','north_west','ascending_north','ascending_east','ascending_south','ascending_west'])add('rail',{shape});
for(const n of ['powered_rail','detector_rail','activator_rail'])for(const powered of ['true','false'])for(const shape of ['north_south','east_west','ascending_east'])add(n,{shape,powered});
for(const power of ['0','15'])for(const p of [{north:'none',south:'none',east:'none',west:'none'},{north:'side',south:'side',east:'none',west:'none'},{north:'none',south:'none',east:'side',west:'side'},{north:'side',south:'side',east:'side',west:'side'},{north:'side',south:'none',east:'side',west:'none'},{north:'up',south:'side',east:'none',west:'none'}])add('redstone_wire',{...p,power});
for(const n of ['stone_button','oak_button'])for(const face of ['floor','wall','ceiling'])for(const facing of directions)for(const powered of ['false','true'])add(n,{face,facing,powered});
for(const n of ['oak_pressure_plate','heavy_weighted_pressure_plate','light_weighted_pressure_plate'])for(const powered of ['false','true'])add(n,{powered,power:powered==='true'?'15':'0'});
for(const bites of ['0','3','6'])add('cake',{bites});for(const inverted of ['false','true'])add('daylight_detector',{inverted});
add('cauldron');for(const level of ['1','2','3'])add('water_cauldron',{level});add('lava_cauldron');add('powder_snow_cauldron',{level:'3'});
function schematic(name:string,palette:FixtureRegion['palette'],w:number,d:number,doubleChest=false){
 const h=4,values=Array(w*h*d).fill(0);for(let z=0;z<d;z++)for(let x=0;x<w;x++)values[x+z*w]=1;
 palette.forEach((_,i)=>{const x=1+(i%Math.floor(w/3))*3,z=1+Math.floor(i/Math.floor(w/3))*3;if(z>=d)throw Error('Fixture grid too small');values[x+z*w+w*d]=i+2;});
 const all=[{name:'minecraft:air'},{name:'minecraft:stone'},...palette];if(doubleChest){values[4+8*w+w*d]=all.length;all.push({name:'minecraft:trapped_chest',props:{facing:'east',type:'right'}});}
 return fixture([{name,position:[-Math.floor(w/2),0,-Math.floor(d/2)],size:[w,h,d],palette:all,values}],true,name);
}
const detail:FixtureRegion['palette']=[
 {name:'minecraft:repeater',props:{facing:'north',powered:'false',delay:'1',locked:'false'}},{name:'minecraft:repeater',props:{facing:'east',powered:'true',delay:'4',locked:'false'}},{name:'minecraft:repeater',props:{facing:'south',powered:'true',delay:'2',locked:'true'}},{name:'minecraft:comparator',props:{facing:'north',powered:'false',mode:'compare'}},{name:'minecraft:comparator',props:{facing:'east',powered:'true',mode:'subtract'}},
 {name:'minecraft:hopper',props:{facing:'down'}},{name:'minecraft:hopper',props:{facing:'south'}},{name:'minecraft:rail',props:{shape:'north_south'}},{name:'minecraft:rail',props:{shape:'south_east'}},{name:'minecraft:powered_rail',props:{shape:'ascending_east',powered:'true'}},
 {name:'minecraft:chest',props:{facing:'south',type:'single'}},{name:'minecraft:trapped_chest',props:{facing:'east',type:'left'}},{name:'minecraft:ender_chest',props:{facing:'south'}},{name:'minecraft:redstone_wire',props:{north:'side',south:'side',east:'none',west:'none',power:'0'}},{name:'minecraft:redstone_wire',props:{north:'side',south:'none',east:'side',west:'none',power:'15'}},
 {name:'minecraft:stone_button',props:{face:'floor',facing:'east',powered:'false'}},{name:'minecraft:heavy_weighted_pressure_plate',props:{power:'15'}},{name:'minecraft:cake',props:{bites:'0'}},{name:'minecraft:cake',props:{bites:'3'}},{name:'minecraft:daylight_detector',props:{inverted:'true'}},
 {name:'minecraft:cauldron'},{name:'minecraft:water_cauldron',props:{level:'1'}},{name:'minecraft:water_cauldron',props:{level:'3'}},{name:'minecraft:lava_cauldron'},{name:'minecraft:powder_snow_cauldron',props:{level:'3'}}
];
const gallery=schematic('Partial Gallery',states,48,45),small=schematic('Partial Detail',detail,15,15,true);
writeFileSync('public/fixtures/partial-gallery.litematic',gallery);writeFileSync('public/fixtures/partial-detail.litematic',small);
const reports=[];for(const [file,bytes] of [['partial-gallery',gallery],['partial-detail',small]] as const){const s=await parseLitematic(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length) as ArrayBuffer);reports.push({file:file+'.litematic',totalBlocks:s.totalBlocks,materials:s.materials,missingTextures:textureDiagnostics(s.states),states:s.states.filter(s=>s.name!=='minecraft:air').map(s=>({state:s.key,faces:Object.fromEntries(faces.map(f=>[f,surfaceFor(s,f)])),boxes:modelFor(s).boxes,quads:modelFor(s).quads}))});}
writeFileSync('public/textures/partial-mapping-report.json',JSON.stringify(reports,null,2));console.log({states:states.length,reports:reports.map(r=>({file:r.file,blocks:r.totalBlocks,missing:r.missingTextures.length}))});
