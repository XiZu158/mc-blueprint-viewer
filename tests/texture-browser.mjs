import {chromium} from '@playwright/test';import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const base=process.env.VIEWER_URL||'http://127.0.0.1:4180';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],checks=[];const page=await browser.newPage({viewport:{width:1920,height:1200}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function ready(file){await page.waitForFunction(f=>window.__blueprint?.ready&&(!f||window.__blueprint.file===f),file,{timeout:120000});await page.waitForTimeout(150);return page.evaluate(()=>window.__blueprint);}
async function load(name){await page.locator('#file').setInputFiles(resolve('public/fixtures/'+name+'.litematic'));return ready(name+'.litematic');}
try{
  await page.goto(base);const keep=await ready();assert.equal(keep.blocks,5126);assert.equal(keep.textures.loaded,true);assert.equal(keep.textures.count,1152);assert.deepEqual(keep.textures.missing,[]);assert.ok(keep.textures.used.includes('grass_block_side')&&keep.textures.used.includes('grass_block_top')&&keep.textures.used.includes('oak_log_top'));
  await page.screenshot({path:'texture-keep.png'});checks.push('real Keep: supplied textures, exact totals and no missing textures');
  const gallery=await load('texture-gallery');assert.equal(gallery.blocks,1080);assert.equal(gallery.textures.missing.length,2);
  for(const name of ['furnace_front','furnace_front_on','furnace_side','furnace_top','crafting_table_top','crafting_table_front','oak_log','oak_log_top','glass_pane_top','water_still','water_flow'])assert.ok(gallery.textures.used.includes(name),name);
  assert.ok(!gallery.textures.used.includes('__missing__'));await page.locator('#render-missing').check();await page.waitForTimeout(200);assert.ok((await ready()).textures.used.includes('__missing__'));
  await page.screenshot({path:'texture-gallery-iso.png'});await page.locator('#orthographic').click();await page.locator('#view').selectOption('top');await page.waitForTimeout(250);await page.screenshot({path:'texture-gallery-top.png'});checks.push('gallery: four facings, three axes, partial geometry, cutout, blend and explicit missing material');
  const detail=await load('texture-detail');assert.equal(detail.blocks,174);await page.locator('#perspective').click();await page.locator('#fit').click();await page.waitForTimeout(300);await page.screenshot({path:'texture-detail-iso.png'});
  await page.locator('#orthographic').click();await page.locator('#view').selectOption('front');await page.waitForTimeout(250);await page.screenshot({path:'texture-detail-front.png'});checks.push('detail screenshots: model shape, image orientation and alpha inspection');
  await page.locator('#file').setInputFiles(resolve('public/fixtures/keep.litematic'));await ready();await page.locator('#perspective').click();await page.locator('#fit').click();await page.waitForTimeout(600);
  const a=await page.locator('canvas').screenshot();await page.waitForTimeout(230);const b=await page.locator('canvas').screenshot();assert.notDeepEqual(a,b,'Animated atlas frames must update rendered pixels');checks.push('water/lantern animation updates actual rendered pixels');
  await page.locator('#file').setInputFiles(resolve('public/fixtures/SimpleHouse.litematic'));const house=await ready();assert.equal(house.blocks,78);assert.deepEqual(house.textures.missing,[]);await page.screenshot({path:'texture-real-house.png'});checks.push('external real SimpleHouse: 78 blocks, no missing textures');
  await page.goto(pathToFileURL(resolve('MC-Blueprint-Viewer.html')).href);await ready();assert.equal((await load('texture-detail')).blocks,174);assert.ok((await page.evaluate(()=>window.__blueprint.textures)).loaded);checks.push('offline file:// includes atlas and renders real file with no source ZIP path');
  assert.deepEqual(errors,[]);writeFileSync('texture-browser-results.json',JSON.stringify({url:base,checks,errors,screenshots:['texture-keep.png','texture-gallery-iso.png','texture-gallery-top.png','texture-detail-iso.png','texture-detail-front.png','texture-real-house.png'],date:new Date().toISOString()},null,2));
  console.log('PASS',checks.join('\nPASS '));
}finally{await browser.close();}

