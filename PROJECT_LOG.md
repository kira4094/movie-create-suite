# movie-create-suite 对话日志（PROJECT_LOG）

> **用途**：Reasonix 会话不稳定会丢上下文，本文件按**对话时间线**记录本项目的关键交流——用户说了什么、为什么这么决策、产出是什么、接续点在哪。
> **与 PROGRESS.md 的分工**：PROGRESS = 状态快照（架构/版本/踩坑/计划）；本文件 = 对话历程（聊了什么、决策脉络、下一步从哪接）。两者可重复，不互斥。
> **最后更新**：2026-08-11（角色卡阶段收尾）

---

## 会话 1：场景卡测试 + skill 拆分 + 风格库 + 角色卡（2026-08-09 ~ 08-11）

### 1.1 起点：场景提示词讨论（对话最初）

- **用户问题**：像镜1「九重天阙云端，巍峨天门，脚下云海翻涌」这种提示词，直接交给视频大模型是否太笼统？还是先让模型生成场景分镜，再喂给视频大模型？
- **结论**：先分镜再喂视频模型（场景卡 → 分镜 → 视频提示词管线），这是整个 movie-create-suite 的立项目标。
- **用户修正测试素材**：real test 不用宫斗剧本，用《这宫斗剧本不对》第 1 章，结尾处选在天雷劫那里。

### 1.2 初建 novel-decomposition（My-skills 阶段）

- 在 `My-skills/skills/novel-decomposition/` 创建单 skill 四阶段管线：全本扫描 → 角色卡 → 场景卡 → 剧情脚本+情绪时间轴。
- 4 份 references 规范：character-card-spec / scene-card-spec / script-spec / emotion-timeline-spec。
- **smoke test**：用《这宫斗剧本不对》第 1 章跑通，发现"烦躁"类外情绪需最近邻映射到 10 情绪 + 备注原文词（spec 规则落地验证）。
- 用户后来确认：**TolariaData 美术风格库（4 文件）是给人看的资料，skill 要有自己的数据文件，物理隔离**——这是后续 design-preset 自用 style-index.md 的由来。

### 1.3 拆分独立 skill（导演决策：分而治之）

- 单 skill 太重，拆成 6 个独立 skill + shared 共享层：
  - `novel-scanner`（扫描索引）、`movie-scene-card`（场景卡）、`movie-character-card`（角色卡）、`movie-script`（剧情脚本/分镜）、`movie-emotion-timeline`（情绪轴）、`movie-dialogue-table`（台词表）
  - `shared/`：humanizer-zh（台词拟人化）、cinematography-handbook（运镜）、camera-and-film（相机/胶片库）、style-dna（风格六维）、negative-block（反向词）
- 移到独立仓库 `E:/Projects/Claude/plugin/movie-create-suite`（GitHub: kira4094/movie-create-suite）。

### 1.4 场景卡测试与质感增强（用户实战反馈驱动）

- 用户用紫极仙宫偏殿场景卡去生成图，反馈"第一张是最新提示词，第二张是最开始的，确实有提升，但**没有质感**"。
- 用 doubao-vision 分析生成图：塑料感/贴图感、光影生硬、细节重复 → 对应增强方案：
  - **画风锚定块四件套**（美术流派+PBR渲染特征+电影参考+质感禁令）
  - **材质三层描述法**（基础+微表面+光学）
  - **体积感六要素**、**尺度锚定**（殿高8-10人叠立/柱径占画面1/8）
- **关键踩坑**：write_file 声称成功但磁盘文件被旧版覆盖（TolariaData 路径解析问题）→ **改完必须 bash 验证磁盘真实内容**（wc -c + grep 关键特征）。这条救过两次命。

### 1.5 分镜 JSON 化 + 机械校验（v2.0）

- movie-script 输出从纯 markdown 升级为**分镜 JSON**（`03-分镜.json`）：coverage（节拍覆盖）/continuity（边界锁 position/posture/props）/assets/purpose/screen_direction/hook/ref_anchors。
- 新建 `shared/scripts/validate_storyboard.cjs` 机械校验器：语法/结构/时间轴/覆盖/边界锁/台词核对（**去标点比对+旁白跳过**，修掉了整句逐字比对的误报）。
- 实战验证：12 镜分镜首轮检出 JSON 语法错（中文引号）、3 处 time_range 格式错（0:62→1:02）、10 处 continuity → 修复后 PASS。
- 台词核对 bug 修复：原文和台词都去标点去空白 + 对白取前10/后10字片段比对 + 旁白（内心戏改编）跳过——消除误报。

### 1.6 命名分层（用户确认的体系）

- 剧本层 5 个 `[L1]`：movie-create-drama-scanner / script / review / emotion / dialogue
- 美术层 4 个 `[L2]`：movie-create-design-style（电影提炼）/ design-preset（风格库预设）/ design-character（角色卡）/ design-scene（场景卡）/ design-scene-layout（空间蓝图）
- 出口 `[OUT]`：movie-create-out-video-director（Seedance 情绪导演）
- 入口 `[ENTRY]`：movie-create-entry（编排）
- manifest 注册 `skills:["skills"]`，目录名 = frontmatter name 一致性检查 ✅

### 1.7 美术风格库 94 风格 + 三选一（用户收集驱动）

- 用户收集 94 个风格（真人35 / 2D29 / 3D30），每个含【美术特点】【历史背景】【提示词锚定词】，落 `D:/Projects/TolariaData/MovieCreate/美术风格库/`（00 索引+三选一规则 / 01 真人 / 02 2D / 03 3D）。
- **三选一互斥规则**（用户提出"并行三选一"）：
  - A = movie-style（电影截图提炼，证据驱动）
  - B = 风格库预设（查表驱动）
  - C = 跳过/自定义（style-dna 自统一）
- **用户两次纠正"偷懒"**：
  1. "你还要写个单独的 skill 给 design-character、design-scene 用" → 新建 `movie-create-design-preset`（B 选项独立 skill）
  2. "TolariaData 风格库是我看的，你要为 preset 单独创建它看的风格库文件，二者物理隔离" → 新建 `references/style-index.md`（94 风格全表+反向特例+联动规则），SKILL.md 数据源全部指向它，插件自包含。

### 1.8 角色卡实战测试（赛博朋克赏金猎人）

- 用户给完整需求：赛博朋克数字插画风格（B 选项）、半人半机械义体、赏金猎人、女 30 岁 175cm、3/7 身材、干练短发、机械接缝皮肤、左臂义体、紧身风衣+胸罩、热裤+绝对领域黑丝、浓妆杀气。
- 产出 `Realtest/赛博赏金猎人-测试/01-角色卡/赤鸦.md`，Part 1-4 全量 + 版权规避（泛化描述义体特征，不引 2077 角色名）。
- 21 项质量自查机械核对全过。

### 1.9 技能0·角色人设强制段（v0.5.1）

- **用户反馈**："生成的提示词总是缺一些部分，比如开头缺「你是专业的图像生成助手…」。不能强制 skill 必须输出完全内容吗？"
- **根因**：spec 模板里有"# 角色"段但游离在技能列表外，执行时被当可选项忽略。
- **修复**：升级为**技能0·角色人设**（强制首段）+ 强制完整规则 5 条（技能0-10 顺序固定、不跳不合并、无内容写"不适用"不删行、结尾必含生成规格、缺失=不完整须补全）+ 质量清单检查项 + 反例黑名单条目。
- 赤鸦.md 实测：5 段提示词全部补技能0（全身定妆照×2/多视图/情绪卡/穿戴物）。

### 1.10 角色卡精简为仅四 Part（v0.6.0）

- **用户反馈**："角色卡生成的内容可以精简，只用生成四个 Part 的提示词就可以，身份信息/素体内衣层/服装线/角色关系这些多余信息可以省略。"
- **方案**：角色卡 = 仅四 Part 可粘贴提示词；身份/素体/弧光/服装线/表情库/角色关系 → 内部提炼不落卡（信息内化进 Part 提示词，spec 有落卡映射表）。
- 实测 12980 → **5908 字节**（砍 54%），四 Part 齐全、技能0 全覆盖、描述性章节残留 0。
- **新踩坑**：git add 时 spec 代码块里的 `{...}` 花括号被 bash glob 展开，误创建 4 个 0 字节空文件进 commit → **git status 检查幽灵文件 + amend + force push 抹除**。

### 1.11 收尾与下一步

- 用户："角色卡暂告段落，后续推进到场景卡，待会回家继续。"
- **接续点（已存记忆）**：场景卡 `movie-create-design-scene`（视觉五段式）做同款精简——大概率只保留可粘贴的场景五段式提示词，去掉基本信息/原文证据/特征矩阵等描述性章节（待用户确认具体精简范围）。对齐点：技能0 是否适用于场景卡？场景卡是否需要"分条技能结构"？

---

## 当前工作区状态（2026-08-11）

- 仓库：`E:/Projects/Claude/plugin/movie-create-suite`，HEAD = c33e326（v0.6.0），工作区干净，已推送
- 本机插件：`C:/Users/kiray/AppData/Roaming/reasonix/plugins/movie-create-suite/`（已同步最新）
- 测试资产：
  - 角色卡：`D:/Projects/TolariaData/MovieCreate/Realtest/赛博赏金猎人-测试/01-角色卡/赤鸦.md`
  - 场景卡：`D:/Projects/TolariaData/MovieCreate/Realtest/这宫斗剧本不对/02-场景卡/紫极仙宫偏殿.md` + `紫极仙宫偏殿-布局.md`

## 用户偏好备忘

- 风格库资料（人看）与 skill 数据（机读）**物理隔离**；skill 要自包含可独立运行
- 输出**强制完整**（技能0 人设段 + 完整规则），不偷懒省略
- 描述性章节能砍就砍，**只留可粘贴提示词**（角色卡先例）
- 每次改完必须 bash 验证磁盘真实内容（防 TolariaData 覆盖 bug）
- 版权角色用泛化描述（防 Seedream 版权过滤）
- 分步测试、每步人工拍板，不要一键全自动
