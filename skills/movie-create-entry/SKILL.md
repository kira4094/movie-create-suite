---
name: movie-create-entry
description: |
  [ENTRY] 小说影视化拆解编排入口：接收完整小说文本，按两层架构编排 13 个 Skill 完成四块交付——美术层先行 → 剧本层 → 出口 OUT；情绪和对白通过内存接口直接注入角色、分镜与视频，不生成独立用户文件。
  分镜 JSON 是全管线中枢：剧本层产出 → 审阅/情绪/配音/视频提示词全部消费它。
  本 skill 是薄壳编排器，不含具体生成规则（各生成规则在对应独立 skill 中）；也可单点调用任意独立 skill。
  当用户提到「小说改编」「AI漫剧」「全流程拆解」「拆整本小说」「小说转漫剧」且需要走完整管线时使用。
  当用户提供小说文本，要求产出全部影视化资产（分镜+角色卡+场景卡+情绪+配音+视频提示词）时使用。
  当用户说「写个XX剧」「帮我做个短剧」「从零创作剧本」且要产出完整影视化资产时使用（先调 drama-story 生成剧本，再走全流程）。
---

# 小说影视化拆解编排入口 v2.0

## 角色定位
你是小说影视化管线编排器：接收小说文本，按两层架构编排 13 个独立 Skill 完成全流程产出。你**不直接生成任何卡片/剧本**——具体生成规则与质量清单在各自 Skill 中，你只负责任务调度、顺序保证、暂停点控制。

## 两层架构

```
┌─────────────────────────────────────────────────┐
│ 入口：风格定调（scanner 扫描后执行，四选一）       │
│   路径A：movie-create-design-style(mode=entry_style_guide) 提炼（电影参考图 → 分析 → │
│          匹配 96 库最接近风格深化）               │
│   路径B：movie-create-design-preset 直接选一（96 风格库查表） │
│   路径C：跳过风格（中性描述，不调用风格 Skill）    │
│   路径D：自定义风格或题材推荐（用户正向规则/可追溯预设） │
│   ★ 唯一产出：.movie-create/style-guide.md（全链继承） │
└─────────────────────────────────────────────────┘
              ↓ 继承风格定调（不重新选）
┌─────────────────────────────────────────────────┐
│ 美术风格层（视觉设计先行）[L2·先]                  │
│   design-scene-layout（空间蓝图先确认）            │
│   design-character × N 角色 → 01-角色提示词/      │
│   design-scene × N 场景 → 02-场景提示词/          │
│   （读 .movie-create/style-guide.md + 风格定义库）  │
│   ★ 产出：图像提示词（角色卡/场景卡）              │
└─────────────────────────────────────────────────┘
              ↓ 继承风格定调 + 美术锚点
┌─────────────────────────────────────────────────┐
│ 文字处理层（剧本解析 + 分镜设计）[L1·后]           │
│   scanner → 风格（可跳过）→ emotion角色证据 → 角色/场景 → script 3A draft 建立 shot_id → dialogue冻结前建议 + emotion镜头证据 → script 3B合并/冻结/渲染 → 校验 → review → PASS后 voice directives → OUT │
│   ★ 产出分镜 JSON（中枢）                        │
└─────────────────────────────────────────────────┘
              ↓ 全部产出 = 文字提示词
┌─────────────────────────────────────────────────┐
│ 出口：out-video-director（分镜 JSON → 判断 → 必要时规划 → LOCKED 后视频提示词）│
│ → 跳转 MiniMax Hub / Seedance 生成                 │
└─────────────────────────────────────────────────┘
```

## 管线架构（完整）

```
小说文本
   │
   ▼
movie-create-drama-scanner ── 全本扫描 → .movie-create/scan-index.md（角色/场景/情绪拐点/服装节点/道具清单）
   ▼
★ 风格定调（四选一）── → .movie-create/style-guide.md（全链继承）
│   路径A：movie-create-design-style(mode=entry_style_guide) 提炼（电影参考图→分析→匹配 96 库最接近风格；唯一产出 `.movie-create/style-guide.md`，入口直接模式无本 Skill 子暂停）
   │   路径B：movie-create-design-preset 直接选一（96 风格库查表）
   │   路径C：跳过风格（中性描述，不调用风格 Skill）
   │   路径D：自定义风格或题材推荐（用户正向规则/可追溯预设）
   │                    （直接模式内部核验；协作模式或真实歧义才暂停）
   ▼
movie-create-design-scene-layout ── 宏观空间蓝图 → .movie-create/scene-layout/{场景名}.md（空间骨架先确认）
movie-create-design-character × N 角色 → 01-角色提示词/{角色名}.md
movie-create-design-scene     × N 场景 → 02-场景提示词/{场景名}.md（继承布局蓝图 + 五段式）
   │                    （直接模式内部核验并继续）
   ▼
movie-create-drama-script          → 3A 建立 draft shots 与 shot_id
   │
   ├── movie-create-drama-dialogue → 冻结前忠实度/可表演性建议（至多一次 humanize）
   ├── movie-create-drama-emotion → 镜头 pass 按 draft shot_id 回传
   └── script 3B 合并/冻结/渲染 → .movie-create/storyboard.json + 03-分镜脚本图提示词.md
       └── validate_storyboard.cjs → movie-create-drama-review → PASS
           └── PASS 后 dialogue 按最终 shots 返回 voice directives
               └── 情绪与对白内化进角色、分镜与视频
   │                    （直接模式内部核验并继续）
   ▼
movie-create-out-video-director    → 轻量任务直接 04-视频提示词.txt；复杂任务按需 .movie-create/video-plan.md → LOCKED 后 04-视频提示词.txt（【视频块交付物】，内化情绪工程+配音参数）
   │  → 跳转 MiniMax Hub / Seedance

🎯 **交付物归位四大块**（用户真正要的）：
- **① 角色块**：01-角色提示词/{角色名}.md × N（定妆+多视图+情绪+穿戴，可粘贴生图）
- **② 场景块**：02-场景提示词/{场景名}.md × N（含 layout 空间蓝图内化，可粘贴生图）
- **③ 分镜脚本图块**：03-分镜脚本图提示词.md（宫格静态渲染；JSON 为唯一事实源；旧名只读兼容）
- **④ 视频块**：04-视频提示词.txt（每镜可直接粘贴生视频，内化情绪/台词/配音参数）
- **输入源**：`.movie-create/source/`、`.movie-create/scan-index.md`、`.movie-create/style-guide.md`
- **不产独立情绪或配音文件**：两者均已内化进角色、分镜与视频块


## 失败降级（if-then 三段式，编排器特有）
| 触发条件 | 一线修复 | 仍失败兜底 |
|---------|---------|-----------|
| 子 skill 未安装/不存在（找不到 SKILL.md） | 提示用户缺哪个 skill，给出安装命令 | 用户选择继续 → 用通用流程替代，标注「降级执行」 |
| 子 skill 超时/中断（如扫描超时） | 重试一次（同参数） | 仍失败 → 让用户确认输入或分块处理 |
| 子 skill 输出格式错误（分镜 JSON 校验 FAIL） | 跑 validate_storyboard.cjs --fix 自动修复 | 修复不了 → 打回对应 skill 重做，不往下游传脏数据 |
| 用户提出修改或发现真实歧义 | 记录变更 → 只重跑受影响的下游 skill | 影响上游事实 → 从受影响步骤恢复，不重跑无关上游 |
| 输出目录已存在旧项目 | 询问用户：覆盖 / 新建子目录 / 保留并追加 | 用户未定 → 停在原地等确认，不自动覆盖 |
| 项目路径不在可写范围 | 提示用户指定可写目录 | 无 → 停下报告，不静默写失败 |

## 反例黑名单（编排器不要做什么）
| 触发 | 不要做 | 正确做法 |
|------|-------|---------|
| 子 skill 失败 | 静默跳过继续往下 | 报告 + 降级或打回重做 |
| 协作审阅模式的暂停点 | 擅自推进下一步 | 🛑 等用户确认 |
| 分镜校验 FAIL | 无视警告直接进 review | 修复后再进 |
| 旧项目目录存在 | 自动覆盖 | 先问用户 |
| 用户修改需求 | 只改下游不改上游 | 评估影响链，提示重跑受影响的步骤 |
```

## 输出目录

```
D:\Projects\TolariaData\MovieCreate\{小说名}/
├── 01-角色提示词/           ← 交付物①
├── 02-场景提示词/           ← 交付物②
├── 03-分镜脚本图提示词.md   ← 交付物③，drama-script 唯一写入
├── 04-视频提示词.txt        ← 交付物④，OUT 唯一写入
└── .movie-create/            ← 原文、扫描、风格、JSON、审阅与复杂规划等内部态
```

> 新项目只交付上述四块；`.movie-create/` 不增加用户交付物。内部包括 `source/`、`scan-index.md`、`style-guide.md`、`storyboard.json`、`screenplay.md`、`review.md`，复杂 OUT 按需增加 `video-plan.md`。审阅结果写入 `.movie-create/review.md`。情绪和对白直接嵌入角色、分镜与视频。旧项目路径仅只读回退，禁止自动移动或删除。

> 若用户指定子目录（如 Realtest/），项目建在 `{根}/{子目录}/{小说名}/`。

## 调度规则

执行档位默认是标准。快速档位只有在时长、角色、场景、模型、比例与无未决绑定条件全部满足，且用户明确选择后才生效；快速仍保持四块交付，角色仅 Part1+Part3，复杂规划、审阅与 Gate 不因快速而隐式绕过。进入快速前必须一次性合并确认执行档位、模型、比例与所有模式豁免。

### 直接模式与协作审阅模式

- **直接模式（默认）**：用户已给出完整素材或明确点子、目标时长、模型、画幅、风格路线，并要求“全流程/四块/直接完成/一次性交付”时启用；写入目标满足“显式目标或默认项目路径可用且无覆盖冲突”即可。原创必须有主角和核心冲突；改编必须有实际原文或明确改编范围；必要角色/场景关系能从源材料安全提取。非关键艺术选项可记录为「默认」，不得因故事十组选项未逐项选择而暂停。
- **协作审阅模式**：只有用户明确说“先看”“逐层确认”“每步我决定”或等价表达时启用，才在层间停下展示产出。
- 直接模式仍完整调用所有适用 Skill、validators、review 与 OUT LOCK；减少的是无效停顿，不是质量检查。明确“不要生成图片”时解释为只产文字提示词、不调用生成工具，仍交付角色和场景提示词块。
- 真实歧义只提出最小问题；答案确定后从受影响阶段恢复，不重跑无关上游。

1. **唯一权威顺序**：scanner → 风格（可跳过）→ emotion 角色证据 pass → 角色/场景 → script 3A draft 建立 shot_id → dialogue 冻结前建议（至多一次 humanize）+ emotion 镜头 pass → script 3B 合并/冻结/渲染 → 机械校验 → review；若 high 忠实度退回 script，旧冻结失效并重跑相关 pass；PASS 后 dialogue 按最终 shots 生成 voice directives → OUT 核验并消费。
2. **层级门控按模式触发**——协作审阅模式每层完成后统一询问，格式：
   `【层间确认】{本层产出摘要}。继续？`
   - [1] 继续下一层｜[2] 先看本层产出｜[3] 停止/调整
   - 用户回 [2] → 展示产出，确认满意再回 [1]
   - 用户回 [3] → 记录修改 → 重跑受影响层（不空烧下游）
   - 用户未明确继续 → 协作审阅模式停在层边界；直接模式内部核验并继续
   门控位置：① 入口定调后 → 美术层前；② 美术层产出后 → 文字层前（含 HEX 拍板）；③ 文字层产出后 → 出口前。直接模式不因这些边界暂停。
   OUT 内部的 `AUTO-LOCK / NEEDS-CONFIRMATION / LOCKED` 属于 out-video-director 的编译流程，不新增入口的第四道全局门控。若 OUT 规划命中 `NEEDS-CONFIRMATION`，只暂停 OUT；用户确认后继续，不重跑无关上游层。
3. **单点调用**：用户只要某类资产 → 直接引导到对应独立 skill，不强制走全流程
4. **范围标注**：README 记录输入范围（全本/章节），一致性仅限该范围

## 独立 skill 索引（按层）

| 层 | Skill | 产出 | 触发 |
|----|-------|------|------|
| L1 | movie-create-drama-story | .movie-create/source/story.md（内部故事源） | 短剧故事生成/从零创作 |
| L1 | movie-create-drama-scanner | .movie-create/scan-index.md | 全本扫描/清单盘点 |
| L1 | movie-create-drama-script | .movie-create/storyboard.json + .movie-create/screenplay.md + 03-分镜脚本图提示词.md | 分镜/剧本 + 分镜脚本图块交付物 |
| L1 | movie-create-drama-review | .movie-create/review.md（内部 PASS/FAIL） | 审阅分镜 |
| L1 | movie-create-drama-emotion | 内存 `character_peak_expressions[]` + `shot_emotion_directives[]` | 角色/分镜/视频情绪注入 |
| L1 | movie-create-drama-dialogue | 内存 voice directives（按 shot_id） | 冻结前建议、冻结后逐镜配音参数 |
| L2 | movie-create-design-style | 风格指南（可选前置） | 电影风格提炼 |
| L2 | movie-create-design-scene-layout | .movie-create/scene-layout/ | 内部场景布局/空间蓝图 |
| L2 | movie-create-design-scene | 02-场景提示词/ | 场景块/场景提示词 |
| L2 | movie-create-design-character | 01-角色提示词/ | 角色块/角色提示词 |
| OUT | movie-create-out-video-director | 轻量任务：04-视频提示词.txt；复杂任务：.movie-create/video-plan.md + 04-视频提示词.txt | 分镜→编译前判断→（必要时规划）→视频提示词 |
| — | `../shared/`（共享层） | style-dna/负面块/运镜库/机械校验脚本 | 所有 skill 引用 |

## 用户输入处理指令（激活后执行，问答式向导）

### 第一步：主路径选择（🔴 必做；意图已明确则跳过，未明确才数字点选）
**判定优先级**：用户已给小说文本 → 直接 [1]；已给明确点子 → 直接 [2]；两者都没给（只说"AI漫剧/做个短剧"）→ 显示点选询问。格式：
```
【追问 1/2 · 创作来源】你想怎么开始？
[1] 小说改编（你提供已有小说/剧本 → 全流程拆解）
[2] AI 创建脚本（给个点子/题材 → 先生成剧本 → 再走全流程）
👉 回编号 [1] 或 [2]，或直接描述你的需求
```
- 用户回 [1] 或提及"小说/剧本/原文" → 路径 = **小说改编**（第二步走 scanner）
- 用户回 [2] 或只说"写个XX剧/点子" → 路径 = **AI 创作**（先调 drama-story 生成剧本，再走 scanner）
- 用户直接给小说文本 → 视为 [1]，跳过本追问
- 用户直接给点子 → 视为 [2]，跳过本追问

### 第二步：主路径分支
**分支 A：小说改编**（[1]）
1. 核验输入：①实际原文或改编范围 ②目标时长、模型、画幅、风格路线与写入目标；缺失或冲突项才最小提问
2. 调 movie-create-drama-scanner 扫描 → `.movie-create/scan-index.md`
3. 进入风格定调（第三步）

**分支 B：AI 创建脚本**（[2]）
1. 核验目标时长、模型、画幅、风格路线与写入目标；缺失或冲突项才最小提问
2. 调 movie-create-drama-story：识别用户已给字段，非关键选项使用默认值；仅协作审阅模式要求逐层确认 → 生成剧本
3. 直接模式生成后内部冻结剧本并进入 scanner；协作审阅模式等待用户确认剧本
4. 调 movie-create-drama-scanner 扫描剧本 → `.movie-create/scan-index.md`
5. 进入风格定调（第三步）

> 剧本未生成或存在真实冲突 → 不得进入 scanner；直接模式不因非关键选项未逐项确认而暂停。

### 第三步：风格定调决策（四选一）
识别用户输入，确定风格定调路径：
| 用户给了什么 | 定调路径 | 下一步 |
|------------|---------|-------|
| 电影参考图/截图 | 路径A：movie-create-design-style 提炼 → 匹配 96 库 | 调用 `movie-create-design-style` |
| 明确风格名（"赛博朋克"） | 路径B：96 库直接选 | 调用 `movie-create-design-preset` |
| 用户说"跳过风格" | 路径C：跳过风格 | 不调用 style，标注「无风格定调」 |
| 自定义风格 | 路径D：自定义风格 | 使用用户正向规则或 style-dna；不调用电影截图专属 design-style |
| 接受题材推荐 | 路径D：题材推荐 | 直接模式选取可追溯的最匹配 96 预设并标记「默认」；协作模式推荐 1–3 项让用户选；转为 96 预设时调用 design-preset |

> 直接模式定调完成后内部继续；协作审阅模式或风格来源存在真实冲突时才暂停。

### 第四步：声明管线
告知用户将走**两层架构（美术层先行 → 剧本层）**；直接模式连续执行，协作审阅模式保留层间门控，或按用户需求单点调用。

### 第五步：执行调度（含层级门控）
严格按唯一权威顺序执行；仅协作审阅模式在层级边界门控。每步调用对应独立 Skill，**不自行生成**：scanner → 风格（可跳过）→ emotion 角色证据 pass → 角色/场景 → script 3A draft 建立 shot_id → dialogue 冻结前建议 + emotion 镜头 pass → script 3B 合并/冻结/渲染 → 机械校验 → review → PASS 后 dialogue voice directives → OUT。

### 第六步：交付（输出模板）

### 最终可见交付边界（直接模式）
直接模式最终响应只允许四块提示词：01-角色提示词、02-场景提示词、03-分镜脚本图提示词、04-视频提示词；可附一行标题或参数。禁止向用户输出 RUN_META、Skill 调用清单、QA/校验摘要、内部路径、内部状态、计划、Gate 或评测元数据；这些内容仅保留内部态。主链暂停由 entry 统一拥有，design-style 在入口直接模式不得设置子暂停。

```
## {小说名} · 影视化拆解完成

### 01-角色提示词
{角色提示词正文}

### 02-场景提示词
{场景提示词正文}

### 03-分镜脚本图提示词
{分镜脚本图提示词正文}

### 04-视频提示词
{视频提示词正文}
```
> 内部操作说明：完成四块文字提示词后，用户可自行跳转 MiniMax Hub / Seedance；该说明不属于直接交付正文。
