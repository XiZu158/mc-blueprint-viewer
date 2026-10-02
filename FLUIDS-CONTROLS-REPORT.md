# 液体、按钮、拉杆与缺失贴图修复

液体改为按相邻 level 状态计算共享角点高度，去除同类液体内部面。水与气泡柱视为同一种液体，堆叠和下落状态连续；邻居查询跨 32 格 chunk 与可见 Region，包括负尺寸 Region。剖切和隐藏后重新生成边界。几何继续在 Worker 中合并到 chunk；复用各状态材质，并按 chunk 缓存液面角点。液体材料图标保留纹理和代表性高度。

按钮改用原版地面模型的尺寸与裁切 UV，按照 floor/wall/ceiling、四个 facing 和 powered 旋转，按下时厚度由 2/16 缩为 1/16。拉杆新增圆石底座和倾斜手柄，保留裁切 UV 与真实法线，支持三种安装面、四个朝向和两种开关状态。

模型尺寸与状态旋转核对了原版资源：[按钮模型](https://mcasset.cloud/1.21.8/assets/minecraft/models/block/button.json)、[按钮 blockstates](https://assets.mcasset.cloud/1.21.8/assets/minecraft/blockstates/stone_button.json)、[拉杆模型](https://mcasset.cloud/1.21.8/assets/minecraft/models/block/lever.json)、[拉杆 blockstates](https://assets.mcasset.cloud/1.21.8/assets/minecraft/blockstates/lever.json)。所有纹理继续来自项目已有包，没有下载替代材质包。

显示模式下新增“显示缺失贴图方块”，首次使用默认关闭。任何实际使用的面贴图缺失时，整块几何不生成，也不遮挡邻居；开启后使用原紫黑占位材质。设置保存在本浏览器，重置筛选和加载新文件保留选择。隐藏仅作用于视图，NBT、材料数量、导出与坐标 Inspector 均保留。材料列表仍列出缺失资源及其数量。

验证：59 项自动测试通过，生产构建成功。新增真实 gzip 样例 controls-gallery.litematic（145 方块，包括 72 个按钮/拉杆状态和一个未知方块）与 fluids-gallery.litematic（649 方块，跨 chunk、两个 Region、负尺寸、液位 0–7、堆叠水与气泡柱）。Chrome 离线版及生产预览实际加载成功。检查液面上方与侧面、按钮/拉杆上/前/下视图，火焰等旧功能的核心测试仍通过；本轮未重跑全部历史浏览器脚本。

实际渲染检查通过：水/熔岩动画改变画面像素；液体图标非空；缺失方块默认没有占位面，开启后出现，重置/刷新保留设置；隐藏方块仍能按原坐标检查；分层/剖切不改变总数；JSON 导出成功；外部真实 SimpleHouse 的 78 方块统计保持正确。离线页面未发出网络请求，无页面错误。详见 fluids-controls-browser-results.json、controls-*.png 与 fluids-*.png。

本轮处理静态投影中的水、熔岩、气泡柱，不模拟流体传播，也未新增含水非完整方块的水体形状。
