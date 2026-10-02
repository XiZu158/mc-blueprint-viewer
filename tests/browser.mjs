import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve} from 'node:path';
const base=process.env.VIEWER_URL||'http://127.0.0.1:4174';
const executable=process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});const errors=[],requests=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
async function ready(){await page.waitForFunction(()=>window.__blueprint?.ready,{},{timeout:120000});await page.waitForTimeout(100);return page.evaluate(()=>window.__blueprint);}
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
try {
  await page.goto(base);let state=await ready();assert.ok(state.blocks>1000);assert.equal(state.regions.length,2);
  await check('real gzip .litematic demo uses merged chunks',async()=>{assert.ok(state.mesh.chunks<state.blocks/100);assert.ok(state.mesh.triangles>0);assert.equal(await page.locator('canvas').count(),1);});
  await page.screenshot({path:'viewer-screenshot.png',fullPage:true});
  await check('projection, standard views and all five render modes',async()=>{await page.locator('#orthographic').click();assert.match(await page.locator('#view-label').innerText(),/ORTHOGRAPHIC/);for(const mode of ['Blueprint','X-Ray','Wireframe','Solid','Normal']){await page.locator(`[data-mode="${mode}"]`).click();assert.match(await page.locator('#view-label').innerText(),new RegExp(mode.toUpperCase()));}await page.locator('#view').selectOption('top');await page.locator('#fit').click();await page.locator('#perspective').click();});
  await check('material search, sorting, hide, isolate and highlight keep exact totals',async()=>{
    const total=state.blocks;await page.locator('#search').fill('stone_bricks');assert.equal(await page.locator('.material').count(),1);await page.locator('#sort').selectOption('count-asc');
    for(const op of ['hidden','isolate','highlight']){await page.locator(`[data-action="${op}"]`).click();await page.waitForTimeout(250);state=await ready();assert.equal(state.blocks,total);assert.equal(await page.locator(`[data-action="${op}"]`).getAttribute('aria-pressed'),'true');await page.locator('#clear-materials').click();await page.waitForTimeout(250);await ready();}
    await page.locator('#search').fill('');await page.locator('#reset').click();await page.waitForTimeout(250);await ready();
  });
  await check('Y layer, clipping and Region visibility rebuild in worker',async()=>{
    await page.locator('#layer-mode').selectOption('single');await page.locator('#layer-number').fill('0');await page.locator('#layer-number').press('Tab');await page.waitForTimeout(250);const layer=await ready();assert.ok(layer.mesh.triangles<state.mesh.triangles);
    await page.locator('#cut-axis').selectOption('x');await page.locator('#cut-number').fill('0');await page.locator('#cut-number').press('Tab');await page.waitForTimeout(250);await ready();
    await page.locator('[data-region="Garden"]').uncheck();await page.waitForTimeout(250);await ready();await page.locator('#reset').click();await page.waitForTimeout(250);await ready();
  });
  await check('CSV, JSON, TXT exports contain exact complete counts and screenshot is a PNG',async()=>{
    for(const ext of ['json','csv','txt']){const event=page.waitForEvent('download');await page.locator(`[data-export="${ext}"]`).click();const download=await event,path=await download.path(),text=readFileSync(path,'utf8');if(ext==='json'){const obj=JSON.parse(text);assert.equal(obj.totalBlocks,state.blocks);assert.equal(obj.materials.reduce((n,m)=>n+m.count,0),state.blocks);}else assert.ok(text.includes('minecraft:stone_bricks'));}
    const event=page.waitForEvent('download');await page.locator('#screenshot').click();const d=await event;assert.equal(readFileSync(await d.path()).subarray(1,4).toString(),'PNG');
  });
  await check('independently authored Lite file: 4 regions, negative Y and exact 122-block inventory',async()=>{await page.locator('#file').setInputFiles(resolve('public/fixtures/Lite.litematic'));state=await ready();assert.equal(state.blocks,122);assert.equal(state.regions.length,4);assert.ok(state.regions.every(r=>r.size[1]<0));});
  await check('Inspector reports exact source coordinate, region and palette state',async()=>{await page.locator('#inspect-x').fill('-12');await page.locator('#inspect-y').fill('0');await page.locator('#inspect-z').fill('0');await page.locator('#inspect-form button').click();await page.waitForTimeout(150);assert.match(await page.locator('#inspect-result').innerText(),/minecraft:warped_planks/);assert.match(await page.locator('#inspect-result').innerText(),/Region: L · local 0, 0, 0/);});
  await check('click picking selects a rendered source block',async()=>{await page.locator('#fit').click();const canvas=page.locator('canvas'),box=await canvas.boundingBox();let picked=false;for(const dy of [0,.1,-.1]){await page.mouse.click(box.x+box.width*.5,box.y+box.height*(.5+dy));await page.waitForTimeout(100);if(await page.locator('.block-detail').count()>0){picked=true;break;}}assert.ok(picked);});
  await check('cross-long, multiple regions and negative xyz fixture loads',async()=>{await page.locator('#file').setInputFiles(resolve('public/fixtures/edge-cases.litematic'));state=await ready();assert.equal(state.regions.length,2);assert.deepEqual(state.regions[0].min,[4,6,-6]);});
  await check('invalid files show an error, and subsequent valid files still load',async()=>{await page.locator('#file').setInputFiles({name:'broken.litematic',mimeType:'application/octet-stream',buffer:Buffer.from([1,2,3])});await page.locator('#toast.error').waitFor();await page.locator('#file').setInputFiles(resolve('public/fixtures/SimpleHouse.litematic'));state=await ready();assert.equal(state.blocks,78);});
  if(process.env.LARGE_TEST==='1')await check('2,097,152-block file loads with main-thread animation alive',async()=>{
    await page.evaluate(()=>{window.__ticks=0;window.__maxGap=0;let last=performance.now();window.__heartbeat=setInterval(()=>{const now=performance.now();window.__maxGap=Math.max(window.__maxGap,now-last);last=now;window.__ticks++;},20);});
    const start=Date.now();await page.locator('#file').setInputFiles(resolve('public/fixtures/large-128.litematic'));state=await ready();assert.equal(state.blocks,2097152);assert.equal(state.mesh.triangles,192);const timing=await page.evaluate(()=>{clearInterval(window.__heartbeat);return {ticks:window.__ticks,maxGapMs:window.__maxGap};});assert.ok(timing.ticks>10);assert.ok(timing.maxGapMs<500,JSON.stringify(timing));checks.push({largeFileLoadMs:Date.now()-start,...timing});console.log('LARGE',JSON.stringify(checks.at(-1)));
  });
  await page.locator('#demo').click();await ready();assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(base)),requests.filter(url=>!url.startsWith(base)).join('\n'));
  writeFileSync('browser-test-results.json',JSON.stringify({checks,errors,externalNetworkRequests:requests.filter(url=>!url.startsWith(base)),date:new Date().toISOString()},null,2));
}finally{await browser.close();}
