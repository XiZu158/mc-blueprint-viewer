# Chest.png 补齐资源与生成记录

输入：用户提供的 `Chest.png` 三面等轴视图，原文件已无损复制到 `reference-Chest.png`。它不是可直接用于实体模型的原版 UV 贴图。

使用内置 `image_gen` 工具（imagegen skill，style-transfer）按该图的金棕色木纹、深色边框和银色锁扣重绘平面图，并推断另一侧、背面、底面。未下载其他材质。生成文件为 `chest-sheet.png`，4×2 的格序是 top / front / right / back / bottom / left / lock_front / lock_side。

`scripts/import-chest.mjs` 用浏览器 Canvas 的最近邻采样，将这张已生成的纹理页导入为 8 张 16×16 资源 `../block/user_chest_*.png`。这些贴图和原始 1112 张图一起进入既有共享图集，不单独逐箱子加载。`tile-layout.json` 记录格序、尺寸与路径。

箱体、箱盖按真实高度比例裁切侧面 UV，避免重复绘制箱盖分界线；锁扣是独立几何，使用独立金属面。双箱前/后/顶/底使用连续半幅 UV 并剔除内部侧面，接缝不出现深色外框。陷阱箱沿用普通箱木质外观、锁扣加轻微暖红着色以区分，这是根据该参考图补齐的近似外观。末影箱未提供专用外观，继续使用显式缺失材质。

隐藏面及重绘面的细节属于根据参考图的补齐，不保证与未提供的官方实体纹理逐像素一致。原参考图片权利不因代码许可而改变。

## 实际生成提示词

```text
Use case: style-transfer. Asset: production Minecraft chest flat texture sheet for a browser Three.js viewer. The reference image Chest.png is the user's chest with warm ochre pixel wood and very dark charcoal border, shown isometrically. Convert its recognizable wood color and chunky pixel wood-grain style into a FLAT ORTHOGRAPHIC game texture sheet, infer the invisible matching surfaces. Output ONE perfectly aligned 4-column by 2-row rectangle of eight equal square tiles, full bleed with ZERO gaps, ZERO labels, ZERO outer margins, ZERO perspective, ZERO shadows, no scene. Each tile is an exact coarse 16x16 logical pixel grid with hard pixel edges and only flat pixel colors, enlarged nearest-neighbor. Tile order left-to-right: row 1 = TOP, FRONT WITHOUT LATCH, RIGHT SIDE, BACK; row 2 = BOTTOM, LEFT SIDE, SILVER LATCH FRONT, SILVER LATCH SIDE. The six wood faces MUST match the reference's warm brown/golden chest; dark one-pixel framing around every outer wood tile. Top and bottom have pixel plank grain, no lid seam. Front/right/back/left have the same consistent horizontal dark lid seam around row 4 of 16 and matching wood grain, no silver latch painted on any wood face because the latch is separate geometry. Infer back/left/bottom conservatively from this same chest, no unrelated designs. Final two metal tiles are all solid silver/grey pixel metal, a few chunky vertical tonal steps matching the reference latch (no wood, no background), ready to map to a small rectangular clasp. Neutral albedo colors across all wood sides (avoid the baked dark lighting in the isometric reference, lighting comes from the viewer). Preserve restrained vanilla Minecraft pixel-art style. No text, no icons, no watermarks, no blended edges. Aspect ratio 2:1, e.g. 2048 by 1024 pixels with exact 512x512 cells.
```
