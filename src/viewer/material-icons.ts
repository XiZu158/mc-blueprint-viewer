import {textureManifest,atlasSize} from '../generated/texture-manifest';
import {surfaceFor,type Face} from '../core/textures';
import type {BlockState} from '../core/types';
import {modelFor} from '../core/models';
import {elementModel} from '../core/piston-model';
import {faces,faceUv} from '../core/textures';
export class MaterialIcons {
 private cache=new Map<string,string>();
 private tiles=new Map<string,HTMLCanvasElement>();
 constructor(private atlas:()=>CanvasImageSource|undefined){}
 get(state:BlockState):string {
  const cached=this.cache.get(state.key);if(cached)return cached;
  const atlas=this.atlas();if(!atlas)return '';
  const model=modelFor(state);
  const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;
  const tile=(face:Face,texture?:string)=>{const surface=surfaceFor(state,face,texture),key=surface.id+':'+surface.tint.join(','),cached=this.tiles.get(key);if(cached)return cached;
   const asset=textureManifest[surface.id],r=asset.rects[asset.sequence[0].index],t=document.createElement('canvas');t.width=t.height=16;const tc=t.getContext('2d')!;tc.imageSmoothingEnabled=false;
   tc.drawImage(atlas,r[0]*atlasSize,(1-r[1]-r[3])*atlasSize,r[2]*atlasSize,r[3]*atlasSize,0,0,16,16);
   if(surface.tint.some(v=>v!==1)){const image=tc.getImageData(0,0,16,16),p=image.data;for(let i=0;i<p.length;i+=4)for(let a=0;a<3;a++){const s=p[i+a]/255,linear=s<=.04045?s/12.92:((s+.055)/1.055)**2.4,tinted=linear*surface.tint[a];p[i+a]=Math.round(255*(tinted<=.0031308?12.92*tinted:1.055*tinted**(1/2.4)-.055));}tc.putImageData(image,0,0);}
   this.tiles.set(key,t);return t;
  };
  if(state.name.endsWith('item_frame'))ctx.drawImage(tile((state.properties.facing??'north') as Face),3,3,26,26);
  else if(!model.full){
   const quads=model.quads??elementModel(model.boxes.map(box=>({box,faces:Object.fromEntries(faces.map(f=>[f,{texture:surfaceFor(state,f).texture,uv:[0,0,16,16]}]))}))).quads;
   // Lightweight canvas projection of the same geometry used by the Worker. No new WebGL context or resource loads.
   const project=(p:number[])=>[p[0]+p[2],(p[0]-p[2])*.5-p[1]],eye=[1,1,-1];
   const visible=quads.filter(q=>{const n=q.normal??[q.axis===0?q.sign:0,q.axis===1?q.sign:0,q.axis===2?q.sign:0];return n.reduce((v,n,i)=>v+n*eye[i],0)>1e-6;}).sort((a,b)=>a.points.reduce((v,p)=>v+p.reduce((n,x,i)=>n+x*eye[i],0),0)-b.points.reduce((v,p)=>v+p.reduce((n,x,i)=>n+x*eye[i],0),0));
   const pts=quads.flatMap(q=>q.points.map(project)),lo=[0,1].map(a=>Math.min(...pts.map(p=>p[a]))),hi=[0,1].map(a=>Math.max(...pts.map(p=>p[a]))),scale=28/Math.max(hi[0]-lo[0],hi[1]-lo[1]);
   for(const q of visible){const f=faces[q.axis*2+(q.sign>0?1:0)],texture=tile(f,q.texture),uv=model.quads?q.uv:q.points.map(p=>faceUv(state,q.axis,q.sign,p)),dst=q.points.map(p=>project(p).map((v,i)=>16+(v-(hi[i]+lo[i])/2)*scale)),src=uv.map(p=>[p[0]*16,(1-p[1])*16]);
    const n=q.normal??[q.axis===0?q.sign:0,q.axis===1?q.sign:0,q.axis===2?q.sign:0],shade=.72+.28*Math.max(0,n[1]);
    for(const ids of [[0,1,2],[0,2,3]]){const a=src[ids[0]],b=src[ids[1]],c=src[ids[2]],A=dst[ids[0]],B=dst[ids[1]],C=dst[ids[2]],x=b[0]-a[0],y=b[1]-a[1],u=c[0]-a[0],v=c[1]-a[1],det=x*v-u*y;if(Math.abs(det)<1e-8)continue;
     const m=( (B[0]-A[0])*v-(C[0]-A[0])*y)/det,t=((C[0]-A[0])*x-(B[0]-A[0])*u)/det,j=((B[1]-A[1])*v-(C[1]-A[1])*y)/det,k=((C[1]-A[1])*x-(B[1]-A[1])*u)/det;
     ctx.save();ctx.beginPath();ctx.moveTo(...A as [number,number]);ctx.lineTo(...B as [number,number]);ctx.lineTo(...C as [number,number]);ctx.closePath();ctx.clip();ctx.setTransform(m,j,t,k,A[0]-m*a[0]-t*a[1],A[1]-j*a[0]-k*a[1]);ctx.globalAlpha=surfaceFor(state,f,q.texture).opacity;ctx.filter=`brightness(${shade})`;ctx.drawImage(texture,0,0);ctx.restore();
    }
   }
  }else{ctx.setTransform(1,.5,-1,.5,16,0);ctx.drawImage(tile('up'),0,0);ctx.setTransform(1,.5,0,1,0,8);ctx.drawImage(tile('north'),0,0);ctx.setTransform(1,-.5,0,1,16,16);ctx.drawImage(tile('east'),0,0);}
  const url=c.toDataURL('image/png');this.cache.set(state.key,url);return url;
 }
}
