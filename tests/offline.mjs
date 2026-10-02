import{chromium}from'@playwright/test';import{resolve}from'node:path';import{pathToFileURL}from'node:url';import{readFileSync,writeFileSync}from'node:fs';import assert from'node:assert/strict';
const b=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await b.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const url=pathToFileURL(resolve('MC-Blueprint-Viewer.html')).href;
async function ready(){await page.waitForFunction(()=>window.__blueprint?.ready,{},{timeout:120000});return page.evaluate(()=>window.__blueprint);}
try{
  await page.goto(url);const demo=await ready();assert.equal(demo.blocks,5126);assert.equal(demo.regions.length,2);await page.screenshot({path:'offline-screenshot.png'});
  // Disable all HTTP(S) access and prove real local files still parse and render.
  await page.route(/^https?:/,route=>route.abort());
  for(const [file,total]of[['Lite',122],['SimpleHouse',78],['large-128',2097152]]){await page.locator('#file').setInputFiles(resolve(`public/fixtures/${file}.litematic`));const s=await ready();assert.equal(s.blocks,total);console.log('PASS offline real file',file,total);}
  await page.locator('#search').fill('stone');assert.equal(await page.locator('.material').count(),1);await page.locator('[data-action="highlight"]').click();await page.waitForTimeout(250);await ready();
  await page.locator('#layer-mode').selectOption('single');await page.waitForTimeout(250);const layer=await ready();assert.equal(layer.mesh.triangles,96);
  const event=page.waitForEvent('download');await page.locator('[data-export="json"]').click();const download=await event,obj=JSON.parse(readFileSync(await download.path(),'utf8'));assert.equal(obj.totalBlocks,2097152);
  await page.locator('#demo').click();assert.equal((await ready()).blocks,5126);assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u===url||u.startsWith('blob:')));
  writeFileSync('offline-test-results.json',JSON.stringify({urlScheme:'file://',demoBlocks:5126,externalFixtures:['Lite','SimpleHouse'],largeBlocks:2097152,checks:['embedded real gzip demo','real local file loading','Worker Blob execution','2M-block input','highlight','Y layer','JSON export','reload demo','zero HTTP(S) network access'],errors,networkRequests:requests.filter(u=>u.startsWith('http')),date:new Date().toISOString()},null,2));
}finally{await b.close();}
