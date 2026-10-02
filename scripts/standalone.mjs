import {rollup} from 'rollup';import {readFileSync,writeFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';
const html=readFileSync('dist/index.html','utf8'),entry=resolve('dist',html.match(/src="([^"]+\.js)"/)[1]);
let script=readFileSync(entry,'utf8'),replaced=0;
script=script.replace(/new Worker\(new URL\(""\+new URL\("([^"]+)",import\.meta\.url\)\.href,import\.meta\.url\),\{type:"module"\}\)/g,(_,path)=>{
  replaced++;const source=readFileSync(resolve(dirname(entry),path),'utf8');
  return `new Worker(globalThis.__bpWorkerURL ??= URL.createObjectURL(new Blob([${JSON.stringify(source)}],{type:"text/javascript"})))`;
});
if(replaced!==1)throw Error(`Standalone worker rewrite expected once, got ${replaced}`);
const bundle=await rollup({input:entry,plugins:[{name:'inline-worker',load(id){if(id===entry)return script;}}]});
const {output}=await bundle.generate({format:'es',inlineDynamicImports:true});await bundle.close();
const code=output[0].code;if(/^import\s/m.test(code))throw Error('Unbundled import in standalone');
const css=readFileSync(resolve('dist',html.match(/href="([^"]+\.css)"/)[1]),'utf8');
const demo=readFileSync('public/fixtures/keep.litematic').toString('base64');
const atlas=readFileSync('public/textures/block-atlas.png').toString('base64');
const licenses='MC Blueprint Viewer · GPL-3.0 · Complete source included in MC-Blueprint-Viewer.zip\n\n'+readFileSync('LICENSE','utf8')+'\n\n'+readFileSync('THIRD-PARTY-LICENSES.txt','utf8');
const favicon=html.match(/<link[^>]*rel="icon"[^>]*>/)?.[0]??'';
const standalone=`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1b231e">${favicon}<title>MC Blueprint Viewer · Offline</title><style>${css.replaceAll('</style','<\\/style')}</style></head><body><div id="app"></div><script id="licenses" type="text/plain">${licenses.replaceAll('</script','<\\/script')}</script><script id="embedded-atlas" type="application/octet-stream">${atlas}</script><script id="embedded-demo" type="application/octet-stream">${demo}</script><script type="module">${code.replaceAll('</script','<\\/script')}</script></body></html>`;
writeFileSync('dist/standalone.html',standalone);writeFileSync('MC-Blueprint-Viewer.html',standalone);writeFileSync('../MC-Blueprint-Viewer.html',standalone);
console.log(`Standalone offline HTML: ${(Buffer.byteLength(standalone)/1024).toFixed(1)} KiB`);
