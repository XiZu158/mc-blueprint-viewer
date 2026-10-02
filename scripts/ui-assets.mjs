import {readFileSync,writeFileSync} from 'node:fs';
// Embed the supplied textures directly so the UI works in Vite and in the offline HTML.
const tiles=Object.fromEntries(['stone_bricks','oak_planks','grass_block_side'].map(name=>[name,'data:image/png;base64,'+readFileSync(`public/textures/block/${name}.png`).toString('base64')]));
writeFileSync('src/generated/ui-tiles.ts','// Generated from the project\'s block.zip textures by scripts/ui-assets.mjs.\nexport const uiTiles = '+JSON.stringify(tiles,null,2)+' as const;\n');
