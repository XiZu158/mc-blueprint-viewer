// Node worker_threads adapter exercises the same browser Worker module, not a duplicated implementation.
import {parentPort} from 'node:worker_threads';
const g=globalThis as any;g.self=g;g.postMessage=(value:any,transfer:any[]=[])=>parentPort!.postMessage(value,transfer);
await import('../src/worker.js');
parentPort!.on('message',data=>g.onmessage({data}));parentPort!.postMessage({type:'ready'});
