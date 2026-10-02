import {chromium} from '@playwright/test';import {readFileSync,writeFileSync} from 'node:fs';
const folder='public/textures/furnishings',browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage(),layout=[];
 for(const [file,prefix,names] of [['ender-sheet.png','user_ender',['top','front','right','back','bottom','left','lock_front','lock_side']],['scaffold-sign-sheet.png','user_scaffold',['top','front','right','back','bottom','left']]]){
  const data=readFileSync(`${folder}/${file}`).toString('base64');
  const tiles=await page.evaluate(async({data,prefix,names})=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const w=img.width/4,h=img.height/2;
   return names.map((name,i)=>{const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;let x=i%4*w,y=Math.floor(i/4)*h,W=w,H=h;
    if(name.startsWith('lock_')){x+=w*.36;y+=h*.15;W=w*.28;H=h*.72;}
    ctx.drawImage(img,x,y,W,H,0,0,16,16);const pixels=ctx.getImageData(0,0,16,16);for(let j=3;j<pixels.data.length;j+=4)pixels.data[j]=pixels.data[j]>=128?255:0;ctx.putImageData(pixels,0,0);return c.toDataURL('image/png').split(',')[1];});
  },{data,prefix,names});
  tiles.forEach((data,i)=>writeFileSync(`public/textures/block/${prefix}_${names[i]}.png`,Buffer.from(data,'base64')));layout.push({file,prefix,names,resolution:16,grid:[4,2],sampling:'nearest; binary alpha at 128; latch samples gold interior'});
 }
 // The supplied sign is already a flat sprite. Import its plank and post separately, excluding the transparent silhouette.
 const data=readFileSync(`${folder}/reference-Spruce_Sign.png`).toString('base64');const sign=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data,rows=[];
  for(let y=0;y<c.height;y++){let lo=c.width,hi=-1;for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>128){lo=Math.min(lo,x);hi=x;}if(hi>=lo)rows.push({y,lo,hi,width:hi-lo+1});}
  const max=Math.max(...rows.map(r=>r.width)),board=rows.filter(r=>r.width===max),pole=rows.filter(r=>r.y>board.at(-1).y),bounds=[board,pole].map(a=>[a[0].lo,a[0].y,a[0].width,a.at(-1).y-a[0].y+1]);
  const tiles=bounds.map(b=>{const t=document.createElement('canvas');t.width=t.height=16;const tc=t.getContext('2d');tc.imageSmoothingEnabled=false;tc.drawImage(img,...b,0,0,16,16);return t.toDataURL('image/png').split(',')[1];});return{tiles,bounds};
 },data);for(const [i,name] of ['board','post'].entries())writeFileSync(`public/textures/block/user_spruce_sign_${name}.png`,Buffer.from(sign.tiles[i],'base64'));layout.push({file:'reference-Spruce_Sign.png',names:['board','post'],bounds:sign.bounds,resolution:16,sampling:'nearest'});
 writeFileSync(`${folder}/tile-layout.json`,JSON.stringify(layout,null,2));console.log('Imported 8 Ender Chest, 6 Scaffolding and 2 supplied Spruce Sign textures.');
}finally{await browser.close();}
