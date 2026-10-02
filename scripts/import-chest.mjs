// Import the generated flat texture sheet into the project's existing padded atlas pipeline.
import {chromium} from '@playwright/test';import {readFileSync,writeFileSync} from 'node:fs';
const names=['top','front','right','back','bottom','left','lock_front','lock_side'];
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),source=readFileSync('public/textures/chest/chest-sheet.png').toString('base64');
 const result=await page.evaluate(async source=>{
   const img=new Image();img.src='data:image/png;base64,'+source;await img.decode();
   if(Math.abs(img.width/img.height-2)>.02)throw Error('Chest sheet must contain 4 by 2 square tiles');
   const images=[];
   for(let i=0;i<8;i++){const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
     ctx.drawImage(img,(i%4)*img.width/4,Math.floor(i/4)*img.height/2,img.width/4,img.height/2,0,0,16,16);images.push(canvas.toDataURL('image/png').split(',')[1]);}
   return {width:img.width,height:img.height,images};
 },source);
 result.images.forEach((data,i)=>writeFileSync(`public/textures/block/user_chest_${names[i]}.png`,Buffer.from(data,'base64')));
 writeFileSync('public/textures/chest/tile-layout.json',JSON.stringify({source:'Chest.png supplied by user; flat sheet derived using built-in image_gen',sheet:'chest-sheet.png',size:[result.width,result.height],grid:[4,2],tileResolution:[16,16],sampling:'nearest-neighbor',tiles:names.map((name,i)=>({name:'user_chest_'+name,file:'../block/user_chest_'+name+'.png',column:i%4,row:Math.floor(i/4)}))},null,2));
 console.log('Imported eight 16x16 chest surfaces, including six wood faces and independent metal clasp.');
}finally{await browser.close();}
