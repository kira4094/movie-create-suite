# movie-create-suite 项目进度记录

> **本文件是跨会话接续的权威进度源**（Reasonix 不稳定会丢会话，每次会话结束/关键节点务必更新此文件并 commit）。
> 最后更新：2026-08-11（v0.6.0）

---

## 1. 项目概况

| 项 | 值 |
|---|---|
| 仓库 | `E:/Projects/Claude/plugin/movie-create-suite` |
| 远程 | `https://github.com/kira4094/movie-create-suite` |
| 当前版本 | v0.6.0 (20260811.1713) |
| 本质 | Reasonix 插件（`reasonix-plugin.json` manifest），技能合集：小说 → AI 短剧全流程 |
| 管线目标 | 小说文本 → 扫描 → 剧情脚本/分镜 → 审阅 → 情绪轴 → 台词表 → 角色卡/场景卡/风格 → Seedance 视频提示词 |
| 版本规则 | `node update-version.cjs .` 计算（breaking/feat/fix 标签驱动），禁止手改 |

**安装路径（本机）**：`C:/Users/kiray/AppData/Roaming/reasonix/plugins/movie-create-suite/`
**同步方式**：改完 `cp -r skills/ reasonix-plugin.json` 到安装路径（或重启 Reasonix 重新拉取）

---

## 2. Skill 架构（两层 + 入口 + 出口）

```
skills/
├── movie-create-entry/            [ENTRY] 编排入口：两层架构编排 11 skill 全流程
├── movie-create-drama-scanner/    [L1] 小说全本扫描：角色/场景/情绪拐点/服装变化/关键道具 五类索引
├── movie-create-drama-script/     [L1] 剧情脚本+分镜 JSON（coverage/continuity/assets 结构化）
├── movie-create-drama-review/     [L1] 导演审阅：审阅→修正→复核闭环直到 PASS
├── movie-create-drama-emotion/    [L1] 情绪时间轴（映射 movie-emotional-director 10 情绪）
├── movie-create-drama-dialogue/   [L1] 配音台词表（TTS 专用：角色/情绪/语速/音量）
├── movie-create-design-style/     [L2] 万能电影风格提炼（截图→HEX色彩/光影/构图/材质）
├── movie-create-design-preset/    [L2] 风格库预设选择器（94 风格查表）
├── movie-create-design-scene-layout/ [L2] 场景宏观空间蓝图（布局/尺度/光位/机位）
├── movie-create-design-scene/     [L2] 场景卡（视觉五段式提示词）
├── movie-create-design-character/ [L2] 角色卡（四 Part 提示词）
├── movie-create-out-video-director/ [OUT] Seedance 2.0 情绪导演（分镜 JSON→视频提示词）
└── shared/
    ├── style-dna.md               风格 DNA 库（六维：材质/运动/场景/分镜密度/声音/负面）
    ├── negative-block.md          反向词库（四分类）
    ├── camera-and-film-spec.md    电影相机型号+胶片尺寸库
    ├── cinematography-handbook.md 运镜手册
    ├── humanizer-zh.md            中文台词拟人化（去 AI 味）
    └── scripts/validate_storyboard.cjs  分镜 JSON 机械校验器
```

**管线中枢 = 分镜 JSON**（`03-分镜.json`），各 skill 围绕它消费/产出。

---

## 3. 版本历史（按时间）

| 版本 | commit | 内容 |
|---|---|---|
| v0.1.x | — | 初建：novel-decomposition 单 skill 四阶段管线 |
| v0.2.0 | 10e4563 | 按两层架构重命名 skill（剧本层 L1/美术层 L2/出口 OUT/入口 ENTRY） |
| v0.2.2 | 900c17e | fix: 角色卡 Part 2/4 默认全量产出（修"按需"歧义导致漏生成） |
| v0.3.0 | 94fa7c8 | 美术风格三选一（movie-style/风格库94/跳过自定义）+ design-preset 新增 |
| — | b93f88d | fix: Part 3 格式契约——任何形态必须完整分条技能提示词，禁止纯表格 |
| — | f208de2 | design-preset 自用风格库 references/style-index.md（与 TolariaData 物理隔离） |
| v0.5.1 | 099f25a | **技能0·角色人设强制段**：每段提示词以「你是专业的图像生成助手…」开头，防缺部分 |
| v0.6.0 | 4adff05 | **角色卡精简为仅四 Part 提示词**：删身份/素体层/服装线/角色关系章节，12980→5908 字节 |

---

## 4. 已完成功能详解

### 4.1 角色卡（v0.6.0，已实测通过）
**输出 = 仅四 Part 可粘贴提示词**：
- Part 1 全身定妆照（文生图 9:16）— 锁定全部信息，后续参考图
- Part 2 多视图（图生图 3:4）— 上图头部三视图+下图脖子以下三视图，下区裁切铁律
- Part 3 情绪卡（图生图 16:9）— 完整十情绪卡/配角精简卡/表情表素材 三选一
- Part 4 穿戴物细节图（图生图 4:3）— 服装/配饰/随身物特写网格

**关键机制**：
- **技能0·角色人设强制段**：每段提示词必须以「你是专业的图像生成助手，专注生成符合AI短剧制作标准的{任务类型}」开头（spec 强制完整规则 5 条）
- **分条技能结构**：技能0-10（人设/题材锚定/身份体型/背景/长相静态+气质底色+中性表情/发型/服装槽位/面料质感/无风静止/布光收尾/反向词）+ 生成规格
- **素体=静态锚点**：只写静态结构禁神情词，提示词固定含「中性表情，目视镜头，无特定情绪」；情绪由 Part 3 承载
- **美术风格与反向词互斥**：正向风格词不得出现在反向词里
- **HEX 全部标注「（文字推断）」+ 备选方案**

**实测资产**：`D:/Projects/TolariaData/MovieCreate/Realtest/赛博赏金猎人-测试/01-角色卡/赤鸦.md`

### 4.2 场景卡（v1.0，视觉五段式）
**方法论**：场景本体×叙事状态双层分离（防降格）、画风锚定块四件套（PBR渲染特征+电影参考+质感禁令）、材质三层描述法（基础+微表面+光学）、体积感六要素、尺度锚定、HEX文字推断。
**视觉五段式**：①风格与美学设定（≥250字）②构图与空间关系（≥250字）③光影与曝光（≥250字）④材质细节（≥350字）⑤色彩系统 + 生成规格。
**场景变化线**：同一场景显著状态变化独立变体，本体保持。
**实测资产**：`D:/Projects/TolariaData/MovieCreate/Realtest/这宫斗剧本不对/02-场景卡/紫极仙宫偏殿.md`（质感增强版 9533 字节）+ `紫极仙宫偏殿-布局.md`

### 4.3 剧情脚本/分镜（v2.0，含机械校验）
**分镜 JSON 字段**：coverage（节拍覆盖）/continuity（边界锁：position/posture/props）/assets（角色/场景/道具）/purpose/screen_direction/hook/ref_anchors。
**机械校验器**：`shared/scripts/validate_storyboard.cjs` — 语法/结构/时间轴/覆盖/边界锁/台词核对（去标点比对+旁白跳过），verdict PASS/FAIL + high/medium 分级。
**审阅闭环**：movie-create-drama-review 审阅→修正→复核直到 PASS（受轮数上限保护）。

### 4.4 美术风格库
- `D:/Projects/TolariaData/MovieCreate/美术风格库/` 94 风格（真人35/2D29/3D30），每风格含美术特点/历史背景/提示词锚定词
- design-preset 内嵌 `references/style-index.md`（与 TolariaData 物理隔离，插件自包含）

---

## 5. 踩坑记录（重要！）

1. **git add 花括号 glob 展开**：spec 代码块里 `{...}` 被 bash 当路径模式，误创建 0 字节空文件进 commit → 已 amend+force push 抹除。
   **教训**：含 `{}`/中文特殊字符内容写入前，先 `git status` 检查幽灵文件。
2. **edit_file 遇 CRLF**：本仓库 SKILL.md/spec 为 LF，但 edit_file 有时匹配失败 → 用 python 脚本文件方式批量替换（bash 内嵌 python 遇反引号会被 shell 解析，**必须写 .py 文件再执行**）。
3. **TolariaData 文件覆盖**：write_file 后磁盘被旧版覆盖过（路径解析问题）→ **改完必须 bash 验证磁盘真实内容**（wc -c + grep 关键特征）。
4. **Part 漏生成**：spec 写"按需"导致执行漏 Part 2/4 → 改"默认全量产出"。
5. **Part 3 退化纯表格**：表情表素材形态退化成表格 → 强制任何形态必须完整分条技能提示词。
6. **git 路径/编码**：中文文件名+特殊字符组合易踩坑，尽量用 ASCII 文件名。

---

## 6. 下一步计划

### 🔥 场景卡推进（当前焦点，待继续）
角色卡已精简，**场景卡做同款精简**——大概率只保留可粘贴的场景五段式提示词，去掉基本信息/原文证据/特征矩阵等描述性章节（待用户确认具体精简范围）。
- 涉及文件：`skills/movie-create-design-scene/SKILL.md` + `references/scene-card-spec.md`
- 对齐点：技能0·角色人设强制段是否适用于场景卡？场景卡是否有"分条技能结构"需求？

### 其他待办（按优先级）
- [ ] 场景卡精简（下一步）
- [ ] 各 skill 逐一实测调教（用户计划：逐一确认效果后再整合成合集）
- [ ] README.md 完善（当前 3 字节，空）
- [ ] PROGRESS.md 随版本更新

---

## 7. 常用命令

```bash
# 版本号（先 commit 再跑，否则看不到新 commit 标签）
node update-version.cjs . && git add version.json reasonix-plugin.json && git commit -m "chore: bump 版本号"

# 提交+推送
git add <files> && git commit -m "<label>: <描述>" && git push origin master

# 同步本机插件
cp -r skills/ "C:/Users/kiray/AppData/Roaming/reasonix/plugins/movie-create-suite/skills/"
cp reasonix-plugin.json "C:/Users/kiray/AppData/Roaming/reasonix/plugins/movie-create-suite/"

# 分镜校验
node skills/shared/scripts/validate_storyboard.cjs <分镜.json> --script <原文.txt>

# commit 标签规则（只看冒号前）
# breaking: → major ｜ feat:/add: → minor ｜ fix: → patch ｜ 其他 → 不 bump
```
