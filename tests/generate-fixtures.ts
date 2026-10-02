import {writeFileSync,mkdirSync} from 'node:fs';
import {fixture,edgeFixture,demoFixture} from './fixture';
mkdirSync('public/fixtures',{recursive:true});
writeFileSync('public/fixtures/edge-cases.litematic',fixture(edgeFixture()));
writeFileSync('public/fixtures/keep.litematic',fixture(demoFixture(),true,'The Timber Keep'));
console.log('Wrote real gzip/NBT .litematic fixtures.');
