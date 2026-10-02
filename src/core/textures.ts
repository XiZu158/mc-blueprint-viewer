import {textureManifest} from '../generated/texture-manifest';
import type {BlockState} from './types';
export type Face='west'|'east'|'down'|'up'|'north'|'south';
export const faces:Face[]=['west','east','down','up','north','south'];
export const textureByName=new Map(textureManifest.map(a=>[a.name,a]));
export interface Surface { id:number; texture:string; missing:boolean; tint:[number,number,number]; opacity:number; layer:0|1|2 }
const woods=['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak','crimson','warped','bamboo'];
const facingFaces:Record<string,Face>={north:'north',south:'south',east:'east',west:'west',up:'up',down:'down'};
const aliases:Record<string,string>={stone_brick:'stone_bricks',brick:'bricks',nether_brick:'nether_bricks',end_stone_brick:'end_stone_bricks',prismarine_brick:'prismarine_bricks',deepslate_brick:'deepslate_bricks',deepslate_tile:'deepslate_tiles',mud_brick:'mud_bricks',tuff_brick:'tuff_bricks',quartz:'quartz_block',purpur:'purpur_block',snow_block:'snow',grass:'short_grass',chain:'iron_chain',wall_torch:'torch',redstone_wall_torch:'redstone_torch',soul_wall_torch:'soul_torch',petrified_oak:'oak_planks',mossy_stone_brick:'mossy_stone_bricks',polished_blackstone_brick:'polished_blackstone_bricks',resin_brick:'resin_bricks',red_nether_brick:'red_nether_bricks'};
const axisFaces=(axis:string):Face[]=>axis==='x'?['west','east']:axis==='z'?['north','south']:['up','down'];
function baseName(n:string):string {
  const base=n.replace(/_(stairs|slab|wall|fence_gate|fence|button|pressure_plate)$/,'');
  return woods.includes(base)?base+'_planks':aliases[base]??base;
}
export function textureName(s:BlockState,face:Face):string {
  if(!s.name.startsWith('minecraft:'))return '__missing__';
  const n=s.name.slice(10).replace(/^waxed_/,''),p=s.properties,up=face==='up',down=face==='down',front=face===(facingFaces[p.facing]??(n==='barrel'?'up':'north'));
  if(n==='air'||n==='cave_air'||n==='void_air')return '__missing__';
  if(n==='bubble_column')return up||down?'water_still':'water_flow';
  if(n==='fire'||n==='soul_fire')return n+'_0';
  if(n.endsWith('_sign'))return 'user_spruce_sign_board';
  if(n==='scaffolding')return 'user_scaffold_'+({up:'top',down:'bottom',north:'front',south:'back',west:'left',east:'right'} as Record<Face,string>)[face];
  if(/^(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_carpet$/.test(n))return n.replace(/_carpet$/,'_wool');
  if(n==='honey_block'||n==='composter')return 'user_'+(n==='honey_block'?'honey':'composter')+'_'+({up:'top',down:'bottom',north:'front',south:'back',west:'left',east:'right'} as Record<Face,string>)[face];
  if(n==='item_frame'||n==='glow_item_frame')return front?'user_item_frame_front':'oak_planks';
  if(n==='grass_block')return up?'grass_block_top':down?'dirt':p.snowy==='true'?'grass_block_snow':'grass_block_side';
  if(n==='dirt_path')return up?'dirt_path_top':down?'dirt':'dirt_path_side';
  if(n==='podzol'||n==='mycelium')return up?n+'_top':down?'dirt':n+'_side';
  if(n==='farmland')return up?(Number(p.moisture)>0?'farmland_moist':'farmland'):'dirt';
  if(n.endsWith('_nylium'))return up?n:down?'netherrack':n+'_side';
  if(/(?:_log|_stem|bamboo_block)$/.test(n))return axisFaces(p.axis??'y').includes(face)?n+'_top':n;
  if(n.endsWith('_wood'))return n.replace(/_wood$/,'_log');
  if(n.endsWith('_hyphae'))return n.replace(/_hyphae$/,'_stem');
  if(['basalt','polished_basalt','deepslate','bone_block','hay_block','quartz_pillar','purpur_pillar'].includes(n)){
    const end=axisFaces(p.axis??'y').includes(face);
    return n==='deepslate'?(end?'deepslate_top':'deepslate'):n.includes('basalt')?n+(end?'_top':'_side'):n==='bone_block'||n==='hay_block'?n+(end?'_top':'_side'):n==='purpur_pillar'?(end?'purpur_pillar_top':'purpur_pillar'):end?n+'_top':n;
  }
  if(['furnace','blast_furnace','smoker'].includes(n))return down&&n==='smoker'?'smoker_bottom':up||down?n+'_top':front?n+'_front'+(p.lit==='true'?'_on':''):n+'_side';
  if(n==='crafting_table')return up?'crafting_table_top':down?'oak_planks':face==='north'||face==='west'?'crafting_table_front':'crafting_table_side';
  if(n==='bookshelf')return up||down?'oak_planks':'bookshelf';
  if(n==='barrel')return front?'barrel_top'+(p.open==='true'?'_open':''):face===opposite(facingFaces[p.facing]??'up')?'barrel_bottom':'barrel_side';
  if(n==='dispenser'||n==='dropper')return front?n+'_front'+(up||down?'_vertical':''):up||down?'furnace_top':'furnace_side';
  if(n==='observer')return front?'observer_front':face===opposite(facingFaces[p.facing]??'south')?'observer_back'+(p.powered==='true'?'_on':''):up||down?'observer_top':'observer_side';
  if(n==='piston_head')return front?p.type==='sticky'?'piston_top_sticky':'piston_top':face===opposite(facingFaces[p.facing]??'north')?'piston_top':'piston_side';
  if(n==='piston'||n==='sticky_piston')return front?p.extended==='true'?'piston_inner':n==='sticky_piston'?'piston_top_sticky':'piston_top':face===opposite(facingFaces[p.facing]??'north')?'piston_bottom':'piston_side';
  if(n==='anvil'||n==='chipped_anvil'||n==='damaged_anvil')return up?n+'_top':'anvil';
  if(n==='repeater'||n==='comparator')return up?n+(p.powered==='true'?'_on':''):'smooth_stone';
  if(n==='ender_chest'){if(up)return 'user_ender_top';if(down)return 'user_ender_bottom';const r=({north:0,east:1,south:2,west:3} as Record<string,number>)[p.facing]??0,index=['north','east','south','west'].indexOf(face);return 'user_ender_'+['front','right','back','left'][(index-r+4)%4];}
  if(n==='chest'||n==='trapped_chest'){if(up)return 'user_chest_top';if(down)return 'user_chest_bottom';const r=({north:0,east:1,south:2,west:3} as Record<string,number>)[p.facing]??0,index=['north','east','south','west'].indexOf(face);return 'user_chest_'+['front','right','back','left'][(index-r+4)%4];}
  if(n==='hopper')return up?'hopper_top':down?'hopper_inside':'hopper_outside';
  if(n==='rail')return ['north_south','east_west'].includes(p.shape)||p.shape?.startsWith('ascending')||!p.shape?'rail':'rail_corner';
  if(['powered_rail','detector_rail','activator_rail'].includes(n))return n+(p.powered==='true'?'_on':'');
  if(n==='redstone_wire')return 'redstone_dust_dot';
  if(n==='lever')return face==='up'?'lever':'cobblestone';
  if(n==='redstone_torch'||n==='redstone_wall_torch')return p.lit==='false'?'redstone_torch_off':'redstone_torch';
  if(n==='copper_wall_torch')return 'copper_torch';
  if(n==='heavy_weighted_pressure_plate')return 'iron_block';if(n==='light_weighted_pressure_plate')return 'gold_block';
  if(n==='cake')return up?'cake_top':down?'cake_bottom':face==='west'&&Number(p.bites)>0?'cake_inner':'cake_side';
  if(n==='daylight_detector')return up?(p.inverted==='true'?'daylight_detector_inverted_top':'daylight_detector_top'):'daylight_detector_side';
  if(['cauldron','water_cauldron','lava_cauldron','powder_snow_cauldron'].includes(n))return up?'cauldron_top':down?'cauldron_bottom':'cauldron_side';
  if(n==='bee_nest'||n==='beehive')return up?n==='beehive'?'beehive_end':'bee_nest_top':down?n==='beehive'?'beehive_end':'bee_nest_bottom':front?n+'_front'+(Number(p.honey_level)>=5?'_honey':''):n+'_side';
  if(n==='pumpkin'||n==='carved_pumpkin'||n==='jack_o_lantern')return up||down?'pumpkin_top':front&&n!=='pumpkin'?n:'pumpkin_side';
  if(n==='melon')return up||down?'melon_top':'melon_side';
  if(['tnt','cactus','ancient_debris','target'].includes(n))return n+(up?'_top':down?(n==='ancient_debris'||n==='target'?'_top':'_bottom'):'_side');
  if(n==='red_mushroom_block'||n==='brown_mushroom_block'||n==='mushroom_stem')return p[face]==='false'?'mushroom_block_inside':n;
  if(n==='water'||n==='lava')return n+(up||down?'_still':'_flow');
  if(n==='glass_pane')return up||down?'glass_pane_top':'glass';
  if(n.endsWith('_stained_glass_pane'))return up||down?n+'_top':n.replace(/_pane$/,'');
  if(n.endsWith('_door'))return n+(p.half==='upper'?'_top':'_bottom');
  if(n.endsWith('_trapdoor'))return n;
  if(n==='large_fern'||n==='tall_grass'||n==='tall_seagrass')return n+(p.half==='upper'?'_top':'_bottom');
  if(n==='snow')return 'snow';
  if(/_(stairs|slab|wall|fence_gate|fence|button|pressure_plate)$/.test(n)){
    const b=baseName(n);
    if(b==='smooth_stone')return up||down?'smooth_stone':'smooth_stone_slab_side';
    if(b==='quartz_block')return up?'quartz_block_top':down?'quartz_block_bottom':'quartz_block_side';
    if(b==='smooth_quartz')return 'quartz_block_bottom';
    if(b==='smooth_sandstone'||b==='smooth_red_sandstone')return b.replace('smooth_','')+'_top';
    if(b==='blackstone')return up||down?'blackstone_top':'blackstone';
    if(b==='sandstone'||b==='red_sandstone')return b+(up?'_top':down?'_bottom':'');
    if(b==='cut_sandstone'||b==='cut_red_sandstone')return up?b.replace('cut_','')+'_top':down?b.replace('cut_','')+'_bottom':b;
    if(n==='nether_brick_fence')return 'nether_bricks';
    return b;
  }
  if(n==='quartz_block')return up?'quartz_block_top':down?'quartz_block_bottom':'quartz_block_side';
  if(n==='smooth_quartz')return 'quartz_block_bottom';
  if(n==='chiseled_quartz_block')return up||down?'chiseled_quartz_block_top':n;
  if(n==='blackstone')return up||down?'blackstone_top':n;
  if(n==='sandstone'||n==='red_sandstone')return n+(up?'_top':down?'_bottom':'');
  if(n==='smooth_sandstone'||n==='smooth_red_sandstone')return n.replace('smooth_','')+'_top';
  if(/^(cut_|chiseled_)(red_)?sandstone$/.test(n)){const b=n.replace(/^(cut_|chiseled_)/,'');return up?b+'_top':down?b+'_bottom':n;}
  return aliases[n]??n;
}
export function opposite(face:Face):Face{return ({west:'east',east:'west',up:'down',down:'up',north:'south',south:'north'} as Record<Face,Face>)[face];}
function linear(hex:number):[number,number,number]{return [hex>>16&255,hex>>8&255,hex&255].map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}) as [number,number,number];}
export function surfaceFor(s:BlockState,face:Face,textureOverride?:string):Surface {
  const name=textureOverride??textureName(s,face),found=textureByName.get(name),asset=found??textureManifest[0],n=s.name.slice(10);
  let tint:[number,number,number]=[1,1,1];
  // Tint only grayscale assets. Colored replacement-pack leaves/grass must not be tinted again.
  if(asset.grayscale){
    if(name==='grass_block_top'||name==='grass_block_side_overlay'||/^(short_grass|tall_grass|fern|large_fern|vine)/.test(name))tint=linear(0x91bd59);
    else if(n.endsWith('_leaves')&&!/cherry|azalea|pale_oak/.test(n))tint=linear(n==='spruce_leaves'?0x619961:n==='birch_leaves'?0x80a755:0x77ab2f);
    else if(name==='water_still'||name==='water_flow')tint=linear(0x3f76e4);
    else if(n==='redstone_wire'){const f=Math.max(0,Math.min(15,Number(s.properties.power)||0))/15,r=f>0?f*.6+.4:.3,g=Math.max(0,f*f*.7-.5),b=Math.max(0,f*f*.6-.7);tint=linear((Math.round(r*255)<<16)|(Math.round(g*255)<<8)|Math.round(b*255));}
  }
  if(n==='trapped_chest'&&name.startsWith('user_chest_lock'))tint=linear(0xffa09b);
  const water=name==='water_still'||name==='water_flow',honey=n==='honey_block',translucent=water||honey||n==='ice'||n==='frosted_ice'||n==='tinted_glass'||asset.alpha==='blend';
  const layer:0|1|2=translucent?2:asset.alpha==='cutout'?1:0;
  const opacity=water?.7:honey?(name==='user_honey_inner'?.85:.48):n==='ice'||n==='frosted_ice'?.65:n==='tinted_glass'?.35:1;
  return {id:asset.id,texture:asset.name,missing:!found||asset.id===0,tint,opacity:found?opacity:1,layer:found?layer:0};
}
const rotation=(s:BlockState)=>({north:0,east:1,south:2,west:3} as Record<string,number>)[s.properties.facing]??0;
export function faceUv(s:BlockState,axis:number,sign:number,point:number[]):[number,number] {
  let [x,y,z]=point,nx=axis===0?sign:0,nz=axis===2?sign:0;
  // The geometry already rotates with block states. Invert that rotation for its texture coordinates.
  for(let i=0;i<rotation(s);i++){[x,z]=[z,1-x];[nx,nz]=[nz,-nx];}
  let uv:[number,number]=axis===1?[x,sign>0?1-z:z]:nx!==0?[nx>0?1-z:z,y]:[nz>0?x:1-x,y];
  const n=s.name.slice(10),a=s.properties.axis;
  if(/log|stem|basalt|pillar|hay_block|bone_block/.test(n)&&a&&a!=='y'){
    const end=axis===(a==='x'?0:2);
    if(!end&&(axis!==1||a==='x'))uv=[1-uv[1],uv[0]];
  }
  // Open doors rotate an additional quarter turn around their hinge.
  if(n.endsWith('_door')&&s.properties.open==='true'&&axis!==1&&Math.abs(nx)+Math.abs(nz)>0){
    // Width along the open panel, rather than along its 3/16-thick edge.
    const r=(rotation(s)+(s.properties.hinge==='right'?3:1))%4;
    const [px,py,pz]=point;let lx=px,lz=pz;for(let i=0;i<r;i++)[lx,lz]=[lz,1-lx];
    uv=[lx,py];
  }
  if(n.endsWith('_door')&&s.properties.hinge==='right')uv[0]=1-uv[0];
  return uv;
}
export function textureDiagnostics(states:BlockState[],models?:{quads?:ModelQuadDiagnostic[]}[]){
  return states.flatMap((s,id)=>{
    if(['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(s.name))return [];
    const detailed=models?.[id]?.quads;
    const entries=detailed?.length?detailed.map(q=>({face:faces[q.axis*2+(q.sign>0?1:0)],texture:q.texture})):faces.map(face=>({face,texture:textureName(s,face)}));
    const missing=entries.filter(e=>surfaceFor(s,e.face,e.texture).missing);
    return missing.length?[{state:s.key,faces:[...new Set(missing.map(e=>e.face))],requested:[...new Set(missing.map(e=>e.texture==='__missing__'?s.name:e.texture))]}]:[];
  });
}
type ModelQuadDiagnostic={axis:number;sign:number;texture:string};
