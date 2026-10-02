import ts from 'typescript';
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,join} from 'node:path';
const mode=process.argv[2],entries={test:'tests/core.test.ts',fixtures:'tests/generate-fixtures.ts',benchmark:'tests/benchmark.ts',texturefixtures:'tests/generate-texture-fixtures.ts',pistonfixtures:'tests/generate-piston-fixtures.ts',partialfixtures:'tests/generate-partial-fixtures.ts',chestfixtures:'tests/generate-chest-fixtures.ts',additionsfixtures:'tests/generate-additions-fixtures.ts',lightfixtures:'tests/generate-light-fixtures.ts'};
if(!entries[mode])throw Error('Unknown script');
// Transpile only test dependencies into a disposable directory. No environment-specific loader needed.
function compile(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);if(entry.isDirectory())compile(path);else if(path.endsWith('.ts')){
    const out=join('work','compiled',path.replace(/\.ts$/,'.js'));mkdirSync(dirname(out),{recursive:true});
    const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    writeFileSync(out,source.replace(/(from\s+['"])(\.[^'"]+)(['"])/g,(_,a,p,b)=>a+p+(p.endsWith('.js')?'':'.js')+b));
  }
}}
compile('src');compile('tests');const outfile=join('work','compiled',entries[mode].replace(/\.ts$/,'.js'));
const result=spawnSync(process.execPath,mode==='test'?['--test',outfile,'work/compiled/tests/worker.test.js','work/compiled/tests/textures.test.js','work/compiled/tests/piston.test.js','work/compiled/tests/partial.test.js','work/compiled/tests/additions.test.js','work/compiled/tests/lights.test.js','work/compiled/tests/furnishings.test.js','work/compiled/tests/fluids-controls.test.js']:[outfile],{stdio:'inherit'});
process.exit(result.status??1);
