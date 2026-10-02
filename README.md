# MC Blueprint Viewer

可直接打开真实 `.litematic` 的纯浏览器应用。TypeScript + Vite + Three.js；所有投影解压、NBT 解析、方块解码和几何生成都在浏览器 Worker 内完成，没有上传接口、遥测、外部字体或 CDN 依赖。

## 直接运行

**直接双击 `MC-Blueprint-Viewer.html`**，用支持 WebGL 的现代 Chrome、Edge 或 Firefox 打开，即可离线加载 `.litematic`。这个约 2 MiB 的单文件版内嵌全部脚本、用户纹理图集、Blob Worker、许可文本和真实二进制示例，不需要 Node.js、服务器或网络。已自动验证 `file://` 环境下的外部真实样本、209 万方块文件、筛选与导出。

**Windows 静态服务器方式：双击 `start.cmd`。** 需要已安装 Node.js；发行包可包含构建完成的 `dist/`，这种情况下无需安装 npm 依赖。从 GitHub 下载源码时，先执行 `npm ci` 和 `npm run build` 生成 `dist/`；离线单文件 `MC-Blueprint-Viewer.html` 可直接打开。脚本会启动仅监听本机的静态服务器并打开浏览器，默认地址 `http://127.0.0.1:4180/`；占用时自动换端口。关闭终端或 Ctrl+C 停止服务。

跨平台运行：

```sh
node scripts/serve.mjs
```

也可将 `dist/` 放到任意静态 HTTP(S) 服务器上。标准 `dist/index.html` 使用模块 Worker，需要 HTTP(S)；离线双击请选择根目录的 `MC-Blueprint-Viewer.html` 或 `dist/standalone.html`。

## 开发与验证

构建工具要求 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
npm test
npm run benchmark
npm run build
npm run preview
```

`npm run fixtures` 重建自定义二进制 fixture。`npm run benchmark` 同时生成 128³ 大体积 fixture。自动化浏览器测试：先启动预览，再运行 `npm run test:browser`。可通过 `VIEWER_URL` 设置地址、`BROWSER_PATH` 设置 Chrome/Chromium 可执行文件路径、`LARGE_TEST=1` 启用大体积浏览器测试。默认 Windows Chrome 路径和验证地址见 `tests/browser.mjs`。离线双击版验证运行 `node tests/offline.mjs`。`npm run build` 同时构建标准静态版与单文件离线版。

## 已实现

- gzip / 原始 Java NBT，所有标准 NBT 标签 1–12，Modified UTF-8，保留 Long 完整位模式。
- Regions、任意 Palette 空气位置、全局 BlockState 去重、连续 Packed Long 位流、跨 32/64 位边界、负尺寸、多 Region 和原始坐标。
- 精确非空气方块统计；按 Name 聚合并保留逐 BlockState 数量。隐藏、隔离、楼层、剖切和 Region 显隐不修改完整材料统计。
- 32³ 分块；实心面贪心合并、邻接面剔除、非立方体形状合入同一分块几何；每个有几何的 chunk 一个 Mesh，禁止逐方块普通 Mesh。GPU 自动视锥裁剪；Worker 分块发送可转移数组并允许取消/替换任务。
- 简化 stairs（facing / half / inner、outer shape）、slab（top / bottom / double）、door（half / facing / open / hinge）、trapdoor、fence、wall、pane、gate、carpet、snow、chain axis。原木与柱体按 axis 区分端面配色。未支持、模组方块保留原始属性并使用立方体 fallback。
- 随附用户提供的 block.zip：1112 张 PNG、102 份原始元数据；54 种动画。根据方块命名空间、六面、facing / axis / half / lit / hinge 等属性选择贴图与 UV。原木端面、草顶/侧/底、工作台、熔炉正面、门上下半、玻璃板边缘分别映射。
- 根据用户的 `Chest.png` 补齐六面及锁扣，共新增 8 张 16² 贴图；普通/陷阱箱的箱盖、箱体、锁扣分别裁切 UV，支持四向、单箱、左右双箱无内部边框的连接。隐藏面由参考图推断，不声称是原版实体 UV 文件。来源、完整生成提示词和导入流程见 `public/textures/chest/PROVENANCE.md`。
- 根据 Honey_Block.png / Composter.png 补绘平面六面、蜂蜜内芯和桶内壁/底面；16 张追加贴图包含直接导入的 Item_Frame.png。堆肥桶中空并支持 level 0–8；蜂蜜有完整视觉外壳和内缩核心，材质半透明。气泡柱直接使用水的六面动画、默认着色和透明度。
- 从各 Region 的真实 Entities NBT 读取普通/荧光展示框：保留相对 Region Position 的浮点 Pos，支持六向与旧版 Direction，合入 chunk、过滤与检查。展示框数量和导出与方块库存分开，不计入 TotalBlocks；物品内容 ID 在 Inspector 显示，物品模型本轮不渲染。
- 页首中文 / English 切换并保存选择；常见材料名称翻译，始终保留原始 ID / BlockState，搜索支持两种语言。材料图标从当前共享图集的实际六面资源和着色生成并缓存；未知资源显示同一紫黑缺失图。
- 活塞头板与连杆支持六向、normal/sticky、short；伸出底座使用 piston_inner。中继器支持四档延迟、powered/locked，比较器支持 powered/mode；铁砧、漏斗开口/出口、平面/转弯/上坡轨道、红石连接/爬升、按钮安装面、压力板、蛋糕 bites、阳光传感器与炼药锅液位使用部分形状。细部面纹理独立缓存后合入 chunk，不创建逐方块 Mesh。伸出所属格的连杆点击仍能找到来源方块。
- 2048² 共享图集，2 像素边缘扩展，最近邻采样、无 mipmap；贪心面按每格重复贴图，部分形状裁切 UV。透明镂空与半透明分别使用共享材质；灰度草叶/水默认着色，已带颜色的资源不重复染色；动画遵循帧序、逐帧时长与 interpolate。
- 材料搜索（含原始 BlockState）、数量/名称排序、隐藏、隔离、高亮；Y 层与向下累积；X/Z 剖切；Region 显隐。
- 点击或输入精确坐标进行 Inspector 检查；保留 Region 名称、局部坐标、所有 Properties。
- Perspective / Orthographic、六个标准视图与等轴视图、Fit Building；Normal / Blueprint / X-Ray / Wireframe / Solid。
- 完整材料 CSV / JSON / TXT 导出，以及当前画布 PNG 截图。
- 拖入文件、本地真实二进制城堡示例、错误提示和加载恢复、后台取消。

## 计数与坐标语义

Packed 索引 `i = x + z*abs(size.x) + y*abs(size.x)*abs(size.z)`。Region 最小角逐轴为 `position + min(0, size + 1)`；数组从最小角向正方向增长，负尺寸不会镜像数组。显示坐标是相对投影原点的原始整数坐标，没有人为归零。仅渲染时做居中偏移，避免远坐标导致 GPU 浮点误差。

`air`、`cave_air`、`void_air` 不计入材料。元数据 TotalBlocks 只用于核对，实际计数来自全部解码格。**重叠 Region 各自独立累计**；界面会提示可能重复统计的坐标。

导出的 count 是**精确方块数量**，并不是游戏背包物品需求：门上下半分别占一格，double slab 是一格；不推断背包物品、合成配方、掉落或模组物品映射。`×64` 只是方块数量的分组显示，不代表实际堆叠上限。

## 性能边界与视觉范围

- 支持总 Region 体积最多 64,000,000 格，解压 NBT 上限 768 MiB。使用 Uint32Array 保存解码数据，不创建逐方块 JS 对象。
- 几何视图上限 2,000,000 个三角形，约 312 MB 属性数组，另有 GPU 内存开销。触发时清除未完成画面，完整数据与材料仍保留，选择单层/剖切/隔离后可继续生成。该保护针对稀疏、复杂或大量部分形状建筑，不改变解析结果。
- 本次压缩包只有图片与元数据，没有 JSON 模型或 blockstates；新增常见多部件形状并保留既有形状。末影箱、床等仍缺专用实体材质；模组命名空间及未建立映射的状态显示紫黑棋盘，界面明确列出缺失面与资源名。灯笼、植物、移动中活塞及其他未覆盖的复杂原版模型仍可能 fallback；不声称覆盖所有版本的全部方块。展示框实体已支持，其他实体不渲染；展示框物品模型、地图内容及发光效果未覆盖。未命名材料的中文名称回退到可识别的原始英文/ID。
- X-Ray 使用表面透明材质；Wireframe 显示合并后几何的三角线。跨不同 Region 不做面合并，重叠 Region 可能存在共面闪烁，可隐藏其中一个 Region。
- 实测与限制见 `TEST-REPORT.md`、`benchmark-results.json` 和 `browser-test-results.json`。实心基准是贪心合并的最佳情况，不能等同于所有建筑的性能。

## 目录

`src/core/`：NBT、解析、坐标、模型与几何核心；`src/worker.ts`：后台任务与数据所有权；`src/viewer/`：相机、绘制与拾取；`src/main.ts`：界面与导出；`tests/`：独立二进制写入器、核心/浏览器测试和基准；`public/fixtures/`：自生成与外部真实样本，来源见 `PROVENANCE.md`。

项目按 GPL-3.0 许可交付，完整源码与 LICENSE 已附。Three.js 的 MIT 许可保留于 `THIRD-PARTY-LICENSES.txt`。外部测试样本作者与许可见 `public/fixtures/PROVENANCE.md`。

## 贴图位置、记录与复验

原始 PNG / `.mcmeta` 位于 `public/textures/block/`，构建后复制至 `dist/textures/block/`；运行实际使用 `block-atlas.png`，没有对用户电脑绝对路径的依赖。逐文件 SHA256、尺寸、透明分类、动画及元数据见 `public/textures/import-report.json`。来源与边界见 `public/textures/PROVENANCE.md`。该来源素材的权利仍属于各自权利人，不由项目代码许可重新授权。

六面与状态规则在 `src/core/textures.ts`；实际 fixture 的逐状态、逐面映射与缺失清单在 `public/textures/mapping-report.json`。加载任意真实文件时也会重新生成界面的缺失诊断。Biome 信息缺失时采用固定默认灰度着色，无法还原建造地点的真实生物群系。

已有原始资源随项目交付，重建图集无需再次访问原压缩包路径。使用安装了 Pillow 的 Python 执行 `python scripts/import-textures.py public/textures/block`（导入脚本支持同目录重建）。随后 `npm run fixtures:textures`、`npm test`、`npm run build`。`python scripts/verify-atlas.py` 逐像素校验所有源帧与透明度；`npm run test:textures` 在运行中的服务器测试真实渲染、动画及离线版。测试结果见 `TEXTURE-TEST-REPORT.md`。

当前合计 1136 PNG（1112 原压缩包 + 8 箱子面 + 16 本轮追加），48 项核心自动测试。追加 fixture 的重建命令为 `npm run fixtures:pistons`、`npm run fixtures:partials`、`npm run fixtures:chests`、`npm run fixtures:additions`；运行中的生产/开发服务可执行对应的 `npm run test:pistons`、`npm run test:partials`、`npm run test:chests`、`npm run test:additions`。本轮实现、实际渲染与边界见 `ADDITIONS-TEST-REPORT.md`；前轮记录见 `PARTIAL-BLOCK-REPORT.md`。

## Minecraft 工作台界面与照明方块

界面加入真实草方块、工作台、箱子图标，像素边框、石质按钮、背包格和经验条进度。材料图标使用实际部分方块模型。火把支持直立 / 四向壁挂、灵魂 / 红石 / 铜变体；灯笼支持悬挂和镂空提环；锁链支持三轴镂空几何，继续复用原图集与动画。新实现及真实渲染验证见 [UI-LIGHTING-REPORT.md](UI-LIGHTING-REPORT.md)。

`npm run fixtures:lights` 重建 48 状态二进制样例，`npm run test:lights` 测试实际页面（预览 4180 + 开发 5190）。UI 静态纹理重建使用 `node scripts/ui-assets.mjs`，原始资源均已包含。双击离线 HTML 仍无需服务器和网络。

## 本批最小更新：装饰方块与火焰

当前共 1152 PNG、1693 图集帧，53 项自动测试通过。补齐末影箱、脚手架，统一云杉木告示牌，接入 16 色地毯和普通/灵魂火焰动画。资源来源、补图提示词与实际渲染验证见 [贴图记录](public/textures/furnishings/PROVENANCE.md)。本批末影箱已不再使用缺失材质。


## 液体与红石操作方块修复

液面按相邻液位连续衔接，跨 chunk/Region，水与气泡柱连接；按钮和拉杆支持安装面、朝向和开关状态。缺失贴图方块默认隐藏，可在“显示模式”中勾选“显示缺失贴图方块”，材料统计保持完整。59 项自动测试、离线实际渲染与生产预览通过。详情见 [验证记录](FLUIDS-CONTROLS-REPORT.md)。

运行 `node tests/fluids-controls-browser.mjs` 检查离线版和端口 4192 的生产预览；可通过 VIEWER_URL 指定预览地址。两个二进制样例随 `npm test` 重建。
