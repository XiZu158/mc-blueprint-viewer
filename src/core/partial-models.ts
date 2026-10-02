import type {BlockState,Vec3} from './types';import type {Box} from './models';
import {elementModel,orientPiston,type ModelPart,type FaceSpec,type ModelQuad} from './piston-model';
import {faces,textureName,type Face} from './textures';
const unit=(box:number[])=>box.map(v=>v/16) as Box;
// Default cuboid UVs use world texel coordinates; explicit rectangles override tiny element faces.
function part(box:Box,side:string,top=side,bottom=side):ModelPart {
 const [x,y,z,X,Y,Z]=box,uvs:Record<Face,[number,number,number,number]>={west:[z,1-Y,Z,1-y],east:[1-Z,1-Y,1-z,1-y],down:[x,1-Z,X,1-z],up:[x,z,X,Z],north:[1-X,1-Y,1-x,1-y],south:[x,1-Y,X,1-y]};
 return {box,faces:Object.fromEntries(faces.map(f=>[f,{texture:f==='up'?top:f==='down'?bottom:side,uv:uvs[f].map(v=>v*16)}]))};
}
function torch(x:number,z:number,lit:boolean,height=5):ModelPart {
 const texture=lit?'redstone_torch':'redstone_torch_off',side:FaceSpec={texture,uv:[7,6,9,6+height]};
 return {box:unit([x,2,z,x+2,2+height,z+2]),faces:{up:{texture,uv:[7,6,9,8]},north:side,south:side,east:side,west:side}};
}
function circuit(s:BlockState){
 const repeater=s.name==='minecraft:repeater',p=s.properties,powered=p.powered==='true',top=(repeater?'repeater':'comparator')+(powered?'_on':'');
 const base=part([0,0,0,1,.125,1],'smooth_stone',top),parts:ModelPart[]=[base];
 if(repeater){
   const delay=Math.max(1,Math.min(4,Number(p.delay)||1)),z=4+2*delay;
   parts.push(torch(7,2,powered));
   if(p.locked==='true')parts.push(part(unit([2,2,z,14,4,z+2]),'bedrock'));else parts.push(torch(7,z,powered));
 }else{parts.push(torch(4,11,powered),torch(10,11,powered),torch(7,2,p.mode==='subtract',p.mode==='subtract'?3:5));}
 return elementModel(parts,p.facing);
}
function chest(s:BlockState){
 const type=s.name==='minecraft:ender_chest'?'single':s.properties.type??'single',left=type==='left',right=type==='right',lo=right?0:1,hi=left?16:15;
 const body=unit([lo,0,1,hi,10,15]),lid=unit([lo,10,1,hi,14,15]),latch=unit([left?15:right?0:7,8,0,left?16:right?1:9,12,2]);
 const prefix=s.name==='minecraft:ender_chest'?'user_ender_':'user_chest_';
 const wood=(box:Box,y0:number,y1:number):ModelPart=>{
   const front=left?[8,16]:right?[0,8]:[0,16],back=left?[0,8]:right?[8,16]:[0,16],horizontal=left?[0,8]:right?[8,16]:[0,16],v0=(14-y1)/14*16,v1=(14-y0)/14*16;
   const side=(name:string,u=[0,16]):FaceSpec=>({texture:prefix+name,uv:[u[0],v0,u[1],v1]});
   const spec:Partial<Record<Face,FaceSpec>>={north:side('front',front),south:side('back',back),west:side('left'),east:side('right'),up:{texture:prefix+'top',uv:[horizontal[0],0,horizontal[1],16]},down:{texture:prefix+'bottom',uv:[horizontal[0],0,horizontal[1],16]}};
   if(left)delete spec.east;if(right)delete spec.west; // omit the double chest's internal joining wall
   return {box,faces:spec};
 };
 const lock=part(latch,prefix+'lock_side',prefix+'lock_front'),u=left?[8,16]:right?[0,8]:[0,16];
 lock.faces.north={texture:prefix+'lock_front',uv:[u[0],0,u[1],16]};
 const parts=[wood(body,0,10),wood(lid,10,14),lock];
 return elementModel(parts,s.properties.facing);
}
function hopper(s:BlockState){
 const parts=[part(unit([0,10,0,16,11,16]),'hopper_outside','hopper_inside','hopper_inside'),part(unit([0,11,0,2,16,16]),'hopper_outside','hopper_top'),part(unit([14,11,0,16,16,16]),'hopper_outside','hopper_top'),part(unit([2,11,0,14,16,2]),'hopper_outside','hopper_top'),part(unit([2,11,14,14,16,16]),'hopper_outside','hopper_top'),part(unit([4,4,4,12,10,12]),'hopper_outside','hopper_inside','hopper_inside')];
 const down=s.properties.facing==='down'||!s.properties.facing;
 parts.push(part(unit(down?[6,0,6,10,4,10]:[6,4,0,10,8,4]),'hopper_outside','hopper_outside','hopper_inside'));
 return elementModel(parts,down?'north':s.properties.facing);
}
function rail(s:BlockState){
 const p=s.properties,n=s.name.slice(10),shape=p.shape??'north_south',corner=shape.includes('_')&&!shape.startsWith('ascending')&&!['north_south','east_west'].includes(shape);
 const texture=n==='rail'?(corner?'rail_corner':'rail'):n+(p.powered==='true'?'_on':'');
 const rotation:Record<string,string>={north_south:'north',east_west:'east',south_east:'north',south_west:'east',north_west:'south',north_east:'west',ascending_north:'north',ascending_east:'east',ascending_south:'south',ascending_west:'west'};
 const ascending=shape.startsWith('ascending'),points:Vec3[]=[[0,ascending?1.0625:.0625,0],[0,.0625,1],[1,.0625,1],[1,ascending?1.0625:.0625,0]],facing=rotation[shape]??'north';
 const raw:Vec3=ascending?[0,Math.SQRT1_2,Math.SQRT1_2]:[0,1,0],center=orientPiston([.5,.5,.5],facing),normal=orientPiston([raw[0]+.5,raw[1]+.5,raw[2]+.5],facing).map((v,i)=>v-center[i]) as Vec3;
 const quads:ModelQuad[]=[{points:points.map(p=>orientPiston(p,facing)),uv:[[0,1],[0,0],[1,0],[1,1]],axis:1,sign:1,texture,normal}];
 return {boxes:[[0,0,0,1,ascending?1.0625:.0625,1] as Box],quads};
}
function wire(s:BlockState){
 const parts:ModelPart[]=[{box:[0,.015625,0,1,.015625,1],faces:{up:{texture:'redstone_dust_dot',uv:[0,0,16,16]}}}],model=elementModel(parts);
 for(const [i,face] of (['north','east','south','west'] as const).entries())if(s.properties[face]&&s.properties[face]!=='none'){
   const y=.015725+i*.0001,arm=elementModel([{box:[0,y,0,1,y,.5],faces:{up:{texture:'redstone_dust_line0',uv:[0,0,16,8]}}}],face);model.quads.push(...arm.quads);
   if(s.properties[face]==='up'){const rise=elementModel([{box:[0,0,.001,1,1,.001],faces:{south:{texture:'redstone_dust_line0',uv:[0,0,16,16]}}}],face);model.quads.push(...rise.quads);}
 }
 return model;
}
function cauldron(s:BlockState){
 const parts=[part(unit([2,3,2,14,4,14]),'cauldron_side','cauldron_inner','cauldron_bottom'),part(unit([0,3,0,2,16,16]),'cauldron_side','cauldron_top'),part(unit([14,3,0,16,16,16]),'cauldron_side','cauldron_top'),part(unit([2,3,0,14,16,2]),'cauldron_side','cauldron_top'),part(unit([2,3,14,14,16,16]),'cauldron_side','cauldron_top')];
 for(const x of [0,12])for(const z of [0,12])parts.push(part(unit([x,0,z,x+4,3,z+4]),'cauldron_side','cauldron_side','cauldron_bottom'));
 const n=s.name.slice(10);if(n!=='cauldron'){const y=n==='lava_cauldron'?15/16:(6+3*Math.max(1,Math.min(3,Number(s.properties.level)||1)))/16;parts.push({box:[.125,y,.125,.875,y,.875],faces:{up:{texture:n==='water_cauldron'?'water_still':n==='lava_cauldron'?'lava_still':'snow',uv:[2,2,14,14]}}});}
 return elementModel(parts);
}
function composter(s:BlockState){
 const p=(b:number[],texture:string,top='user_composter_top')=>part(unit(b),texture,top,'user_composter_bottom');
 const floor=p([0,0,0,16,2,16],'user_composter_bottom','user_composter_floor');
 const north=p([0,2,0,16,16,2],'user_composter_front'),south=p([0,2,14,16,16,16],'user_composter_back');
 const west=p([0,2,2,2,16,14],'user_composter_left'),east=p([14,2,2,16,16,14],'user_composter_right');
 north.faces.south!.texture=south.faces.north!.texture=west.faces.east!.texture=east.faces.west!.texture='user_composter_inner';
 const parts=[floor,north,south,west,east],level=Math.max(0,Math.min(8,Number(s.properties.level)||0));
 if(level){const y=(1+2*Math.min(level,7))/16;parts.push({box:[.125,y,.125,.875,y,.875],faces:{up:{texture:level===8?'composter_ready':'composter_compost',uv:[2,2,14,14]}}});}
 return elementModel(parts);
}
function honey(){
 const outer=part(unit([0,0,0,16,16,16]),'user_honey_front','user_honey_top','user_honey_bottom');
 outer.faces.west!.texture='user_honey_left';outer.faces.east!.texture='user_honey_right';outer.faces.south!.texture='user_honey_back';
 return elementModel([part(unit([1,1,1,15,15,15]),'user_honey_inner'),outer]);
}
function frame(s:BlockState){
 const body=part(unit([2,2,15,14,14,16]),'oak_planks');
 body.faces.north={texture:'user_item_frame_front',uv:[0,0,16,16]};
 return elementModel([body],s.properties.facing);
}
export function partialModel(s:BlockState):{boxes:Box[];quads:ModelQuad[]}|undefined {
 if(!s.name.startsWith('minecraft:'))return;
 const n=s.name.slice(10);if(n==='repeater'||n==='comparator')return circuit(s);
 if(n==='composter')return composter(s);
 if(n==='honey_block')return honey();
 if(n==='item_frame'||n==='glow_item_frame')return frame(s);
 if(['chest','trapped_chest','ender_chest'].includes(n))return chest(s);
 if(n==='hopper')return hopper(s);
 if(['rail','powered_rail','detector_rail','activator_rail'].includes(n))return rail(s);
 if(n==='redstone_wire')return wire(s);
 if(n.endsWith('_pressure_plate'))return elementModel([part(unit([1,0,1,15,s.properties.powered==='true'||Number(s.properties.power)>0?.5:1,15]),textureName(s,'up'))]);
 if(n==='cake'){const b=part(unit([1+2*Math.max(0,Math.min(6,Number(s.properties.bites)||0)),0,1,15,8,15]),'cake_side','cake_top','cake_bottom');if(Number(s.properties.bites)>0)b.faces.west!.texture='cake_inner';return elementModel([b]);}
 if(n==='daylight_detector')return elementModel([part(unit([0,0,0,16,6,16]),'daylight_detector_side',s.properties.inverted==='true'?'daylight_detector_inverted_top':'daylight_detector_top')]);
 if(['cauldron','water_cauldron','lava_cauldron','powder_snow_cauldron'].includes(n))return cauldron(s);
}
