// Java edition NBT. Long arrays retain every bit, without lossy JS numbers.
export interface LongArray { kind: 'long-array'; words: Uint32Array }
export type Nbt = number | bigint | string | Int8Array | Int32Array | LongArray | Nbt[] | { [key: string]: Nbt };
export type Compound = { [key: string]: Nbt };
const MAX_BYTES = 768 * 1024 * 1024;
export async function decompress(input: ArrayBuffer): Promise<Uint8Array> {
  const b = new Uint8Array(input);
  if(b[0]!==0x1f || b[1]!==0x8b) return b;
  const reader = new Blob([input]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[]=[]; let size=0;
  for(;;) {
    const {done,value}=await reader.read(); if(done) break;
    size+=value.length;
    if(size>MAX_BYTES) { await reader.cancel(); throw new Error('解压数据超过 768 MiB 安全上限。请分拆建筑。'); }
    chunks.push(value);
  }
  const out = new Uint8Array(size); let offset=0;
  for(const c of chunks) { out.set(c,offset); offset+=c.length; } return out;
}
export function readNbt(bytes: Uint8Array): Compound {
  if(bytes.byteLength>MAX_BYTES) throw new Error('NBT 数据超过安全上限');
  const v = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); let at=0;
  function need(n:number) { if(n<0||at+n>v.byteLength) throw new Error(`NBT 被截断或长度无效，偏移 ${at}`); }
  function u8() { need(1); return v.getUint8(at++); }
  function i32() { need(4); const n=v.getInt32(at); at+=4; return n; }
  function length(width:number) { const n=i32(); if(n<0) throw new Error('NBT 数组长度为负'); need(n*width); return n; }
  function str() {
    need(2); const n=v.getUint16(at); at+=2; need(n);
    // DataInput's modified UTF-8 encodes NUL as C0 80 and supplementary characters as surrogate pairs.
    const end=at+n; let out=''; const units:number[]=[];
    while(at<end) {
      const a=bytes[at++]; let code:number;
      if(a<128) code=a;
      else if((a&224)===192) { if(at>=end) throw new Error('NBT UTF-8 被截断'); const b=bytes[at++]; if((b&192)!==128) throw new Error('NBT UTF-8 无效'); code=((a&31)<<6)|(b&63); }
      else if((a&240)===224) { if(at+1>=end) throw new Error('NBT UTF-8 被截断'); const b=bytes[at++],c=bytes[at++]; if((b&192)!==128||(c&192)!==128) throw new Error('NBT UTF-8 无效'); code=((a&15)<<12)|((b&63)<<6)|(c&63); }
      else if((a&248)===240) { // Tolerate standard UTF-8 produced by third-party writers.
        if(at+2>=end) throw new Error('NBT UTF-8 被截断'); const b=bytes[at++],c=bytes[at++],d=bytes[at++]; if([b,c,d].some(x=>(x&192)!==128)) throw new Error('NBT UTF-8 无效'); code=((a&7)<<18)|((b&63)<<12)|((c&63)<<6)|(d&63); units.push(0xd800+((code-0x10000)>>10)); code=0xdc00+((code-0x10000)&1023);
      } else throw new Error('NBT UTF-8 无效');
      units.push(code); if(units.length>=4096) {out+=String.fromCharCode(...units); units.length=0;}
    }
    return out+String.fromCharCode(...units);
  }
  function payload(tag:number,depth:number):Nbt {
    if(depth>64) throw new Error('NBT 嵌套过深');
    switch(tag) {
      case 1: need(1); return v.getInt8(at++);
      case 2: {need(2);const n=v.getInt16(at);at+=2;return n;}
      case 3:return i32();
      case 4:{need(8);const n=v.getBigInt64(at);at+=8;return n;}
      case 5:{need(4);const n=v.getFloat32(at);at+=4;return n;}
      case 6:{need(8);const n=v.getFloat64(at);at+=8;return n;}
      case 7:{const n=length(1);const a=new Int8Array(bytes.buffer,bytes.byteOffset+at,n);at+=n;return a;}
      case 8:return str();
      case 9:{const type=u8(),n=i32();if(n<0||n>v.byteLength-at||(type===0&&n!==0))throw new Error('NBT List 长度无效'); const list:Nbt[]=[]; for(let i=0;i<n;i++)list.push(payload(type,depth+1));return list;}
      case 10:{const obj:Compound=Object.create(null); for(;;){const type=u8();if(type===0)break;const name=str();if(Object.hasOwn(obj,name))throw new Error(`NBT 重复标签 ${name}`);obj[name]=payload(type,depth+1);} return obj;}
      case 11:{const n=length(4),a=new Int32Array(n);for(let i=0;i<n;i++)a[i]=i32();return a;}
      case 12:{const n=length(8),words=new Uint32Array(n*2);for(let i=0;i<n;i++){words[2*i+1]=v.getUint32(at);words[2*i]=v.getUint32(at+4);at+=8;}return {kind:'long-array',words};}
      default:throw new Error(`不支持的 NBT 标签类型 ${tag}`);
    }
  }
  if(u8()!==10) throw new Error('文件根标签不是 NBT Compound'); str();
  const root=payload(10,0) as Compound;
  if(at!==bytes.length) throw new Error('NBT 后存在多余数据'); return root;
}
export function compound(n:Nbt|undefined,label:string):Compound {
  if(!n||typeof n!=='object'||Array.isArray(n)||ArrayBuffer.isView(n)||((n as LongArray).kind==='long-array'&&(n as LongArray).words instanceof Uint32Array)) throw new Error(`${label} 不是 Compound`);return n as Compound;
}
