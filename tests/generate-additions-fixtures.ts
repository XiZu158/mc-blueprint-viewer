import {writeFileSync} from 'node:fs';
import {fixture,t,type FixtureRegion,type Tag} from './fixture';
import {orientPiston} from '../src/core/piston-model';
import {parseLitematic} from '../src/core/litematic';
import {textureDiagnostics} from '../src/core/textures';
const w=28,h=7,d=24,palette:FixtureRegion['palette']=[{name:'minecraft:air'}],values=Array(w*h*d).fill(0),entities:Record<string,Tag>[]=[];
function put(x:number,y:number,z:number,name:string,props:Record<string,string>={}){const index=x+z*w+y*w*d;if(values[index])throw Error('Fixture collision');values[index]=palette.length;palette.push({name:'minecraft:'+name,props});}
for(let z=0;z<d;z++)for(let x=0;x<w;x++)put(x,0,z,'stone');
for(let level=0;level<=8;level++)put(1+3*level,1,3,'composter',{level:String(level)});
for(let i=0;i<6;i++){put(2+4*i,1,7,'honey_block');put(2+4*i,1,8,['white','red','blue','lime','purple','white'][i]+'_wool');}
for(const [x,name]of [[2,'bubble_column'],[6,'bubble_column'],[10,'water']] as const)for(let y=1;y<=4;y++)put(x,y,11,name,name==='bubble_column'?{drag:x===2?'true':'false'}:{level:'0'});
put(14,1,11,'glass');put(18,1,11,'chest',{facing:'north',type:'single'});put(22,1,11,'fixture_missing');
const facings=['down','up','north','south','west','east'],support:Record<string,number[]>={down:[0,1,0],up:[0,-1,0],north:[0,0,1],south:[0,0,-1],west:[1,0,0],east:[-1,0,0]};
for(let row=0;row<2;row++)facings.forEach((facing,i)=>{const x=3+4*i,y=2,z=16+4*row,c=orientPiston([.5,.5,.96875],facing),p=c.map((v,a)=>v+[x,y,z][a]);const delta=support[facing];put(x+delta[0],y+delta[1],z+delta[2],'stone');
 entities.push({id:t.str(row?'minecraft:glow_item_frame':'minecraft:item_frame'),Pos:t.list(6,p),Facing:{type:1,value:i},ItemRotation:{type:1,value:i},Item:t.compound({id:t.str('minecraft:diamond'),Count:{type:1,value:1}}),TileX:t.int(10000),TileY:t.int(10000),TileZ:t.int(10000)});
});
const second:FixtureRegion={name:'Negative Frame',position:[45,5,-12],size:[-4,-4,-4],palette:[{name:'minecraft:air'},{name:'minecraft:stone'}],values:Array(64).fill(0),entities:[{id:t.str('minecraft:item_frame'),Pos:t.list(6,[-1.5,-1.5,-1.03125]),Facing:{type:1,value:2},TileX:t.int(9999),TileY:t.int(9999),TileZ:t.int(9999)}]};second.values[0]=1;
const bytes=fixture([{name:'Additions Gallery',position:[0,0,0],size:[w,h,d],palette,values,entities},second],true,'Honey · Composter · Frames');
writeFileSync('public/fixtures/additions-gallery.litematic',bytes);
const s=await parseLitematic(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length) as ArrayBuffer);
writeFileSync('public/textures/additions/mapping-report.json',JSON.stringify({file:'additions-gallery.litematic',blocks:s.totalBlocks,entities:s.totalEntities,blockInventory:s.materials,entityInventory:s.entityMaterials,missingTextures:textureDiagnostics(s.states),framePositions:s.regions.flatMap(r=>r.frames??[])},null,2));
console.log({blocks:s.totalBlocks,entities:s.totalEntities,missing:textureDiagnostics(s.states).length});
const detail:FixtureRegion={name:'Detail',position:[-8,0,-6],size:[16,6,12],palette:[{name:'minecraft:air'}],values:Array(16*6*12).fill(0),entities:[]};
const set=(x:number,y:number,z:number,name:string,props:Record<string,string>={})=>{detail.values[x+z*16+y*192]=detail.palette.length;detail.palette.push({name:'minecraft:'+name,props});};
for(let z=0;z<12;z++)for(let x=0;x<16;x++)set(x,0,z,'stone');
for(const [x,level]of [[2,0],[6,4],[10,8]])set(x,1,2,'composter',{level:String(level)});
for(const [x,color]of [[2,'red'],[6,'white']] as const){set(x,1,6,'honey_block');set(x,1,7,color+'_wool');}
for(let y=1;y<4;y++){set(10,y,6,'bubble_column',{drag:'false'});set(12,y,6,'water',{level:'0'});}
for(const [x,y,z,facing]of [[4,2,10,'north'],[8,1,10,'up'],[12,2,10,'east']] as const){const c=orientPiston([.5,.5,.96875],facing),delta=support[facing];set(x+delta[0],y+delta[1],z+delta[2],'stone');detail.entities!.push({id:t.str('minecraft:item_frame'),Pos:t.list(6,c.map((v,a)=>v+[x,y,z][a])),Facing:{type:1,value:facings.indexOf(facing)}});}
writeFileSync('public/fixtures/additions-detail.litematic',fixture([detail],true,'贴图细节 · Texture Detail'));
