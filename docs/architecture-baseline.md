# 架构基线 — movie-create-suite

> 状态：Terra 事实基线与决策输入；本文不批准 Gate，也不授权实施。
>
> 观测基线：`1b7402253aa5d25d5e5c32558eca942db7b4ad6d`，日期为 2026-08-22。

## 范围与证据

本文是阶段 0 评审包的只读基线。事实来自上述提交；未来契约候选仅见 ADR-001 与 ADR-002。

## Skill 清单与流程口径

仓库有 **13 个可调用 Skill**；每项的 `skills/<id>/` 目录名均与 `SKILL.md` frontmatter 的 `name` 相同。

| 层级 | 目录 / 可调用名 | 职责 | 与入口关系 |
|---|---|---|---|
| ENTRY | `movie-create-entry` | 小说改编薄编排器 | 对外入口，协调美术、剧本与 OUT 层 |
| L1 | `movie-create-drama-story` | 原创短剧故事生成 | 仅 AI 创作路径在改编流之前使用 |
| L1 | `movie-create-drama-scanner` | 全书扫描与索引 | 改编的前置数据源 |
| L1 | `movie-create-drama-script` | 分镜 JSON 与 Markdown 剧本 | 产出中枢 `03-分镜.json` |
| L1 | `movie-create-drama-review` | 导演审阅闭环 | 消费分镜 JSON |
| L1 | `movie-create-drama-emotion` | 情绪时间轴 | 消费分镜 `mood` / `coverage` 或扫描数据 |
| L1 | `movie-create-drama-dialogue` | TTS 配音台词表 | 消费分镜 `dialogue` 或 Markdown 兜底 |
| L2 | `movie-create-design-style` | 影视参考风格提炼 | 风格路径 A |
| L2 | `movie-create-design-preset` | 96 风格预设选择 | 风格路径 B |
| L2 | `movie-create-design-scene-layout` | 场景宏观空间蓝图 | 在场景卡质感细化之前 |
| L2 | `movie-create-design-character` | 角色卡 | 读取已确认的风格定调 |
| L2 | `movie-create-design-scene` | 场景卡 | 读取已确认的风格定调与布局 |
| OUT | `movie-create-out-video-director` | 模型适配的视频提示词 | 消费分镜及其他支持的来源形式 |

| 口径 | 数量 | 说明 |
|---|---:|---|
| 小说改编路径子 Skill | 11 | 扫描、剧本、审阅、情绪、台词；5 个 L2 设计 Skill；OUT。不含 ENTRY 与仅 AI 创作使用的 `drama-story`。 |
| AI 创作路径子 Skill | 12 | 上述 11 个加 `movie-create-drama-story`。 |
| 插件对外总数 | 13 | 12 个子 Skill 加 `movie-create-entry`。 |

现有 `.claude-plugin/plugin.json` 描述写“12 个 skill”，相对 13 个对外 Skill 已过时。

## 旧名称：出现位置与语义分类

旧名称不得视为可调用 ID；当前出现位置应按下表分类。

| 旧概念名 | 当前位置 / 含义 | 后续分类 |
|---|---|---|
| `movie-style` | 入口路径 A、风格模板、设计 Skill 说明 | 影视参考风格提炼；当前调用 `movie-create-design-style` |
| `movie-scene-layout` | 场景布局 Skill 的流程说明 | 当前调用 `movie-create-design-scene-layout` |
| `movie-character-card` | 扫描器与剧本对角色卡产物的引用 | 当前调用 `movie-create-design-character` |
| `movie-scene-card` | 扫描器、剧本、布局与角色卡对场景卡的引用 | 当前调用 `movie-create-design-scene` |
| `movie-script` | 扫描器与台词表引用 | 当前调用 `movie-create-drama-script` |
| `movie-script-review` | 历史审阅标签 | 当前调用 `movie-create-drama-review` |
| `movie-emotion-timeline` / `movie-dialogue-table` | 扫描器引用 | 当前调用 `movie-create-drama-emotion` / `movie-create-drama-dialogue` |
| `movie-emotional-director` | 角色、剧本的情绪词汇及视频说明 | 情绪时间轴为 `movie-create-drama-emotion`；视频表演为 `movie-create-out-video-director`；共享词汇为文档而非 Skill |

入口当前存在路由事实错误：路径 B 是预设选择，但表格写为 `调 design-style`；后续应调用 `movie-create-design-preset`。阶段 0 仅记录，不修复。

## 现有项目输出与路径约定

多个 Skill 硬编码个人根路径 `D:\Projects\TolariaData\MovieCreate\{小说名}\...`；这不具可移植性，属于基线问题而非阶段 0 改动。

| 生产者 / 消费者 | 现有输出或输入约定 |
|---|---|
| scanner | 项目根目录及 `00-扫描索引.md`、扫描派生索引 |
| 风格定调 | `{project}/00-风格定调.md` |
| design-character | `...\01-角色卡\{角色名}.md` |
| design-scene-layout | `...\02-场景卡\{场景名}-布局.md` |
| design-scene | `...\02-场景卡\{场景名}.md` |
| drama-script | `...\03-剧情脚本.md` 与 `...\03-分镜.json` |
| drama-emotion | `...\04-情绪时间轴.md` |
| drama-dialogue | `...\05-配音台词表.md` |
| out-video-director | 入口流程中的 `06-视频提示词.txt` |

## 现有画幅默认值

目前没有单一权威项目配置；默认值和资产专用画幅分散在各处。

| 区域 | 现有约定 |
|---|---|
| 项目 / 场景卡默认 | 9:16 竖版 2K；用户明确横版时 design-scene 使用 16:9 |
| 角色主卡 | Part1 定妆 9:16 竖版 2K；Part2 多视图 3:4 竖版 2K、2行×3列六格 |
| 角色可选表演参考图 | 仅用户明确请求；16:9 横版 2K、2行×3列六格，独立文件 |
| 角色可选穿戴物细节图 | 仅用户明确请求；4:3、2K，按物件数网格化并分页 |
| 场景卡规格 | 存在矛盾：文字称默认 9:16，模板及后续规则指定 4:3 横版 2K |
| 影视风格试验图 | 固定 16:9、2K |
| 影视风格身份 / 多视图资产 | 固定 3:4、2K |
| 分镜图 / 视频提示词 | `{画幅}` 占位或 Final_Video_Spec 规定，尚未集中化 |

## 现有分镜数据形态

`movie-create-drama-script/references/script-spec.md` 记录的是 **v1 裸对象**：根层含 `duration_seconds`、`coverage`、`shots`、`assets`。

| 对象 | 现有字段 |
|---|---|
| 根对象 | `duration_seconds`、`coverage`、`shots`、`assets` |
| coverage 项 | `beat`、`source_text`、`shot_ids`、`status`（`covered`、`intentional_repeat`、`omitted_with_reason`、`nonvisual_context`） |
| shot | `shot_id`、`time_range`、`duration`、`scene`、`characters`、`props`、`purpose`、`camera`、`action`、`dialogue`、`speaker`、`mood`、`hook`、`ref_anchors`、`continuity` 及可选轴线字段 |
| continuity | `start` / `end`，可含 `position`、`posture`、`gaze`、`props` |
| assets | `characters`、`scenes`、`props`；当前 ID 是展示名，条目含 `id`、`description`、`shots` |

校验器读取包裹输入时以 `data.storyboard` 为根；当前写回重建 `{ storyboard: root, assets: data.assets }`，会丢失其他未知顶层字段。

## 当前校验器 CLI、行为与风险

### 已实现 CLI

```text
node skills/shared/scripts/validate_storyboard.cjs <分镜.json> [--script <原文.txt>] [--fix]
```

它只解析 `--script`、`--fix` 与位置参数；输出 JSON `{ verdict, issues, summary }`。无高严重度问题时返回 0；缺少文件参数时返回 2。尚无 `--dry-run` 与 `--backup`。

### 已实现检查

- 要求 `shot_id`、`time_range`、`duration`、`scene`、`purpose`、`continuity`、`hook`、`ref_anchors`，并检查连续性起止对象。
- 用 `Math.max(1, parseInt(duration) || 0)` 求和并与真值 `duration_seconds` 比较；检查时间段起点连续。
- 从 `characters`、`scene`、`props` 推导使用资产并与根 `assets` 比较。
- 空 `shot_ids` 除 `omitted_with_reason` 和 `nonvisual_context` 外均为高严重度；`intentional_repeat` 尚无完整语义。
- 检查相邻 `position`、`posture`、`props` 连续性。
- 使用 `--script` 时跳过旁白和归一化后少于 8 字的台词，并以首 / 尾 10 字锚点匹配原文；这是近似检查，而非文件头声称的逐字核对。
- `--fix` 调整时长 / `time_range`，并直接覆盖原文件。

### 已知风险

- 目标时长小于镜头数时，`--fix` 在每镜已钳制为 1 秒后仍递减差值，可能不收敛。
- 空镜头数组可能触发除零取模或不收敛。
- `parseInt` 接受畸形时长；未明确拒绝非正或非有限目标值。
- 直接覆盖不是原子写入，也无备份。
- 包裹对象写回会丢失未知顶层字段。
- `intentional_repeat` 与台词描述夸大了尚未支持的语义。

## 版本与 Git 状态

| 项目 | 观测状态 |
|---|---|
| Git HEAD | `1b7402253aa5d25d5e5c32558eca942db7b4ad6d` |
| 开始时工作树 | 干净（`git status --short` 无输出） |
| `.claude-plugin/plugin.json` | 版本 `v0.28.0(20260817.1420)`，并含过时“12 个 skill”描述 |
| `version.json` | `0.28.0`、构建 `20260817.1420`、SHA `58c46ef0a933e7097a8064ddb26bfe7597ab1f40`，并非当前 HEAD |

## 后续实施的最小匿名 fixture 契约

阶段 0 不创建 fixture。获批后，`tests/baseline/`（或获批位置）只应包含合成数据：有效裸 v1、时长不匹配 / 不可行时长 / 空镜头 / 非法时长 / 混合最低时长、`intentional_repeat`、含未知顶层字段的包裹 v1、规范 v2、多人表演、多句台词、跨镜台词，以及资产注册表新增 / 改名 / retired / 不复用情形。不得复制用户项目或小说资产。
