import {writeFileSync} from 'node:fs';import {fixture,type FixtureRegion} from './fixture';import {parseLitematic} from '../src/core/litematic';import {modelFor} from '../src/core/models';import {textureDiagnostics,faces,surfaceFor} from '../src/core/textures';
const directions=['north','east','south','west','up','down'],vectors:Record<string,number[]>={north:[0,0,-1],east:[1,0,0],south:[0,0,1],west:[-1,0,0],up:[0,1,0],down:[0,-1,0]};
function build(name:string,w:number,h:number,d:number){
 const palette:FixtureRegion['palette']=[{name:'minecraft:air'},{name:'minecraft:stone'}],values=Array(w*h*d).fill(0);
 const put=(x:number,y:number,z:number,n:string,props:Record<string,string>={})=>{const id=palette.length;palette.push({name:'minecraft:'+n,props});if(values[x+z*w+y*w*d])throw Error('Overlapping fixture blocks');values[x+z*w+y*w*d]=id;};
 for(let z=0;z<d;z++)for(let x=0;x<w;x++)values[x+z*w]=1;
 return {put,finish:()=>fixture([{name,position:[0,0,0],size:[w,h,d],palette,values}],true,name)};
}
const gallery=build('Piston Gallery',32,6,32);
for(let row=0;row<6;row++)directions.forEach((facing,i)=>{
 const x=3+4*i,z=3+5*row,y=2,sticky=row%2===1;
 gallery.put(x,y,z,sticky?'sticky_piston':'piston',{facing,extended:row<4?'true':'false'});
 if(row<4){const v=vectors[facing];gallery.put(x+v[0],y+v[1],z+v[2],'piston_head',{facing,type:sticky?'sticky':'normal',short:row>=2?'true':'false'});}
});
for(let i=0;i<6;i++)gallery.put(2+4*i,1,31,['anvil','chipped_anvil','damaged_anvil'][i%3],{facing:i<3?'north':'east'});
writeFileSync('public/fixtures/piston-gallery.litematic',gallery.finish());
const detail=build('Piston Detail',16,6,15);
for(const [x,z,facing,n] of [[2,2,'east','piston'],[7,2,'east','sticky_piston'],[12,3,'up','sticky_piston'],[2,7,'south','piston'],[7,7,'south','sticky_piston'],[12,8,'down','piston']] as const){
 detail.put(x,2,z,n,{facing,extended:'true'});const v=vectors[facing];detail.put(x+v[0],2+v[1],z+v[2],'piston_head',{facing,type:n==='sticky_piston'?'sticky':'normal',short:'false'});
}
detail.put(2,1,12,'anvil',{facing:'north'});detail.put(6,1,12,'chipped_anvil',{facing:'east'});detail.put(10,1,12,'damaged_anvil',{facing:'north'});
detail.put(14,2,12,'piston_head',{facing:'north',type:'sticky',short:'true'});
writeFileSync('public/fixtures/piston-detail.litematic',detail.finish());
const reports=[];for(const [file,bytes] of [['piston-gallery',gallery.finish()],['piston-detail',detail.finish()]] as const){
 const s=await parseLitematic(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length) as ArrayBuffer);
 reports.push({file:file+'.litematic',totalBlocks:s.totalBlocks,materials:s.materials,missingTextures:textureDiagnostics(s.states),states:s.states.filter(s=>s.name!=='minecraft:air').map(s=>({state:s.key,faces:Object.fromEntries(faces.map(f=>[f,surfaceFor(s,f)])),boxes:modelFor(s).boxes,quads:modelFor(s).quads}))});
}
writeFileSync('public/textures/piston-mapping-report.json',JSON.stringify(reports,null,2));console.log(reports.map(r=>({file:r.file,blocks:r.totalBlocks,missing:r.missingTextures.length})));
