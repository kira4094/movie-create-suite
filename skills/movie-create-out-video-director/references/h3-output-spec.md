# MiniMax H3 输出规范（单一权威）

仅当目标模型为 MiniMax H3 时读取。本文件定义 H3 专属字段、标签、对齐和模板；OUT 主 Skill 只负责公共事实、冻结对白、情绪、时间轴、动态负面、可见文字与 LOCKED 路由。

多模态提示词顺序：第一行图片对齐指令 → 空行 → 映射声明 → 一致性约束 → H3 六字段。映射声明绑定语义资产到 `<Picture N>`、`<Video N>` 或 `<Audio N>`；正文不得泄漏语义别名。

## 模式选择

- T2VA：无参考素材，使用基础三字段。
- I2VA：一张首帧图片，首行对齐到 0.00 秒。
- FL2VA：首尾两张图片，分别对齐 0.00 秒与末秒。
- L2VA：一张尾帧图片，对齐末秒。
- Ref2VA：多图/视频/音频混合，使用六字段。

## 基础三字段模板

```text
integrated_multimodal_description: [主体、场景、动作、镜头与时间轴]
overall_soundscape: [环境声、动作声、对白与声音变化]
non_diegetic_music: [无配乐或明确的器乐/节奏]
```

## Ref2VA 六字段模板

```text
subject_definitions: [每个主体的标签、身份和稳定特征]
summary: [一句话动作与剧情目标]
retention_analysis: [各 Picture/Video/Audio 的保留内容与时间锚点]
detailed_description: [按时间轴描述动作起点、过程、终点、镜头和表演]
overall_soundscape: [环境声、动作声、对白、声音变化]
non_diegetic_music: [无配乐或明确音乐]
```

## 对齐、映射与台词

第一行必须是图片对齐指令，空一行后写映射声明，再写一致性约束和正文。I2VA：`For the target video, at 0.00 seconds, <Picture 1> is fully referenced.`；FL2VA：`<Picture 1> aligns with 0.00 seconds; <Picture 2> aligns with the final moment.`；L2VA：`<Picture 1> aligns with the final moment.` 映射声明绑定 `<Picture N>`、`<Video N>`、`<Audio N>`，正文只用解析后的标签。

对白格式为 `<d>[Language] 冻结原文</d>`，speaker 编号跨镜保持一致；跨镜延续时两端写 `<scenetrans>`，被截断时写 `<cutoff>`。空对白不输出语音参数。

## 语言与 H3 QA

结构字段保持英文，描述正文默认中文；用户明确要求英文时才切换正文语言。检查模式选择、第一行对齐、空行、映射、一致性、字段完整性、标签编号、冻结对白、speaker、`<scenetrans>`/`<cutoff>`、剧情文字逐字保留，以及无关水印/logo/乱码/外加字幕条防护。
