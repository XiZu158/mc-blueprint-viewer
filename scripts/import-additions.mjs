import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const layout=[];
try {
 const page=await browser.newPage();
 for(const [file,prefix,names] of [['honey-sheet.png','user_honey',['top','front','right','back','bottom','left','inner']],['composter-sheet.png','user_composter',['top','front','right','back','bottom','left','inner','floor']],['reference-Item_Frame.png','user_item_frame',['front']]]) {
  const data=readFileSync('public/textures/additions/'+file).toString('base64');
  const result=await page.evaluate(async ({data,count})=>{
   const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
   const sheet=count>1;if(sheet&&Math.abs(img.width/img.height-2)>.02)throw Error('Expected 4x2 texture sheet');
   let bounds=[0,0,img.width,img.height];
   if(!sheet){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(p[i+3]&&Math.max(p[i],p[i+1],p[i+2])>0){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}}bounds=[x0,y0,x1-x0,y1-y0];}
   const images=[];for(let i=0;i<count;i++){const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    const crop=sheet?[(i%4)*img.width/4,Math.floor(i/4)*img.height/2,img.width/4,img.height/2]:bounds;ctx.drawImage(img,...crop,0,0,16,16);images.push(c.toDataURL('image/png').split(',')[1]);}
   return {images,bounds,size:[img.width,img.height]};
  },{data,count:names.length});
  result.images.forEach((data,i)=>writeFileSync(`public/textures/block/${prefix}_${names[i]}.png`,Buffer.from(data,'base64')));
  layout.push({file,prefix,names,size:result.size,crop:result.bounds,grid:names.length>1?[4,2]:[1,1],resolution:16,sampling:'nearest'});
 }
 writeFileSync('public/textures/additions/tile-layout.json',JSON.stringify(layout,null,2));console.log(layout);
} finally {await browser.close();}
