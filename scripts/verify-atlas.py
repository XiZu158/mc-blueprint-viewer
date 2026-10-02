from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
report=json.loads((root/'public/textures/import-report.json').read_text())
atlas=Image.open(root/'public/textures/block-atlas.png').convert('RGBA'); verified=0
for asset in report['textures']:
    if asset['name']=='__missing__': continue
    image=Image.open(root/'public/textures/block'/f"{asset['name']}.png").convert('RGBA')
    w,h=asset['width'],asset['height']; cols=image.width//w
    for index,rect in enumerate(asset['rects']):
        x=round(rect[0]*atlas.width); y=round((1-rect[1]-rect[3])*atlas.height)
        frame=image.crop((index%cols*w,index//cols*h,(index%cols+1)*w,(index//cols+1)*h))
        assert frame.tobytes()==atlas.crop((x,y,x+w,y+h)).tobytes(),(asset['name'],index,'pixels')
        for yy in range(h):
            assert atlas.getpixel((x-1,y+yy))==frame.getpixel((0,yy))
            assert atlas.getpixel((x+w,y+yy))==frame.getpixel((w-1,yy))
        for xx in range(w):
            assert atlas.getpixel((x+xx,y-1))==frame.getpixel((xx,0))
            assert atlas.getpixel((x+xx,y+h))==frame.getpixel((xx,h-1))
        verified+=1
result={'pngCount':report['pngCount'],'verifiedFrames':verified,'pixelDifferences':0,'alphaPreserved':True,'verticalOrientationPreserved':True,'extrudedGuttersVerified':True}
(root/'atlas-test-results.json').write_text(json.dumps(result,indent=2));print(result)
