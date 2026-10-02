# Minecraft 工作台界面与照明方块修复

## 修改

- 草方块品牌标志、工作台与箱子栏目图标、像素轮廓图标、石质立体按钮、木纹建筑卡片、背包格材料栏和经验条样式的真实加载进度。UI 使用已有 `block.zip` 资源，未引入外部字体、贴图或联网依赖。
- 保留中文 / English 切换、材料操作、坐标检查、相机、楼层、剖切、Region、导出和截图。桌面并列工作区，平板和手机按空间排列。
- 材料图标从共享图集生成并缓存；楼梯、台阶、箱子、灯笼、火把等使用查看器的实际模型和 UV 投影，不再统一画成完整方块。透明度和灰度着色保留。
- 普通 / 灵魂 / 红石 / 铜火把：独立顶面、底面与 2×10 侧面 UV。壁挂火把贴墙并倾斜 22.5°，支持四个朝向及红石亮灭。
- 普通 / 灵魂 / 铜及氧化、涂蜡铜灯笼：6×7 灯体、灯帽和交叉镂空提环。悬挂状态使用抬高灯体和延伸挂链；继续播放提供贴图的动画。
- 铁 / 铜锁链改为交叉镂空平面，支持 X/Y/Z。倾斜元素保留真实法线，所有新部件合并进 Worker chunk，并保留源方块坐标的点击检查。

## 位置与映射

原贴图位于 `public/textures/block/`，无需重取 ZIP。灯笼和火把直接使用同名贴图；壁挂火把复用相应直立火把资源；涂蜡铜灯笼 / 锁链复用同氧化级别的铜资源。新模型在 `src/core/light-models.ts`，按块名和 `facing`、`hanging`、`lit`、`axis` 选择。

`src/generated/ui-tiles.ts` 内嵌三个现有 UI 纹理，重建用 `node scripts/ui-assets.mjs`。`src/workbench.css` 提供界面样式；品牌与栏目图标、材料图标均从现有共享图集生成。开发、静态构建和单文件离线版共用相同资源。

坐标及 UV 依据 Mojang Java Edition 模型数据核对：[直立火把](https://assets.mcasset.cloud/1.21.8/assets/minecraft/models/block/template_torch.json)、[壁挂火把](https://assets.mcasset.cloud/1.21.8/assets/minecraft/models/block/template_torch_wall.json)、[灯笼](https://assets.mcasset.cloud/1.21.8/assets/minecraft/models/block/template_lantern.json)、[悬挂灯笼](https://assets.mcasset.cloud/1.21.8/assets/minecraft/models/block/template_hanging_lantern.json)。仅参照模型数据，没有下载替代材质包。

## 实测

- `npm run build`：TypeScript 检查、Vite 静态版、离线 HTML 均成功。
- `npm test`：48 项通过，包括 NBT、Packed Long、跨 64-bit、负尺寸、多 Region、材料、Worker，以及新增 UV / 法线 / 方位 / 分块 / 拾取测试。
- `npm run fixtures:lights` 生成真实 gzip NBT 文件 `light-gallery.litematic`（48 种状态、579 个方块）与 `light-detail.litematic`（16 种状态、242 个方块）。`npm run test:lights` 实际加载并绘制，无缺失纹理。六视图截图及 WebGL 像素回读可确认橙色火焰和青色灵魂光源；隐藏、隔离、Y Layer 不改变统计。
- 生产预览 `4180`、开发服务 `5190` 和 `file://` 离线版均验证。离线照明测试阻止全部 HTTP 请求，模型、图标、纹理仍正常。
- 1920、1440、900、390 像素宽度实测，无横向溢出；手机画布、打开文件、语言切换和材料操作均可用。
- 原有 browser、texture、piston、partial、chest、additions 浏览器套件全部通过：真实独立样例、多面与朝向贴图、楼梯台阶、透明镂空、蜂蜜、堆肥桶、展示框、箱子、红石元件、材料导出、Inspector 和相机。
- 2,097,152 方块文件生产浏览器测试：约 782 ms 加载，20 ms 定时器最大间隔 22.4 ms；主线程持续响应。耗时仅代表本机本次运行。

记录：`lights-browser-results.json`、`browser-test-results.json` 及已有各套件 JSON；实际 UI 截图 `ui-workbench-*.png`；照明截图 `lights-*.png`。

## 复验与边界

先启动 `npm run preview -- --port 4180` 和 `npm run dev -- --port 5190`，运行 `npm run test:lights`。其余浏览器测试可设置 `VIEWER_URL=http://127.0.0.1:4180`；`LARGE_TEST=1` 开启大文件响应测试。`BROWSER_PATH` 可指定本机 Chrome 或 Edge。

火焰粒子、烟雾和对周围方块的游戏光照传播未模拟；这是投影几何查看器。未给定资源的方块继续使用明确紫黑缺失材质，末影箱实体皮肤仍缺失。解析和精确材料统计不受模型或贴图覆盖程度影响。
