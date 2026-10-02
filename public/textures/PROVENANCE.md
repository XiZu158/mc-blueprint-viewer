# 用户提供的纹理

来源：本次用户提供的 `block.zip`。实际解压后发现 `block/` 下 1112 张 PNG 和 102 份 `.png.mcmeta`；没有模型 JSON、blockstates 定义或明确许可文本。未下载或混入其他材质包。

所有原始 PNG 与元数据保存在 `block/`，内容保持不变；SHA256 和每张图的解析结果见 `import-report.json`。图集还包含用户新增 `Chest.png` 衍生的 8 张 `user_chest_*.png`，以及 Honey_Block.png / Composter.png / Item_Frame.png 的 16 张追加面。来源与完整生成提示词见 `chest/PROVENANCE.md`、`additions/PROVENANCE.md`；报告逐资产标注 origin，分别统计 1112 原资源、8 箱子面和 16 追加面。生成的 `block-atlas.png` 含逐帧像素、2px 最近邻边缘扩展和紫黑缺失材质。运行时不访问原始 ZIP 或用户电脑路径。

本项目代码许可不改变素材权利归属。随用户要求将其整合进交付；不声称对这些图片拥有或提供额外许可。

`mapping-report.json` 记录实际测试文件的每个 BlockState 六面贴图、着色、透明分类、未匹配资源和简化几何；另有 piston-mapping-report.json、partial-mapping-report.json 和 chest/mapping-report.json。运行时对用户新加载的文件也生成缺失提示。未知命名空间不会借用同名 Minecraft 图片。普通/陷阱箱使用新增用户图片衍生面；末影箱等未提供的实体材质使用明确的缺失材质。

动画遵循 `.mcmeta` 的帧号、帧时长与插值设置。其余元数据保留；不使用 mipmap，因此忽略纹理元数据中针对 mipmap 的策略。投影没有保存生物群系，只有需要着色的灰度草叶/水使用默认颜色，已彩色的草侧面和叶片保持原色。
