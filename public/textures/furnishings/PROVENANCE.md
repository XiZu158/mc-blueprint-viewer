# 本批贴图来源与验证

用户提供的 19 张参考图已随项目保存在本目录 reference-*.png。末影箱和脚手架的未展示面使用内置 image_gen 根据参考图补全，输出分别是 ender-sheet.png 和 scaffold-sign-sheet.png；编辑模式和完整提示词保存在 prompts.json。脚本裁出六面、锁扣和镂空平台，资源存放于 public/textures/block/user_ender_*.png、user_scaffold_*.png。补全面为参考图衍生版本，并非提取自官方完整模型。

全部原版木种的站立、墙面和悬挂告示牌统一使用提供的 Spruce_Sign.png，直接从原图提取板面和立柱，生成 user_spruce_sign_board.png 与 user_spruce_sign_post.png。保留朝向和旋转；目前不显示告示牌文字，悬挂连接件为简化几何。

16 色地毯使用包内对应颜色的原始羊毛面纹理，保留 1/16 格厚度；用户提供的地毯图用于颜色与样式对照，避免把等轴测示意图的光照再次烘焙到六面。

按请求搜索核对了 [Minecraft 火焰模型参考](https://mcasset.cloud/1.21.8/assets/minecraft/models/block/fire_floor0.json)。原 block.zip 已含 fire_0、fire_1、soul_fire_0、soul_fire_1 和动画元数据，因此直接接入这些本地资源，没有下载其他材质包。火焰使用带透明镂空的倾斜面，支持普通、灵魂及侧面/顶部附着。

本批验证：构建成功，53 项自动测试通过；Chrome 离线 HTML 实际加载 356 方块 gzip .litematic 样例，检查上、下、前、后视图、脚手架镂空、末影箱四向与底面、16 色薄地毯、告示牌及火焰像素动画。缺失资源为零，未请求网络，页面错误为零。记录位于项目根目录 furnishings-browser-results.json 和 furnishings-*.png。本批没有重复运行其他浏览器的完整回归。
