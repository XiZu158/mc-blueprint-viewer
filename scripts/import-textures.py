"""Import an already extracted, user-supplied block texture directory. No downloads."""
import sys, json, math, hashlib, shutil
from pathlib import Path
from PIL import Image

source = Path(sys.argv[1])
project = Path(__file__).resolve().parents[1]
destination = project / 'public/textures/block'
destination.mkdir(parents=True, exist_ok=True)
assets = []
warnings = []
def origin_for(name):
    if name.startswith('user_ender_'): return 'Ender_Chest.png + built-in image_gen flat-face completion'
    if name.startswith('user_scaffold_'): return 'Scaffolding.png + built-in image_gen flat-face completion'
    if name.startswith('user_spruce_sign_'): return 'Spruce_Sign.png supplied by user; nearest-neighbor board/post import'
    if name.startswith('user_chest_'): return 'Chest.png + built-in image_gen flat-face completion'
    if name.startswith('user_honey_'): return 'Honey_Block.png + built-in image_gen flat-face completion'
    if name.startswith('user_composter_'): return 'Composter.png + built-in image_gen flat-face completion'
    if name.startswith('user_item_frame_'): return 'Item_Frame.png supplied by user; nearest-neighbor import'
    return 'user supplied block.zip'
for path in sorted(source.glob('*.png')):
    image = Image.open(path).convert('RGBA')
    meta_path = path.with_name(path.name + '.mcmeta')
    meta = json.loads(meta_path.read_text('utf8')) if meta_path.exists() else {}
    animation = meta.get('animation')
    if animation is not None:
        width = animation.get('width', image.width if 'height' in animation else min(image.size))
        height = animation.get('height', image.height if 'width' in animation else min(image.size))
    else:
        width, height = image.size
    if width <= 0 or height <= 0 or image.width % width or image.height % height:
        raise ValueError(f'Invalid frame dimensions: {path.name}')
    count = image.width // width * (image.height // height)
    frames = [image.crop((i % (image.width // width) * width, i // (image.width // width) * height,
                          (i % (image.width // width) + 1) * width, (i // (image.width // width) + 1) * height)) for i in range(count)]
    duration = animation.get('frametime', 1) if animation is not None else 1
    sequence = animation.get('frames', list(range(count))) if animation is not None else [0]
    sequence = [{'index': item, 'time': duration} if isinstance(item, int) else {'index': item['index'], 'time': item.get('time', duration)} for item in sequence]
    if any(f['index'] < 0 or f['index'] >= count or f['time'] <= 0 for f in sequence):
        raise ValueError(f'Invalid animation sequence: {path.name}')
    pixels = [p for f in frames for p in f.getdata() if p[3] > 0]
    grayscale = sum(max(p[:3])-min(p[:3]) <= 4 for p in pixels)/max(1,len(pixels)) > .95
    alpha = 'blend' if any(0 < p[3] < 255 for p in pixels) else 'cutout' if any(p[3] == 0 for f in frames for p in f.getdata()) else 'opaque'
    assets.append({'name':path.stem, 'width':width, 'height':height, 'images':frames,
                   'sequence':sequence, 'interpolate':bool(animation and animation.get('interpolate',False)),
                   'animated':animation is not None and len(sequence)>1, 'grayscale':grayscale, 'alpha':alpha,
                   'sourceSize':list(image.size), 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'metadata':meta,
                   'origin':origin_for(path.stem)})
    if path.resolve() != (destination/path.name).resolve():
        shutil.copyfile(path, destination/path.name)
    if meta_path.exists() and meta_path.resolve() != (destination/meta_path.name).resolve():
        shutil.copyfile(meta_path, destination/meta_path.name)

missing = Image.new('RGBA',(16,16)); missing.putdata([(255,0,255,255) if (x//8+y//8)%2==0 else (18,18,18,255) for y in range(16) for x in range(16)])
assets.insert(0,{'name':'__missing__','width':16,'height':16,'images':[missing],'sequence':[{'index':0,'time':1}], 'interpolate':False,'animated':False,'grayscale':False,'alpha':'opaque','sourceSize':[16,16],'metadata':{}})
max_frame = max(max(a['width'],a['height']) for a in assets)
padding=2; cell=max_frame+2*padding
total=sum(len(a['images']) for a in assets)
side=2**math.ceil(math.log2(math.ceil(math.sqrt(total))*cell))
columns=side//cell
atlas=Image.new('RGBA',(side,side),(0,0,0,0)); cursor=0
manifest=[]
for texture_id,a in enumerate(assets):
    rects=[]
    for frame in a.pop('images'):
        x=cursor%columns*cell+padding; y=cursor//columns*cell+padding; cursor+=1
        atlas.paste(frame,(x,y))
        # Extrude edge pixels, including alpha. No mipmaps; repeat UVs are sampled inside each frame.
        atlas.paste(frame.crop((0,0,1,frame.height)).resize((padding,frame.height),Image.Resampling.NEAREST),(x-padding,y))
        atlas.paste(frame.crop((frame.width-1,0,frame.width,frame.height)).resize((padding,frame.height),Image.Resampling.NEAREST),(x+frame.width,y))
        atlas.paste(frame.crop((0,0,frame.width,1)).resize((frame.width,padding),Image.Resampling.NEAREST),(x,y-padding))
        atlas.paste(frame.crop((0,frame.height-1,frame.width,frame.height)).resize((frame.width,padding),Image.Resampling.NEAREST),(x,y+frame.height))
        for dx,dy,px,py in [(-padding,-padding,0,0),(frame.width,-padding,frame.width-1,0),(-padding,frame.height,0,frame.height-1),(frame.width,frame.height,frame.width-1,frame.height-1)]:
            atlas.paste(Image.new('RGBA',(padding,padding),frame.getpixel((px,py))),(x+dx,y+dy))
        rects.append([x/side,(side-y-frame.height)/side,frame.width/side,frame.height/side])
    manifest.append({**a,'id':texture_id,'rects':rects})
atlas.save(project/'public/textures/block-atlas.png',optimize=True)
generated=project/'src/generated'; generated.mkdir(exist_ok=True)
runtime=[{k:v for k,v in a.items() if k not in ['sha256','metadata','sourceSize','origin']} for a in manifest]
(generated/'texture-manifest.ts').write_text('export const atlasSize='+str(side)+';\nexport const textureManifest='+json.dumps(runtime,separators=(',',':'))+';\n',encoding='utf8')
report={'source':'user supplied block.zip + Chest/Honey_Block/Composter/Item_Frame/Ender_Chest/Scaffolding/Spruce_Sign references','originalPackPngCount':sum(a.get('origin')=='user supplied block.zip' for a in assets),'chestDerivedPngCount':sum(a.get('origin','').startswith('Chest.png') for a in assets),'additionalPngCount':sum(a.get('origin','').startswith(('Honey_Block.png','Composter.png','Item_Frame.png')) for a in assets),'pngCount':len(assets)-1,'metadataCount':len(list(source.glob('*.mcmeta'))),'models':0,'blockstates':0,'atlasSize':side,'padding':padding,'frames':total,'animatedTextures':sum(a['animated'] for a in assets),'warnings':warnings,'textures':manifest}
(project/'public/textures/import-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='textures'}))
