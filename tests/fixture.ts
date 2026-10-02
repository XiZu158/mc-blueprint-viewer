// Independent big-integer writer: intentionally does not import any decoder code.
import { gzipSync } from 'node:zlib';
export interface Tag {type:number;value:any}
export const t={int:(value:number):Tag=>({type:3,value}),long:(value:bigint):Tag=>({type:4,value}),str:(value:string):Tag=>({type:8,value}),compound:(value:Record<string,Tag>):Tag=>({type:10,value}),list:(type:number,value:any[]):Tag=>({type:9,value:{type,items:value}}),longs:(value:bigint[]):Tag=>({type:12,value})};
export function encodeNbt(root:Tag):Buffer {
  const out:Buffer[]=[];
  const push=(b:Buffer)=>out.push(b);
  const byte=(n:number)=>push(Buffer.from([n]));
  const int=(n:number)=>{const b=Buffer.alloc(4);b.writeInt32BE(n);push(b);};
  function str(s:string){ // Java modified UTF-8
    const bytes:number[]=[];for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>0&&c<128)bytes.push(c);else if(c<2048)bytes.push(192|(c>>6),128|(c&63));else bytes.push(224|(c>>12),128|((c>>6)&63),128|(c&63));}
    const b=Buffer.alloc(2);b.writeUInt16BE(bytes.length);push(b);push(Buffer.from(bytes));
  }
  function payload(type:number,v:any){switch(type){
    case 1:byte(v);break;
    case 2:{const b=Buffer.alloc(2);b.writeInt16BE(v);push(b);break;}
    case 3:int(v);break;
    case 4:{const b=Buffer.alloc(8);b.writeBigInt64BE(BigInt.asIntN(64,v));push(b);break;}
    case 5:case 6:{const b=Buffer.alloc(type===5?4:8);type===5?b.writeFloatBE(v):b.writeDoubleBE(v);push(b);break;}
    case 7:int(v.length);push(Buffer.from(v));break;
    case 8:str(v);break;
    case 9:byte(v.type);int(v.items.length);v.items.forEach((item:any)=>payload(v.type,item));break;
    case 10:for(const [key,tag] of Object.entries(v) as [string,Tag][]){byte(tag.type);str(key);payload(tag.type,tag.value);}byte(0);break;
    case 11:int(v.length);v.forEach(int);break;
    case 12:int(v.length);v.forEach((n:bigint)=>payload(4,n));break;
  }}
  byte(10);str('');payload(10,root.value);return Buffer.concat(out);
}
export function pack(values:number[],paletteSize:number):bigint[] {
  const bits=Math.max(2,Math.ceil(Math.log2(paletteSize))),longs=Array<bigint>(Math.ceil(values.length*bits/64)).fill(0n);
  values.forEach((v,i)=>{const bit=i*bits,word=Math.floor(bit/64),shift=bit%64;longs[word]|=(BigInt(v)<<BigInt(shift))&((1n<<64n)-1n);if(shift+bits>64)longs[word+1]|=BigInt(v)>>BigInt(64-shift);});
  return longs;
}
export interface FixtureRegion {name:string;position:[number,number,number];size:[number,number,number];palette:{name:string;props?:Record<string,string>}[];values:number[];entities?:Record<string,Tag>[]}
const vec=(v:number[])=>t.compound({x:t.int(v[0]),y:t.int(v[1]),z:t.int(v[2])});
export function regionTag(r:FixtureRegion):Tag {
  return t.compound({Position:vec(r.position),Size:vec(r.size),BlockStatePalette:t.list(10,r.palette.map(p=>({Name:t.str(p.name),...(p.props?{Properties:t.compound(Object.fromEntries(Object.entries(p.props).map(([k,v])=>[k,t.str(v)])))}:{})}))),BlockStates:t.longs(pack(r.values,r.palette.length)),TileEntities:t.list(10,[]),Entities:t.list(10,r.entities??[]),PendingBlockTicks:t.list(10,[]),PendingFluidTicks:t.list(10,[])});
}
export function schematicTag(regions:FixtureRegion[],name='Fixture'):Tag {
  const total=regions.reduce((sum,r)=>sum+r.values.filter(i=>!['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(r.palette[i]?.name)).length,0);
  return t.compound({Version:t.int(6),SubVersion:t.int(1),MinecraftDataVersion:t.int(3465),Metadata:t.compound({Name:t.str(name),Author:t.str('MC Blueprint Viewer'),Description:t.str('Generated binary Litematica fixture'),RegionCount:t.int(regions.length),TotalBlocks:t.int(total),TotalVolume:t.int(regions.reduce((n,r)=>n+r.values.length,0)),TimeCreated:t.long(0n),TimeModified:t.long(0n),EnclosingSize:vec([64,32,64])}),Regions:t.compound(Object.fromEntries(regions.map(r=>[r.name,regionTag(r)])))});
}
export function fixture(regions:FixtureRegion[],gzip=true,name='Fixture'):Buffer {const raw=encodeNbt(schematicTag(regions,name));return gzip?gzipSync(raw):raw;}
export function edgeFixture():FixtureRegion[] {
  const palette=Array.from({length:19},(_,i)=>({name:i===7?'minecraft:air':i===3?'minecraft:cave_air':i===0?'minecraft:oak_stairs':`fixture:block_${i}`,props:i===0?{facing:'east',half:'top',shape:'inner_left'}:undefined}));
  return [{name:'negative xyz',position:[10,8,-3],size:[-7,-3,-4],palette,values:Array.from({length:84},(_,i)=>(i*7+13)%19)},
    {name:'offset positive',position:[-20,0,12],size:[3,2,3],palette:[{name:'minecraft:air'},{name:'minecraft:oak_stairs',props:{shape:'inner_left',half:'top',facing:'east'}},{name:'minecraft:stone'}],values:Array.from({length:18},(_,i)=>i%3)}];
}
export function demoFixture():FixtureRegion[] {
  const palette:FixtureRegion['palette']=[{name:'minecraft:air'},{name:'minecraft:stone_bricks'},{name:'minecraft:oak_planks'},{name:'minecraft:dark_oak_stairs',props:{facing:'east',half:'bottom',shape:'straight'}},{name:'minecraft:dark_oak_stairs',props:{facing:'west',half:'bottom',shape:'straight'}},{name:'minecraft:glass_pane',props:{east:'true',west:'true',north:'false',south:'false'}},{name:'minecraft:oak_log',props:{axis:'y'}},{name:'minecraft:oak_fence',props:{north:'true',south:'true',east:'false',west:'false'}},{name:'minecraft:stone_brick_slab',props:{type:'bottom'}},{name:'minecraft:oak_door',props:{half:'lower',facing:'south',open:'false',hinge:'left'}},{name:'minecraft:oak_door',props:{half:'upper',facing:'south',open:'false',hinge:'left'}},{name:'minecraft:lantern'},{name:'minecraft:grass_block'},{name:'minecraft:water'}];
  const sx=33,sy=26,sz=29,values=new Array(sx*sy*sz).fill(0),put=(x:number,y:number,z:number,id:number)=>{if(x>=0&&x<sx&&y>=0&&y<sy&&z>=0&&z<sz)values[x+z*sx+y*sx*sz]=id;};
  for(let z=0;z<sz;z++)for(let x=0;x<sx;x++){put(x,0,z,12);if(x>1&&x<31&&z>1&&z<27)put(x,1,z,1);}
  // Stone keep, open courtyard and four towers.
  for(let y=2;y<=10;y++)for(let z=5;z<=23;z++)for(let x=5;x<=27;x++){
    if(x===5||x===27||z===5||z===23)put(x,y,z,y>=6?2:1);
    if((x===5||x===27)&&(z===5||z===23))put(x,y,z,6);
    if(y===2||y===6)put(x,y,z,2);
  }
  for(let x=8;x<=24;x+=4)for(let y=7;y<=9;y++){put(x,y,5,5);put(x,y,23,5);}
  for(let y=3;y<=5;y++)for(let x=15;x<=17;x++)put(x,y,5,0);
  put(16,3,5,9);put(16,4,5,10);
  for(let y=11;y<=24;y++){const inset=y-11;for(let z=3;z<=25;z++){put(3+inset,y,z,3);put(29-inset,y,z,4);for(let x=4+inset;x<29-inset;x++)if(z===3||z===25)put(x,y,z,2);}}
  for(const tx of [3,26])for(const tz of [3,22]){
    for(let y=2;y<=14;y++)for(let z=tz;z<tz+4;z++)for(let x=tx;x<tx+4;x++)if(x===tx||x===tx+3||z===tz||z===tz+3||y===14)put(x,y,z,1);
    for(let z=tz;z<tz+4;z++)for(let x=tx;x<tx+4;x++)if((x+z)%2===0)put(x,15,z,8);
  }
  for(let z=6;z<=22;z++){put(3,3,z,7);put(29,3,z,7);}
  for(const x of [8,24]){put(x,3,3,11);put(x,3,25,11);}
  return [{name:'Keep',position:[-16,0,-14],size:[sx,sy,sz],palette,values},
    {name:'Garden',position:[-18,0,18],size:[37,2,9],palette:[{name:'minecraft:air'},{name:'minecraft:grass_block'},{name:'minecraft:water'},{name:'minecraft:stone_brick_slab',props:{type:'bottom'}}],values:Array.from({length:37*2*9},(_,i)=>{const y=Math.floor(i/(37*9)),z=Math.floor(i/37)%9,x=i%37;return y===0?1:z>=3&&z<=5?2:x%4===0?3:0;})}];
}
