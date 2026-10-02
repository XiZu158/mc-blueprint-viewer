import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {detailedPick,type Bounds,type ChunkGeometry,type Vec3} from '../core/types';
import {BlockTextures} from './block-textures';
export type Mode='Normal'|'Blueprint'|'X-Ray'|'Wireframe'|'Solid';
export class Viewer {
  readonly renderer:THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly group=new THREE.Group();
  readonly perspective=new THREE.PerspectiveCamera(45,1,.05,100000);
  readonly orthographic=new THREE.OrthographicCamera(-20,20,20,-20,.05,100000);
  camera:THREE.PerspectiveCamera|THREE.OrthographicCamera=this.perspective;
  controls:OrbitControls;
  private grid:THREE.GridHelper|undefined;
  private selection=new THREE.Box3Helper(new THREE.Box3(),0xffcf70);
  readonly textures:BlockTextures;
  private materials=[
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}),
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,alphaTest:.1,side:THREE.DoubleSide}),
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,transparent:true,depthWrite:false,side:THREE.DoubleSide})
  ];
  private origin=new THREE.Vector3();
  private bounds:Bounds={min:[0,0,0],max:[1,1,1]};
  private orthoScale=20;
  private picking=false;
  private down=[0,0];
  private dirty=true;
  private lastFrame=0;
  private raycaster=new THREE.Raycaster();
  private highlighting=false;
  mode:Mode='Normal';
  onPick:(position:Vec3|null)=>void=()=>{};
  constructor(readonly host:HTMLElement) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0x101924);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    host.append(this.renderer.domElement);this.scene.add(this.group);
    this.textures=new BlockTextures(()=>{this.dirty=true;});this.materials.forEach(m=>this.textures.attach(m));
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x8796a2,1.7));
    const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(60,100,40);this.scene.add(sun);
    this.selection.visible=false;this.scene.add(this.selection);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.maxPolarAngle=Math.PI;this.controls.addEventListener('change',()=>{this.dirty=true;});
    new ResizeObserver(()=>this.resize()).observe(host);
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];});
    canvas.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])<4&&e.button===0)this.pick(e);});
    this.perspective.position.set(40,32,40);this.controls.target.set(0,5,0);this.controls.update();
    this.renderer.setAnimationLoop((now)=>{if(now-this.lastFrame<28)return;this.lastFrame=now;this.controls.update();if(this.textures.update(now))this.dirty=true;if(this.dirty&&this.textures.loaded){this.renderer.render(this.scene,this.camera);this.dirty=false;}});
  }
  resize() {
    const w=this.host.clientWidth,h=Math.max(1,this.host.clientHeight),aspect=w/h;this.renderer.setSize(w,h);
    this.perspective.aspect=aspect;this.perspective.updateProjectionMatrix();this.orthographic.left=-this.orthoScale*aspect;this.orthographic.right=this.orthoScale*aspect;this.orthographic.top=this.orthoScale;this.orthographic.bottom=-this.orthoScale;this.orthographic.updateProjectionMatrix();this.dirty=true;
  }
  clear() {
    for(const m of [...this.group.children]){this.group.remove(m);(m as THREE.Mesh).geometry.dispose();}
    this.textures.resetUsed();
    this.selection.visible=false;this.dirty=true;
  }
  setBounds(bounds:Bounds) {
    this.bounds=bounds;this.origin.set(...bounds.min).add(new THREE.Vector3(...bounds.max)).multiplyScalar(.5);
    this.clear();
    if(this.grid){this.scene.remove(this.grid);this.grid.geometry.dispose();(this.grid.material as THREE.Material).dispose();}
    const size=Math.max(bounds.max[0]-bounds.min[0],bounds.max[2]-bounds.min[2],10),step=size>256?16:size>64?4:1,gridSize=Math.ceil(size*1.5/step)*step;
    this.grid=new THREE.GridHelper(gridSize,Math.min(200,gridSize/step),0x40556a,0x243545);this.grid.position.y=bounds.min[1]-this.origin.y-.015;this.scene.add(this.grid);
    this.selection.visible=false;this.fit();
  }
  addChunk(c:ChunkGeometry) {
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(c.positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(c.normals,3));geometry.setAttribute('color',new THREE.BufferAttribute(c.colors,3));geometry.setAttribute('uv',new THREE.BufferAttribute(c.uvs,2));geometry.setAttribute('blockTexture',new THREE.BufferAttribute(c.textureIds,1));geometry.setAttribute('blockOpacity',new THREE.BufferAttribute(c.opacities,1));for(const g of c.groups)geometry.addGroup(g.start,g.count,g.materialIndex);geometry.computeBoundingSphere();
    this.textures.use(c.textureIds);
    const mesh=new THREE.Mesh(geometry,this.materials);mesh.position.set(...c.origin).sub(this.origin);mesh.userData.region=c.region;mesh.userData.picks=c.picks??[];this.group.add(mesh);this.dirty=true;
  }
  setMode(mode:Mode) {
    this.mode=mode;this.textures.uniforms.uUseBlockTextures.value=mode==='Normal'||mode==='X-Ray'?1:0;
    this.materials.forEach((material,i)=>{
      material.wireframe=mode==='Wireframe';material.vertexColors=this.highlighting||mode==='Normal'||mode==='X-Ray'||mode==='Wireframe';material.color.set(this.highlighting?0xffffff:mode==='Blueprint'?0x398cb9:mode==='Solid'?0xc2cbd3:0xffffff);
      material.transparent=i===2||mode==='X-Ray';material.opacity=mode==='X-Ray'?.24:1;material.depthWrite=i!==2&&mode!=='X-Ray';material.side=i!==0||mode==='X-Ray'?THREE.DoubleSide:THREE.FrontSide;material.emissive.set(mode==='Blueprint'?0x12374d:0x000000);material.needsUpdate=true;
    });
    this.renderer.setClearColor(mode==='Blueprint'?0x071c30:0x101924);this.dirty=true;
  }
  setHighlight(active:boolean){this.highlighting=active;this.setMode(this.mode);}
  setProjection(orthographic:boolean) {
    const next=orthographic?this.orthographic:this.perspective;if(next===this.camera)return;
    next.position.copy(this.camera.position);next.quaternion.copy(this.camera.quaternion);const target=this.controls.target.clone();
    if(orthographic){this.orthoScale=this.camera.position.distanceTo(target)*Math.tan(THREE.MathUtils.degToRad(22.5));next.zoom=1;}
    else {const distance=this.orthoScale/this.orthographic.zoom/Math.tan(THREE.MathUtils.degToRad(22.5));next.position.copy(target).add(this.camera.position.clone().sub(target).normalize().multiplyScalar(distance));}
    this.camera=next;this.controls.object=next;this.controls.target.copy(target);this.resize();this.controls.update();this.dirty=true;
  }
  fit() {
    const extent=new THREE.Vector3(...this.bounds.max).sub(new THREE.Vector3(...this.bounds.min)),aspect=this.host.clientWidth/Math.max(1,this.host.clientHeight),radius=Math.max(extent.length()/2,.5),distance=radius/Math.sin(THREE.MathUtils.degToRad(22.5))*1.2/Math.min(1,aspect);
    this.controls.target.set(0,0,0);this.camera.position.set(1,.72,1).normalize().multiplyScalar(distance);this.camera.near=Math.max(.02,distance/10000);this.camera.far=Math.max(1000,distance*20);this.camera.zoom=1;this.orthoScale=radius*1.3/Math.min(1,aspect);this.controls.maxDistance=distance*20;this.controls.minDistance=.1;this.resize();this.controls.update();this.dirty=true;
  }
  standardView(view:string) {
    if(view==='iso'){this.fit();return;}
    const dir=({top:[0,1,.0001],bottom:[0,-1,.0001],front:[0,0,-1],back:[0,0,1],left:[-1,0,0],right:[1,0,0]} as Record<string,number[]>)[view];if(!dir)return;
    const distance=this.camera.position.distanceTo(this.controls.target);this.camera.position.copy(this.controls.target).add(new THREE.Vector3(...dir).multiplyScalar(distance));this.controls.update();this.dirty=true;
  }
  select(position:Vec3) {
    const min=new THREE.Vector3(...position).sub(this.origin);this.selection.box.set(min,min.clone().addScalar(1));this.selection.visible=true;this.dirty=true;
  }
  private pick(e:PointerEvent) {
    if(this.picking)return;this.picking=true;
    // Raycasts are limited to a click, and Three's chunk bounding spheres reject distant chunks.
    const rect=this.renderer.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);
    const hits=this.raycaster.intersectObjects(this.group.children,false);this.picking=false;
    if(!hits.length){this.onPick(null);return;}
    const hit=hits[0],owner=detailedPick(hit.object.userData.picks??[],(hit.faceIndex??-1)*3);
    if(owner){this.onPick(owner);return;}
    const normal=hit.face?.normal??new THREE.Vector3();const p=hit.point.clone().add(this.origin).addScaledVector(normal,-.0001);
    this.onPick([Math.floor(p.x),Math.floor(p.y),Math.floor(p.z)]);
  }
  screenshot(){this.renderer.render(this.scene,this.camera);return new Promise<Blob>((resolve,reject)=>this.renderer.domElement.toBlob(b=>b?resolve(b):reject(new Error('截图失败')),'image/png'));}
  get stats(){return this.renderer.info;}
}
