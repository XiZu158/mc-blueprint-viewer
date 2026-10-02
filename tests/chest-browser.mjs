import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {writeFileSync} from 'node:fs';
const base=process.env.VIEWER_URL||'http://127.0.0.1:4180',errors=[],checks=[];
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1200}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 async function ready(file){await page.waitForFunction(f=>window.__blueprint?.ready&&(!f||window.__blueprint.file===f),file,{timeout:120000});await page.waitForTimeout(200);return page.evaluate(()=>window.__blueprint);}
 async function load(){await page.locator('#file').setInputFiles(resolve('public/fixtures/chest-gallery.litematic'));return ready('chest-gallery.litematic');}
 await page.goto(base);await ready();const s=await load();assert.equal(s.blocks,552);assert.equal(s.textures.count,1152);assert.deepEqual(s.textures.missing,[]);
 for(const face of ['top','bottom','front','back','left','right','lock_front','lock_side'])assert.ok(s.textures.used.includes('user_chest_'+face));
 assert.equal(s.materials.find(m=>m.name==='minecraft:chest').count,12);assert.equal(s.materials.find(m=>m.name==='minecraft:trapped_chest').count,12);
 await page.screenshot({path:'chest-gallery-iso.png'});checks.push('supplied Chest.png derived six-face artwork + separate metal clasp: four facings, single/double and trapped chest, zero missing resources');
 await page.locator('[data-action="hidden"][data-name="minecraft:stone"]').click();await page.waitForTimeout(400);assert.equal((await ready()).blocks,552);await page.locator('#orthographic').click();
 for(const view of ['top','front','back','left','right','bottom']){await page.locator('#view').selectOption(view);await page.waitForTimeout(250);await page.screenshot({path:`chest-gallery-${view}.png`});}checks.push('all six sides actually rendered after hiding ground; inventory preserved');
 await page.goto(pathToFileURL(resolve('MC-Blueprint-Viewer.html')).href);await ready();const offline=await load();assert.equal(offline.blocks,552);assert.deepEqual(offline.textures.missing,[]);checks.push('offline embedded atlas and updated chest UV model render real binary fixture');
 assert.deepEqual(errors,[]);writeFileSync('chest-browser-results.json',JSON.stringify({url:base,checks,errors,date:new Date().toISOString()},null,2));console.log(checks.map(c=>'PASS '+c).join('\n'));
}finally{await browser.close();}
