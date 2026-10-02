# 非整格方块与箱子修复验收

日期：2026-10-01（Asia/Shanghai），Windows、Node v24.21.0、Chrome 软件 WebGL。用户截图中的紫黑活塞头是未映射资源叠加完整立方体 fallback；本轮修正模型和贴图，不改投影解析或计数语义。

## 实际实现

- 活塞头：1/4 厚头板、1/4 宽连杆；六个方向、普通/粘性、长/短杆。长杆正确越出所属格 1/4，连杆没有多余端面。伸出底座缩为 3/4 并使用 piston_inner，侧面 UV 去掉已伸出的木质头带。
- 多部件面带独立贴图、UV 矩形和旋转；以缓存模板合入 chunk，共享图集/材质。部分模型的原始三角所属坐标用紧凑区间记录，点击越界杆身仍检查来源活塞头。
- 中继器：1/8 底板，两根指示柱，四档 delay，powered 与 locked 横杆。比较器：1/8 底板，三个指示柱，独立 powered / compare / subtract 状态。
- 箱子：箱体、箱盖、锁扣，14/16 高与侧边间隙；四向、单箱、双箱左右部件及接缝。用户 `Chest.png` 经内置 image_gen 补齐平面六面，再最近邻导入 8 张 16² 木面/金属面；普通与陷阱箱有贴图，陷阱锁扣轻微红色。末影箱没有专用资源，形状正确并明确显示缺失材质。细节与完整提示词见 `public/textures/chest/PROVENANCE.md`。
- 铁砧三种损坏状态、漏斗中空碗与五向出口、平面/弯道/上坡轨道、红石线连接/爬升和 power 着色、按钮 floor/wall/ceiling 与按下深度、压力板激活厚度、蛋糕 bites、阳光传感器 inverted、炼药锅与液位。

## 验证

- 严格 TypeScript、生产构建、单文件离线构建成功。`npm test` 35/35：保留解析、跨 Long、负尺寸、多 Region、坐标、材料、Worker 和几何保护测试；新增模型体积、24 活塞头组合、法线/绕序、细面 UV、三角拾取归属、红石状态、箱子六面及双箱连续 UV。
- 二进制 fixture：piston-gallery 1090 方块，24 个活塞头，贴图缺失 0；partial-gallery 2378 方块，218 种组件状态，仅 4 个末影箱状态缺贴图；partial-detail 251 方块，仅 1 个末影箱缺贴图；chest-gallery 552 方块，12 普通 + 12 陷阱箱部件，四向单/双箱，缺失 0。
- 实际浏览器检查：活塞 6 组、部分模型 6 组、箱子 3 组；所有绘制模式、层/隐藏/隔离、完整计数及 file:// 均通过，没有页面/着色器/资源错误。逐状态、逐面和模型定义见各 mapping-report.json，原始记录见 piston/partial/chest-browser-results.json。
- 已人工查看生产浏览器的 piston-detail-iso、partial-detail-iso、chest-gallery-iso 及箱子六向截图。活塞薄板与连杆、红石薄板和指示柱、漏斗/锅开口、轨道镂空、箱子锁扣与连续双箱木纹均可见。构建成功未被当作视觉验收。
- 总图集 1120 PNG（1112 原包 + 8 衍生），1660 个来源帧逐像素校验差异 0，透明度与方向保持，边缘扩展通过。原包 102 元数据、54 动画不变。
- 原有完整功能回归另有 browser-test-results.json；真实外部 SimpleHouse / Lite、5126 方块城堡继续正确加载。源图片和资源都已复制进项目，开发、构建、单文件均不访问用户图片绝对路径。
- 本轮开发版的箱子与部分模型专项也通过，记录见 chest-dev-browser-results.json、partial-dev-browser-results.json；Chrome 与 Edge 离线完整功能均通过，见 offline-test-results.json、offline-edge-results.json。

## 边界与来源

这仍是建筑查看器，几何表现与部分碰撞形状尽量匹配，没有 Minecraft 物理模拟。箱子开合动画、移动中的方块实体、灯笼/植物等其余复杂模型和所有模组不是本轮全覆盖；缺失材质仍明确报告，不冒充其他资源。末影箱/床/告示牌等未提供的实体纹理不下载替代。

用户提供了原建筑截图，没有其 `.litematic` 文件；不能声称已复测截图里的 16,566 方块、86 Region 整栋建筑。已用上述真实格式的独立二进制投影验证各状态和实际渲染。

几何/UV 约定参考实际 Minecraft 模板资源：[活塞头模板](https://mcasset.cloud/26.1-snapshot-1/assets/minecraft/models/block/template_piston_head.json)、[中继器模板](https://mcasset.cloud/26.2-snapshot-6/assets/minecraft/models/block/repeater_1tick.json)、[比较器模板](https://mcasset.cloud/23w07a/assets/minecraft/models/block/comparator_subtract.json)、[漏斗模板](https://mcasset.cloud/1.21.1/assets/minecraft/models/block/hopper.json)。只核对模型定义，贴图来自用户提供的文件和其明确要求的补齐图。
