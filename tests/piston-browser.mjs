import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {writeFileSync} from 'node:fs';
const base=process.env.VIEWER_URL||'http://127.0.0.1:4180',errors=[],checks=[];
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1200}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 async function ready(file){await page.waitForFunction(f=>window.__blueprint?.ready&&(!f||window.__blueprint.file===f),file,{timeout:120000});await page.waitForTimeout(200);return page.evaluate(()=>window.__blueprint);}
 async function load(file){await page.locator('#file').setInputFiles(resolve('public/fixtures/'+file+'.litematic'));return ready(file+'.litematic');}
 await page.goto(base);await ready();const g=await load('piston-gallery');assert.equal(g.blocks,1090);assert.deepEqual(g.textures.missing,[]);
 for(const texture of ['piston_side','piston_inner','piston_top','piston_top_sticky','piston_bottom','anvil','anvil_top','chipped_anvil_top','damaged_anvil_top'])assert.ok(g.textures.used.includes(texture),texture);
 assert.equal(g.materials.find(m=>m.name==='minecraft:piston_head').count,24);await page.screenshot({path:'piston-gallery-iso.png'});
 await page.locator('#orthographic').click();await page.locator('#view').selectOption('top');await page.waitForTimeout(300);await page.screenshot({path:'piston-gallery-top.png'});checks.push('six directions, normal/sticky heads, short/full rods, extended/retracted bases, anvils; zero missing textures');
 const d=await load('piston-detail');assert.equal(d.blocks,256);assert.deepEqual(d.textures.missing,[]);await page.locator('#perspective').click();await page.locator('#fit').click();await page.waitForTimeout(300);await page.screenshot({path:'piston-detail-iso.png'});
 await page.locator('#orthographic').click();await page.locator('#view').selectOption('front');await page.waitForTimeout(300);await page.screenshot({path:'piston-detail-front.png'});checks.push('actual detail views show open rod space and thin head plates');
 await page.locator('#search').fill('piston_head');await page.locator('[data-action="isolate"]').click();await page.waitForTimeout(400);const isolated=await ready();assert.equal(isolated.blocks,256);assert.ok(isolated.mesh.triangles<d.mesh.triangles);assert.deepEqual(isolated.textures.missing,[]);checks.push('isolation rebuild retains complete exact inventory');
 await page.locator('#clear-materials').click();await page.waitForTimeout(400);await ready();await page.locator('#layer-mode').selectOption('single');await page.waitForTimeout(400);assert.equal((await ready()).blocks,256);checks.push('Y layer rebuild retains exact inventory');
 for(const mode of ['Blueprint','X-Ray','Wireframe','Solid','Normal'])await page.locator(`[data-mode="${mode}"]`).click();await page.waitForTimeout(150);checks.push('all render modes compile without shader errors');
 await page.goto(pathToFileURL(resolve('MC-Blueprint-Viewer.html')).href);await ready();assert.equal((await load('piston-gallery')).blocks,1090);assert.deepEqual((await page.evaluate(()=>window.__blueprint.textures)).missing,[]);checks.push('offline file:// updated geometry and pack textures work');
 assert.deepEqual(errors,[]);writeFileSync('piston-browser-results.json',JSON.stringify({url:base,checks,errors,date:new Date().toISOString()},null,2));console.log(checks.map(c=>'PASS '+c).join('\n'));
}finally{await browser.close();}
