// Static file server only. Schematic data is never sent to this process.
import {createServer} from 'node:http';import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.litematic':'application/octet-stream','.txt':'text/plain; charset=utf-8'};
await stat(resolve(root,'index.html')).catch(()=>{console.error('Build missing. Run npm install and npm run build first.');process.exit(1);});
let port=Number(process.env.PORT)||4180;
const server=createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try{const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{if(e.code==='EADDRINUSE'&&port<4280){port++;server.listen(port,'127.0.0.1');}else{console.error(e.message);process.exit(1);}});
server.on('listening',()=>{const url=`http://127.0.0.1:${port}/`;console.log(`MC Blueprint Viewer: ${url}\nAll .litematic files are processed in your browser. Press Ctrl+C to stop.`);if(process.argv.includes('--open')){
  if(process.platform==='win32')spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});
  else spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'});
}});server.listen(port,'127.0.0.1');
