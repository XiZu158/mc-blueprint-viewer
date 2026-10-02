export type Vec3 = [number, number, number];
export interface BlockState { name: string; properties: Record<string, string>; key: string }
export interface Region {
  name: string; position: Vec3; size: Vec3; min: Vec3; dimensions: Vec3;
  blocks: Uint32Array; counts: Record<number, number>; nonAir: number;
  frames?: FrameEntity[];
}
export interface FrameEntity {position:Vec3;anchor:Vec3;state:number;item:string;rotation:number}
export interface Bounds { min: Vec3; max: Vec3 }
export interface MaterialRow { name: string; count: number; states: number[] }
export interface Schematic {
  name: string; author: string; description: string; version: number; dataVersion: number;
  states: BlockState[]; regions: Region[]; bounds: Bounds; materials: MaterialRow[];
  totalBlocks: number; volume: number; warnings: string[];
  entityMaterials?:MaterialRow[]; totalEntities?:number;
}
export interface Summary extends Omit<Schematic, 'regions'> { regions: Omit<Region, 'blocks'>[] }
export interface Filter {
  regions: string[]; hidden: number[]; isolate: number[]; highlight: number[];
  yMin: number; yMax: number; cutAxis: 'none'|'x'|'z'; cutValue: number;
  renderMissing?:boolean;
}
export interface ChunkGeometry {
  key: string; region: string; origin: Vec3;
  positions: Float32Array; normals: Float32Array; colors: Float32Array;
  uvs:Float32Array; textureIds:Float32Array; opacities:Float32Array;
  groups:{start:number;count:number;materialIndex:number}[];
  picks?:PickRange[];
}
export interface PickRange {start:number;count:number;position:Vec3}
export function detailedPick(ranges:PickRange[],vertex:number):Vec3|undefined {
  let lo=0,hi=ranges.length-1;
  while(lo<=hi){const mid=(lo+hi)>>1,r=ranges[mid];if(vertex<r.start)hi=mid-1;else if(vertex>=r.start+r.count)lo=mid+1;else return r.position;}
}
export const isAir = (name: string) => ['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(name);
export function stateKey(name: string, props: Record<string,string>): string {
  const p = Object.keys(props).sort().map(k => `${k}=${props[k]}`).join(',');
  return name + (p ? `[${p}]` : '');
}
export function blockAt(region: Region, x: number, y: number, z: number): number {
  const [sx,sy,sz] = region.dimensions;
  if(x<0||y<0||z<0||x>=sx||y>=sy||z>=sz) return 0;
  return region.blocks[x + z*sx + y*sx*sz];
}
