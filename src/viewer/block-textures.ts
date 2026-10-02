import * as THREE from 'three';
import {textureManifest,atlasSize} from '../generated/texture-manifest';
export function animationFrame(asset:typeof textureManifest[number],ticks:number){
  const sequence=asset.sequence,total=sequence.reduce((n,f)=>n+f.time,0);let phase=((ticks%total)+total)%total;
  for(let i=0;i<sequence.length;i++){const f=sequence[i];if(phase<f.time)return {index:f.index,next:sequence[(i+1)%sequence.length].index,mix:asset.interpolate?phase/f.time:0};phase-=f.time;}
  return {index:0,next:0,mix:0};
}
export class BlockTextures {
  readonly atlas=new THREE.Texture();
  readonly current=new THREE.DataTexture(new Float32Array(textureManifest.length*4),textureManifest.length,1,THREE.RGBAFormat,THREE.FloatType);
  readonly next=this.current.clone();
  readonly blends=new THREE.DataTexture(new Float32Array(textureManifest.length*4),textureManifest.length,1,THREE.RGBAFormat,THREE.FloatType);
  readonly uniforms:{[key:string]:{value:any}};
  readonly ready:Promise<void>;
  loaded=false;
  used=new Set<number>();
  animated=false;
  private lastUpdate=-Infinity;
  private previousFrame=new Map<number,string>();
  constructor(private changed:()=>void){
    this.next.image={data:new Float32Array(textureManifest.length*4),width:textureManifest.length,height:1};
    for(const t of [this.current,this.next,this.blends]){t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;}
    this.atlas.minFilter=this.atlas.magFilter=THREE.NearestFilter;this.atlas.generateMipmaps=false;this.atlas.colorSpace=THREE.SRGBColorSpace;this.atlas.flipY=true;this.atlas.wrapS=this.atlas.wrapT=THREE.ClampToEdgeWrapping;
    this.uniforms={uBlockAtlas:{value:this.atlas},uBlockRects:{value:this.current},uNextRects:{value:this.next},uFrameBlends:{value:this.blends},uTextureCount:{value:textureManifest.length},uAtlasPixel:{value:1/atlasSize},uUseBlockTextures:{value:1}};
    this.update(0,true);
    this.ready=new Promise<void>((resolve,reject)=>{
      const image=new Image(),embedded=document.getElementById('embedded-atlas')?.textContent;
      image.onload=()=>{this.atlas.image=image;this.atlas.needsUpdate=true;this.loaded=true;changed();resolve();};
      image.onerror=()=>reject(new Error('本地纹理图集加载失败。请确认 textures/block-atlas.png 包含在构建中。'));
      image.src=embedded?'data:image/png;base64,'+embedded.trim():new URL(`${import.meta.env.BASE_URL}textures/block-atlas.png`,document.baseURI).href;
    });
  }
  resetUsed(){this.used.clear();this.animated=false;}
  use(ids:Float32Array){for(let i=0;i<ids.length;i++)this.used.add(ids[i]);this.animated=[...this.used].some(id=>textureManifest[id].animated);}
  update(now:number,all=false){
    if(!all&&(!this.animated||now-this.lastUpdate<35))return false;
    this.lastUpdate=now;let changed=false;
    const current=this.current.image.data as Float32Array,next=this.next.image.data as Float32Array,mixes=this.blends.image.data as Float32Array;
    for(const id of all?textureManifest.map(a=>a.id):this.used){const asset=textureManifest[id],frame=animationFrame(asset,now/50),key=`${frame.index}:${frame.next}:${frame.mix.toFixed(3)}`;
      if(this.previousFrame.get(id)===key)continue;this.previousFrame.set(id,key);current.set(asset.rects[frame.index],id*4);next.set(asset.rects[frame.next],id*4);mixes[id*4]=frame.mix;changed=true;
    }
    if(changed){this.current.needsUpdate=this.next.needsUpdate=this.blends.needsUpdate=true;}return changed;
  }
  attach(material:THREE.MeshStandardMaterial){
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader=`attribute float blockTexture; attribute float blockOpacity; varying vec2 vBlockUv; varying float vBlockTexture; varying float vBlockOpacity;\n`+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvBlockUv=uv;vBlockTexture=blockTexture;vBlockOpacity=blockOpacity;');
      shader.fragmentShader=`uniform sampler2D uBlockAtlas; uniform sampler2D uBlockRects; uniform sampler2D uNextRects; uniform sampler2D uFrameBlends; uniform float uTextureCount; uniform float uAtlasPixel; uniform float uUseBlockTextures; varying vec2 vBlockUv; varying float vBlockTexture; varying float vBlockOpacity;
vec4 atlasSample(vec4 rect){vec2 local=clamp(fract(vBlockUv)*rect.zw,vec2(uAtlasPixel*.5),rect.zw-vec2(uAtlasPixel*.5));return texture2D(uBlockAtlas,rect.xy+local);}
`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec2 lookup=vec2((floor(vBlockTexture+.5)+.5)/uTextureCount,.5);vec4 texel=atlasSample(texture2D(uBlockRects,lookup));float blend=texture2D(uFrameBlends,lookup).r;
if(blend>0.0)texel=mix(texel,atlasSample(texture2D(uNextRects,lookup)),blend);
diffuseColor.rgb*=mix(vec3(1.0),texel.rgb,uUseBlockTextures);diffuseColor.a*=texel.a*vBlockOpacity;`);
    };
    material.customProgramCacheKey=()=> 'mc-user-atlas-v1';
  }
}
