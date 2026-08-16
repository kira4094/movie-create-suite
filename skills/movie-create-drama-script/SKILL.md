---
name: movie-create-drama-script
description: |
  [L1] 剧情对话脚本/分镜生成：接收小说原文，产出分镜 JSON（含 purpose/continuity/coverage/assets 结构化字段，供机械校验与审阅闭环消费）+ markdown 渲染版——对话按角色列出、动作肢体级描述、情绪标注（movie-emotional-director 格式）、台词必经口语化（shared/humanizer-zh）、每镜一运镜（shared/cinematography-handbook）。
  核心方法论：分镜 JSON 为主（机器消费）markdown 并存（人读）、coverage 节拍覆盖防丢戏、continuity 边界锁保证跨镜一致、台词逐字保留供校验、一镜一运镜。
  当用户提到「剧本」「分场剧本」「剧情对话」「小说转剧本」「分镜」「分镜脚本」时使用。
  当用户提供小说章节，要求转成带对话/动作/情绪/运镜的结构化分镜剧本时使用。
---

# 剧情对话脚本 SKILL v2.0

## 角色定位
你是分镜导演：将小说叙事转译为**结构化分镜 JSON**（机器消费：审阅/机械校验/资产反推）+ markdown 渲染版（人读）。你产出对话+动作+情绪+运镜+资产清单，不生成角色卡/场景卡（那些由其他 skill 负责）。

## 数据源（二选一）
1. **novel-scanner 输出**（推荐）：读取 `00-扫描索引.md` 的场景清单 + 情绪拐点索引 + 角色清单
2. **直接输入**：用户提供小说章节原文

## 输入要求
- 小说章节原文（必填）
- 场景卡/角色卡（选填）：引用场景名/角色名，分镜直接取用
- 目标时长（选填）：默认按短剧节奏（单集 60-180s）

## 输出

```
D:\Projects\TolariaData\MovieCreate\{小说名}\03-剧情脚本.md        ← markdown 渲染版（人读）
D:\Projects\TolariaData\MovieCreate\{小说名}\03-分镜.json          ← 分镜 JSON（机器消费）
```

## 处理流程

### 第一步：节拍分析（coverage 基础）
通读剧本，拆成 3-8 个关键节拍（每个 = 完整的信息/情绪单元），为 coverage 做准备。**禁止丢戏**（关键节拍必须有镜头落实）。
> **分镜密度参考**：15s ≈ 4 镜、30s ≈ 5-6 镜、60s ≈ 7-9 镜；每镜只讲一个信息/情绪单元。

### 第二步：分场
场景切换即换场；同场景时间跳变拆两场。

### 第三步：分镜 JSON（按 references/script-spec.md 的 Schema）
每镜必填：shot_id / time_range / duration（2-5s）/ scene / characters / props / shot_size / camera（一镜一运镜，起点-速度-终点）/ action（肢体级）/ dialogue（逐字保留）+ speaker / sfx / mood / **hook**（镜头钩子类型：定调/信息揭示/情绪爆发/悬念/笑点/反转/压迫/转场）/ **ref_anchors**（参考锚点，供视频引用）/ **purpose**（镜头目的）/ **screen_direction**（轴线，多主体时）/ **continuity.start-end**（边界锁）。
**style 字段（继承风格定调，2026-08-16 打通）**：分镜 JSON 的 meta 层加 `"style": "{风格名}"`（从 00-风格定调.md 继承）——分镜写光影/空间/镜头语言时参考该风格的「空间语言/视觉张力/禁止误区」（shared/风格定义库/{编号}_{风格}.md）；供 out-video-director 读 style 生成风格块。

全片：**coverage** + **assets**（以下为机械校验消费的确切格式）：

```
coverage: [
  {"beat": "{节拍名}", "shot_ids": ["{镜头ID}"], "status": "covered"}
  // beat=节拍名；shot_ids=落实该节拍的镜头ID数组（字段名必须 shot_ids，不是 shots）
  // status: covered / omitted_with_reason / nonvisual_context
]
assets: {
  "characters": [{"id": "{角色名}", "desc": "{外观/身份一句话}"}],
  "scenes":     [{"id": "{场景名}", "desc": "{环境一句话}"}],
  "props":      [{"id": "{道具名}", "desc": "{特征一句话}"}]
}
// assets 必须是对象数组（每项含 id + desc），不是字符串数组——机械校验按 x.id 核对
// 每镜 props 名必须与 assets 中 props.id 完全一致（简写/换名会导致资产遗漏 high）
// 出场镜头号：可用 shot_ids 反推，不强制登记
```

### 第四步：台词口语化（必经步骤，调用 ../shared/humanizer-zh.md）
每句台词/旁白产出后必经口语化检查（书面→口语、人设差异化、口语质感、反朗读腔）。
铁律：只改台词列，动作/神态/场景引用不动；**口语化在台词进入分镜前完成**——进入分镜后台词逐字保留（供审阅/校验核对）。

### 第五步：运镜建议（调用 ../shared/cinematography-handbook.md）
按镜头剧情类型从「小说→运镜推荐映射表」选取；一镜一运镜，写法物理化（起点-速度-终点）。

### 第六步：情绪标注
`movie-emotional-director: 情绪·强度`（10 情绪名+轻度/中度/高度）；情绪通过具体表情/手势/呼吸/视线呈现。

### 第七步：机械校验（调用 validate_storyboard.cjs）
分镜 JSON 产出后，跑 `validate_storyboard.cjs 03-分镜.json` 机械校验：
- 时长归一化（镜头之和=目标时长，重算 time_range）
- assets 反推（扫描 shots 字段核对 assets 一致性，遗漏/多余）
- 台词核对（与原文逐字比对）
- 覆盖率核对（每个节拍都有镜头落实）
校验报告修正后才算完成。

### 第九步：humanizer 拟人化（可选，审阅/校验通过后执行）
> 小说为 AI 生成时，台词自带 AI 味（书面化/堆砌/工整）。审阅通过后的最终版，用 `../shared/humanizer-zh.md` 过一遍台词拟人化。

- 处理对象：分镜 JSON 的 `dialogue` 字段（对白 + 旁白）
- 规则（遵循 shared/humanizer-zh.md 铁律）：
  - 只作用「台词」，动作/神态/场景引用/运镜不动
  - **保留人设语气**（去 AI 味不去角色味：结巴/毒舌/口癖保留）
  - **不改台词语义**（只换表达，不删关键信息）
  - 重点消除：书面排比、对称句、成语堆砌、报告动词、"此外/然而"连接词、金句式结尾
- **与审阅的关系**：审阅锁定的是"台词与原文语义一致"；humanizer 在语义一致基础上做最终润色，不破坏语义
- 产物：更新分镜 JSON 的 dialogue + 同步 markdown 渲染版

> 触发条件：小说为 AI 生成 / 用户明确要求拟人化 / 台词书面感明显。非 AI 原创小说可跳过。

### 第十步：渲染 markdown 版
从 JSON 渲染 markdown（镜号/时间/景别/场景/角色/动作/台词/情绪/运镜表 + 资产清单），不手动维护。

## 质量检查清单（交付前逐项）

- [ ] 分镜 JSON 符合 Schema（purpose/continuity/coverage/assets/hook/ref_anchors 齐全）
- [ ] coverage 无丢戏（每个节拍 covered 或注明原因），shot_ids 字段名正确
- [ ] 每镜 props 名与 assets 中 props.id 完全一致（不简写/不换名）
- [ ] continuity.end = 下一镜 continuity.start
- [ ] 台词逐字保留（口语化在入镜前完成，入镜后不改）
- [ ] 动作肢体级描述（无"奔跑/战斗/哭泣"抽象动词）
- [ ] 情绪通过具体呈现（非贴标签）
- [ ] 一镜一运镜（无"推+摇"同用）
- [ ] 机械校验通过（时长/资产/台词/覆盖率无 high 问题）
- [ ] humanizer 拟人化（如需）：台词已去 AI 味，人设语气保留，语义未改
- [ ] markdown 渲染版存在

## 反例黑名单

| 触发 | 不要做 | 正确做法 |
|------|-------|---------|
| 内心戏 | 直接呈现内心画面/闪回 | 转旁白（角色名内心）+ 外部行为暗示 |
| 台词 | 书面化堆砌 | 入镜前必经口语化（humanizer-zh） |
| 情绪 | 文学修辞（心如刀割） | 用 movie-emotional-director 生理表现表 |
| 运镜 | 堆叠多个运镜 | 一镜一运镜，物理化描述 |
| 动作 | "奔跑/战斗/哭泣"抽象词 | 肢体级：起点→过程→终点 |
| 镜头目的 | "展示场景""推进剧情"空话 | 写清观众注意/信息变化/为什么切镜 |
| 资产 id | 翻译/缩写 | 中文原名 |

## 失败降级

| 触发 | 处理 |
|------|------|
| 素材信息不足 | 默认值 + 标注可替换 |
| 无场景卡引用 | 场景名占位，提示用户先跑 movie-scene-card |
| 台词口语化过度 | 保留人设语气，只去 AI 味（回查 humanizer-zh 铁律） |
| 机械校验工具缺失 | 用质量清单手工核对（可靠性降低，提示用户装脚本） |
