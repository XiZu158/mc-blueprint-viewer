import type { BlockState } from './types';
import {pistonModel,type ModelQuad} from './piston-model';
import {partialModel} from './partial-models';
import {lightModel} from './light-models';
import {furnishingModel} from './furnishing-models';
import {controlModel} from './control-models';
import {fluidKind} from './fluid-model';
export type Box = [number,number,number,number,number,number];
export interface Model { boxes: Box[]; full: boolean; transparent: boolean; fallback: boolean; color: [number,number,number]; endAxis?:number; quads?:ModelQuad[] }
const rgb=(hex:number):[number,number,number] => [hex>>16&255,hex>>8&255,hex&255].map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}) as [number,number,number];
export function blockColor(name:string):[number,number,number] {
  const n=name.split(':')[1]??name;
  const dyes:Record<string,number>={white:0xe8e6de,orange:0xd87927,magenta:0xb64ac2,light_blue:0x5bafd1,yellow:0xe6c13b,lime:0x84bb3d,pink:0xda8fa4,gray:0x4c5154,light_gray:0x999a91,cyan:0x24979d,purple:0x8049b8,blue:0x4059ad,brown:0x785135,green:0x586d30,red:0xa33f36,black:0x24272b};
  for(const d of Object.keys(dyes).sort((a,b)=>b.length-a.length))if(n.startsWith(d+'_'))return rgb(dyes[d]);
  const colors:[RegExp,number][]=[[/diamond|prismarine/,0x61c8bf],[/emerald/,0x4ac482],[/gold/,0xe6bd45],[/copper/,0xb97752],[/iron|quartz|calcite|snow/,0xdfdfd9],[/water|ice/,0x4a9acb],[/lava|magma/,0xf57e34],[/glass/,0x8ed8dd],[/grass|moss|leaves/,0x719657],[/deepslate|blackstone|coal/,0x424955],[/brick|granite/,0xad7264],[/sand|birch|end_stone/,0xdbcc9d],[/dark_oak|spruce/,0x715a3e],[/cherry/,0xd9ada8],[/mangrove/,0x884d47],[/warped/,0x467e7e],[/crimson/,0x7d3d53],[/oak|wood|planks|log|fence|barrel|chest/,0xb09061],[/dirt|mud|farmland/,0x8b6850],[/stone|andesite|cobble|gravel|furnace/,0x91999e],[/obsidian|netherite/,0x3e3456],[/redstone|netherrack/,0x9d4140],[/concrete|terracotta|wool/,0xbfb9ab]];
  if(/stone_brick|stone_bricks/.test(n))return rgb(0x929b9f);
  if(/piston/.test(n))return rgb(0x9b8969);if(/anvil|hopper|cauldron/.test(n))return rgb(0x44484a);if(/repeater|comparator/.test(n))return rgb(0xc5c5b8);if(n==='redstone_wire')return rgb(0xa42c21);if(n==='cake')return rgb(0xe0c5b6);if(n==='daylight_detector')return rgb(0x937952);
  for(const [pattern,c] of colors)if(pattern.test(n))return rgb(c);
  return rgb(0xb08cd4);
}
function rotate(b:Box,r:number):Box { let c=b;for(let i=0;i<r;i++)c=[1-c[5],c[1],c[0],1-c[2],c[4],c[3]];return c; }
export function modelFor(s:BlockState):Model {
  const n=s.name.split(':')[1]??s.name,p=s.properties;
  if(fluidKind(s)){
    // Representative volume for inventory icons; the Worker builds the actual neighbor-aware surface.
    const level=Math.max(0,Math.min(15,Number(p.level)||0)),height=(8-(level>=8?0:level))/9;
    return {boxes:[[0,0,0,1,height,1]],full:false,transparent:true,fallback:false,color:blockColor(s.name)};
  }
  const detailed=controlModel(s)??pistonModel(s)??partialModel(s)??lightModel(s)??furnishingModel(s);if(detailed)return {...detailed,full:false,transparent:false,fallback:false,color:blockColor(s.name)};
  const facing=({north:0,east:1,south:2,west:3} as Record<string,number>)[p.facing]??0;
  let boxes:Box[]=[[0,0,0,1,1,1]],full=true,fallback=false;
  const transparent=/glass|ice|water|bubble_column|leaves|slime|honey/.test(n);
  if(['anvil','chipped_anvil','damaged_anvil'].includes(n)&&s.name.startsWith('minecraft:')) {
    full=false;boxes=[[.125,0,.125,.875,.25,.875],[.25,.25,.1875,.75,.3125,.8125],[.375,.3125,.25,.625,.625,.75],[.1875,.625,0,.8125,1,1]];boxes=boxes.map(b=>rotate(b,facing));
  } else if(n.endsWith('_slab')) {
    if(p.type!=='double'){boxes=[p.type==='top'?[0,.5,0,1,1,1]:[0,0,0,1,.5,1]];full=false;}
  } else if(n.endsWith('_stairs')) {
    full=false; boxes=[[0,0,0,1,.5,1]];
    const shape=p.shape??'straight';
    if(shape.startsWith('outer'))boxes.push(shape==='outer_left'?[0,.5,0,.5,1,.5]:[.5,.5,0,1,1,.5]);
    else { boxes.push([0,.5,0,1,1,.5]);if(shape==='inner_left')boxes.push([0,.5,.5,.5,1,1]);if(shape==='inner_right')boxes.push([.5,.5,.5,1,1,1]); }
    if(p.half==='top')boxes=boxes.map(b=>[b[0],1-b[4],b[2],b[3],1-b[1],b[5]]);
    boxes=boxes.map(b=>rotate(b,facing));
  } else if(n.endsWith('_trapdoor')) {
    full=false;boxes=p.open==='true'?[[0,0,0,1,1,.1875]]:p.half==='top'?[[0,.8125,0,1,1,1]]:[[0,0,0,1,.1875,1]];boxes=boxes.map(b=>rotate(b,facing));
  } else if(n.endsWith('_door')) {
    full=false;
    // Closed north door occupies its south boundary. Open rotation respects hinge.
    boxes=[[0,0,.8125,1,1,1]];
    boxes=boxes.map(b=>rotate(b,(facing+(p.open==='true'?(p.hinge==='right'?3:1):0))%4));
  } else if(n.endsWith('_fence')||n.endsWith('_wall')) {
    full=false;const wall=n.endsWith('_wall');boxes=wall?[[.25,0,.25,.75,1,.75]]:[[.375,0,.375,.625,1,.625]];
    for(const [dir,r] of Object.entries({north:0,east:1,south:2,west:3}))if(p[dir]&&p[dir]!=='false'&&p[dir]!=='none') {
      if(wall)boxes.push(rotate([.3125,0,0,.6875,p[dir]==='tall'?1:.8125,.5],r));
      else for(const y of [.375,.75])boxes.push(rotate([.4375,y,0,.5625,y+.1875,.5],r));
    }
  } else if(n.endsWith('_pane')||n==='iron_bars') {
    full=false;boxes=[[.4375,0,.4375,.5625,1,.5625]];
    for(const [dir,r] of Object.entries({north:0,east:1,south:2,west:3}))if(p[dir]==='true')boxes.push(rotate([.4375,0,0,.5625,1,.5],r));
  } else if(n.endsWith('_fence_gate')) {
    full=false;boxes=p.open==='true'?[[0,.3,.375,.1875,1,.625],[.8125,.3,.375,1,1,.625]]:[[0,.3,.375,1,1,.625]];boxes=boxes.map(b=>rotate(b,facing));
  } else if(n.endsWith('_carpet')) {full=false;boxes=[[0,0,0,1,.0625,1]];}
  else if(n==='snow') {const h=Math.max(1,Math.min(8,Number(p.layers)||1))/8;full=h===1;boxes=[[0,0,0,1,h,1]];}
  else if(n.endsWith('_bed')){full=false;boxes=[[0,0,0,1,.5625,1]];}
  else if(n.endsWith('_torch')||n==='torch') {full=false;boxes=[[.4375,0,.4375,.5625,.625,.5625]];}
  else if(n==='chain') {full=false;boxes=p.axis==='x'?[[0,.4375,.4375,1,.5625,.5625]]:p.axis==='z'?[[.4375,.4375,0,.5625,.5625,1]]:[[.4375,0,.4375,.5625,1,.5625]];}
  else if(n.endsWith('_button')) {full=false;boxes=[[.3125,.375,.875,.6875,.625,1]];boxes=boxes.map(b=>rotate(b,facing));}
  else if(n.endsWith('_pressure_plate')){full=false;boxes=[[.0625,0,.0625,.9375,.0625,.9375]];}
  else if(!/^minecraft:/.test(s.name)||!/(stone|dirt|grass|planks|log|wood|concrete|terracotta|wool|glass|brick|ore|block|sand|gravel|leaves|ice|water|lava|quartz|obsidian|bedrock|netherrack|prismarine|basalt|deepslate|blackstone|calcite|tuff|mud|moss|snow|furnace|chest|barrel|bookshelf|crafting_table|melon|pumpkin|sea_lantern|glowstone|end_stone|sponge)/.test(n))fallback=true;
  const endAxis=/log|stem|pillar|basalt|hay_block|bone_block/.test(n)?({x:0,y:1,z:2} as Record<string,number>)[p.axis??'y']:undefined;
  if(n==='bubble_column'&&s.name.startsWith('minecraft:'))fallback=false;
  return {boxes,full,transparent,fallback,color:blockColor(s.name),endAxis};
}
