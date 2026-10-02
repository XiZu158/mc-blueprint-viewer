# 实际测试报告

验证日期：2026-10-02（Asia/Shanghai），保留 2026-10-01 的基准记录。环境：Windows，Node.js v24.21.0，Chrome / Chromium 的软件 WebGL 测试环境。记录为本机实测，不是对所有机器和所有建筑的速度保证。新增贴图、真实展示框实体、语言和图标专项见 ADDITIONS-TEST-REPORT.md。

## 构建与运行

- TypeScript 严格检查、Vite 生产构建、标准静态版本与内嵌 Blob Worker 单文件版本均成功。
- `npm run dev` 实际启动并通过浏览器功能测试。
- `node scripts/serve.mjs` 启动预构建版本；服务器只接收静态 GET/HEAD，没有投影上传接口。
- 单文件 HTML 在 `file://` 环境直接运行；无需 Node.js、服务器或网络。

## 核心、Worker、贴图与多部件模型：43 / 43 通过

`npm test` 的实际测试范围：

1. NBT 标签 1–12、signed Long、Modified UTF-8、NUL、非 BMP Unicode。
2. 独立 BigInt 写入器与解码器对照：2、3、4、5、6、7、8、9、10、11、12、15、16、17、20、31、32 bit；每个宽度 1003 项，覆盖重复 32/64 位跨界及最高位为 1 的 Long。
3. gzip / 原始 NBT 一致；Palette 空气非零索引；X/Z/Y 顺序；材料逐格独立累计。
4. 正负尺寸组合、负 XYZ、-1 边界与最小角坐标。
5. 单元素 Palette、void air、模组方块、未知属性、属性名 `kind`、fallback。
6. 损坏 gzip、截断 NBT、索引越界、Packed Long 长度错误、零尺寸与超限体积。
7. 重叠 Region 独立统计与元数据不一致提示。
8. 32³ 实心块合并成 12 个三角形；隐藏材料、单层切面。
9. 相邻 chunk 不产生内部面；三角绕序和法线向外。
10. stairs facing/half/shape、slab double、fence、pane、door、chain axis、原木端面 axis。
11. 材料隔离、X 剖切暴露正确切面、十亿级正负原始坐标仍保留整数偏移。
12. 独立外部真实文件验证。
13. Worker 输入 ArrayBuffer 真正转移，decoded arrays 不回传主线程；负坐标 Inspector 与 Region 空筛选。
14. 96³ 棋盘结构（442,368 个非空气方块）触发 200 万三角形保护，原始材料数量不变；单层重建恢复、Inspector 继续工作、取消与替换任务成功。
15. 蜂蜜内外壳与六面、堆肥桶九级填充和开口、气泡柱/水资源一致、真实展示框实体的六向/旧格式/负尺寸原始位置、分别计数和实际射线选中、材料名称与语言消息。

## 外部真实样本

来自 SmylerMC/litemapy，来源及 GPL 许可见 `public/fixtures/PROVENANCE.md`。

| 文件 | 解码非空气方块 | 检查内容 |
|---|---:|---|
| SimpleHouse.litematic | 78 | 5 × 6 × 5、完整状态 Palette、门、楼梯、植物、玻璃板 |
| Lite.litematic | 122 | 4 个 Region、全部负 Y 尺寸、原始偏移与负 X 坐标 |
| ArmorStand.litematic | 9 | 包含实体 NBT，方块查看不受实体数据影响 |
| Subversion.litematic | 8 | SubVersion 和负 Z 尺寸 |

四个文件的实际解码总量均与其元数据一致。Lite 材料为 warped_planks 41、bedrock 30、obsidian 29、crimson_planks 22。

## 浏览器实际交互

标准静态版本的 11 组功能检查通过：真实二进制示例；Perspective / Orthographic；标准视图及五种渲染模式；搜索/排序/隐藏/隔离/高亮；Y Layer、X/Z 控件、Region 显隐；CSV、JSON、TXT、PNG 实际下载及内容校验；外部真实样本；输入坐标 Inspector；点击拾取；跨 Long/负尺寸 fixture；损坏文件报错后恢复；209 万方块加载与主线程响应。

最新生产版本大体积浏览器记录：2,097,152 方块，端到端加载 864 ms；20 ms 页面计时器执行 43 次，最大间隔约 21.4 ms。使用软件 WebGL。页面错误 0，外部网络请求 0。见 `browser-test-results.json`。

单文件离线版通过：真实内嵌 gzip 示例、外部 Lite/SimpleHouse、209 万方块文件、Blob Worker、材料高亮、Y 单层、完整 JSON 导出、重新加载示例；HTTP(S) 被拦截时依然通过，页面错误与外部请求均为 0。Chrome 和 Edge 均已实测通过。见 `offline-test-results.json`。

## 几何基准

`npm run benchmark`；实心 stone 体积，是贪心面合并的最佳情况。

| 体积 | 精确方块数 | 解压/NBT/解码 | 几何生成 | 非空 chunk | 三角形 |
|---|---:|---:|---:|---:|---:|
| 128³ | 2,097,152 | 29.3 ms | 364.3 ms | 56 | 192 |
| 256³ | 16,777,216 | 203.1 ms | 2,803.7 ms | 296 | 768 |

完整原始记录见 `benchmark-results.json`。该基准不包括 fixture 写入时间，不代表棋盘稀疏结构或复杂部分形状的渲染成本。分块内部面剔除成功；没有逐方块普通 Mesh。

## 明确的交付范围

真实 `.litematic` 解码、原始坐标和非空气方块统计已验证。材料统计是方块数量而非背包物品消耗，重叠 Region 分别计数。视觉采用用户 block.zip 中 1112 张贴图、Chest.png 衍生的 8 个箱子面和多部件 BlockState 模型；缺失资源使用紫黑棋盘，未知几何以立方体保留。贴图专项测试及实际截图见 TEXTURE-TEST-REPORT.md。实体不渲染。总 Region 体积上限 6400 万格、NBT 解压上限 768 MiB、当前可见几何上限 200 万三角形，超限可通过筛选缩小视图；文件数据与材料不被截断。


