# Fixture 来源

- `additions-gallery.litematic`：本项目独立位流/NBT 写入器生成，721 个方块、13 个真实 Entities 项；六向展示框、负尺寸 Region、无效绝对 Tile 坐标干扰、堆肥桶九个 level、蜂蜜六面与气泡柱/水。
- `additions-detail.litematic`：207 个方块、3 个展示框，供实际贴图/透明/开口细节截图验证。

- `keep.litematic`：本项目 `tests/fixture.ts` 生成的真实 gzip + Java NBT 二进制投影；两个 Region，用于默认示例。
- `edge-cases.litematic`：本项目独立 BigInt 位流写入器生成；5-bit Palette、跨 Long、非零空气索引、负 XYZ 尺寸、多 Region、重复 BlockState 属性顺序。
- `large-128.litematic`：本项目基准程序生成；128³ = 2,097,152 个实心石头方块，用于大文件实测。
- `SimpleHouse.litematic`、`Lite.litematic`、`ArmorStand.litematic`、`Subversion.litematic`：来自 [SmylerMC/litemapy 测试文件](https://github.com/SmylerMC/litemapy/tree/e830fcd6c4c518adc097ac215e3390470a5c4686/tests/litematics/valid)。这是与本项目生成器独立的真实文件。原项目作者 SmylerMC，GPL-3.0 许可，见同目录 `LITEMAPY-LICENSE.txt`。

解码规则核对来源：Litematica 原作者的 [LitematicaBitArray.java](https://github.com/maruohon/litematica/blob/pre-rewrite/fabric/1.20.1/src/main/java/fi/dy/masa/litematica/schematic/container/LitematicaBitArray.java)、[LitematicaBlockStateContainer.java](https://github.com/maruohon/litematica/blob/pre-rewrite/fabric/1.20.1/src/main/java/fi/dy/masa/litematica/schematic/container/LitematicaBlockStateContainer.java)、[LitematicaSchematic.java](https://github.com/maruohon/litematica/blob/pre-rewrite/fabric/1.20.1/src/main/java/fi/dy/masa/litematica/schematic/LitematicaSchematic.java)。只核对格式行为，未复制其 Java 实现。

## Lighting geometry fixtures

light-gallery.litematic and light-detail.litematic are independently written gzip NBT fixtures from tests/generate-light-fixtures.ts: 48 / 16 lighting states and exact totals 579 / 242. Palette, properties and coordinates are explicit; no Minecraft world or external file is required. Model data references and visual results: UI-LIGHTING-REPORT.md.

