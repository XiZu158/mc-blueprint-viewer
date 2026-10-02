# 蜂蜜块、堆肥桶、展示框、语言与图标验收

日期：2026-10-02（Asia/Shanghai）。Windows、Node v24.21.0、Chrome 软件 WebGL。下列为实际执行记录，构建成功没有被当作视觉通过。

## 实现与来源

原图已复制到 public/textures/additions/reference-*.png。使用内置 image_gen，根据 Honey_Block.png / Composter.png 分别补绘平面贴图；是参考图推断的隐藏面，并非原版隐藏像素的精确恢复。保留原始生成 sheet、完整提示词和最近邻导入布局，见 public/textures/additions/PROVENANCE.md 与 tile-layout.json。展示框直接导入用户正面图，透明像素保留，背面/薄边使用原 block.zip 的 oak_planks。

新增贴图在 public/textures/block：user_honey_* 七张（六面 + 内芯），user_composter_* 八张（六面 + 内壁 + 内底），user_item_frame_front 一张；开发和构建版本均从共享本地图集读取。未下载其他材质包。原包 1112 PNG / 102 元数据保持原文件 SHA256；加原箱子 8 张后共 1136 PNG，54 动画。

堆肥桶以底板/四面桶壁形成真实开口，外六面、内壁/内底分别映射。level 1–7 在不同高度显示原包 composter_compost，level 8 使用 composter_ready。蜂蜜采用视觉整格透明外壳与 1/16 内缩核心，六个外面独立映射，半透明由共享材质控制。气泡柱 drag 的两种状态都与水相同，使用 water_still / water_flow、动画、默认灰度着色和透明度。

展示框通常是实体，新增读取 Region.Entities；浮点 Pos 相对 Region Position 而非负尺寸的 min。TileX/Y/Z 可能仍为原游戏世界坐标，因此不覆盖有效 Pos。普通/荧光展示框支持六向；旧版 v1 EntityData 包装及 Direction 兼容；无效/未支持实体不会阻止方块加载。模型仍合入 chunk，沿用共享图集与三角上限、隐藏/隔离/高亮、层/剖切和 Region 筛选。拾取三角保留来源 anchor，Inspector 显示浮点 Pos、朝向及物品 ID。实体总数和各实体状态单独统计，JSON 的 materials / totalBlocks 仍只含方块，另有 entities / totalEntities；CSV 附 kind。

页首中文/English 切换并保存选择；按钮、帮助、提示、输入属性和常见材料名称更新，保留源 ID、状态、文件名和用户 Region 名称；可跨语言搜索。材料图标从相同图集的对应面及默认着色生成 32px PNG，缓存复用，水/气泡柱图标一致；缺失资源使用相同棋盘。图标是静态材质预览，不要求随水动画每帧重绘。

## 实际验证

- TypeScript 严格检查、Vite 生产构建和单文件构建成功，单文件约 2 MiB。
- npm test：43 / 43；保留解析、Packed Long 跨界、负尺寸、多 Region、统计、Worker 保护、先前部分模型测试；新增六面、透明分类、桶开口/填充层、真实实体 NBT 的独立坐标、旧版格式、材料翻译和实际 Three.js 射线拾取。
- additions-gallery.litematic：721 非空气方块，另有 13 展示框；六向普通/荧光框、两 Region、负尺寸、异常绝对 Tile 字段被忽略，精确实体/方块库存；唯一缺失为专门写入的 fixture_missing。
- additions-detail.litematic：207 方块 + 3 展示框；所有本轮贴图匹配，缺失为 0。
- 新增浏览器 9 组：实际面/内表面资源、图标 PNG、双向语言与持久化、双语搜索、负坐标 Inspector、实体隔离/Region/层、六视图/五模式、三个真实导出、细节 fixture，以及禁止 HTTP 下的 file://。生产/开发均通过，页面/着色器错误 0；见 additions-browser-results.json、additions-dev-results.json。
- 已人工查看中文/英文截图、细节等轴/正视/底面等实际画布。能看到空桶内壁、不同填充高度、成熟顶层、蜂蜜内外层、相同蓝色水柱、展示框正面/薄边/木背和与实际贴图对应的列表图标。
- 图集 1676 个来源帧逐像素核对，差异 0；透明度、上下方向和 2px 扩展通过。见 atlas-test-results.json。
- 原有 11 组浏览器功能回归通过；2,097,152 方块端到端加载 864ms，20ms 页面计时器 43 次，最大间隔约 21.4ms（软件 WebGL，实心合并最佳情况）。见 browser-test-results.json。
- 前轮贴图、活塞、部分形状与箱子浏览器专项均继续通过。离线 Chrome / Edge 的完整功能与新增实体/语言/图标也通过验证。

## 范围

用户提供图片，未提供本轮真实建筑投影；本轮使用真实 gzip/NBT 格式的独立 fixture 和已有外部 Lite / SimpleHouse 验证。没有声称复测用户原截图整栋建筑。

展示框物品模型、地图像素、专属荧光效果和其他实体未渲染；物品 ID 可检查。未覆盖的中文材料名称保留可识别英文/原始 ID。末影箱、床等仍缺专用实体贴图，灯笼、植物、移动活塞及其他复杂模型仍有简化范围；均保留清晰回退与完整材料统计。

格式坐标依据 [Litematica 原作者序列化实现](https://github.com/maruohon/litematica/blob/pre-rewrite/fabric/1.20.1/src/main/java/fi/dy/masa/litematica/schematic/LitematicaSchematic.java) 的 takeEntitiesFromWorld / readEntitiesFromNBT；蜂蜜视觉整格外壳参考 [实际蜂蜜模型资源](https://mcasset.cloud/1.21.8/assets/minecraft/models/block/honey_block.json)。这里只核对模型/格式约定，未下载替代纹理。
