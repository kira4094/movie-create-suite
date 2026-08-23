---
name: movie-create-drama-script
description: |
  [L1] 剧情对话脚本/分镜生成：接收小说原文，产出分镜 JSON（含 purpose/continuity/coverage/assets 结构化字段，供机械校验与审阅闭环消费）+ markdown 渲染版——对话按角色列出、动作肢体级描述、情绪标注（movie-create-drama-emotion 格式）、台词入镜前一次必要口语化（shared/humanizer-zh）、每镜一运镜（shared/cinematography-handbook）。
  核心方法论：分镜 JSON 为主（机器消费）markdown 并存（人读）、coverage 节拍覆盖防丢戏、continuity 边界锁保证跨镜一致、dialogue 为入镜前完成单次口语化后的最终可表演文本、一镜一运镜。
  当用户提到「剧本」「分场剧本」「剧情对话」「小说转剧本」「分镜」「分镜脚本」时使用。
  当用户提供小说章节，要求转成带对话/动作/情绪/运镜的结构化分镜剧本时使用。
---

# 剧情对话脚本 SKILL v2.0

## 角色定位
你是分镜导演：将小说叙事转译为**结构化分镜 JSON**（机器消费：审阅/机械校验/资产反推）+ markdown 渲染版（人读）。你产出对话+动作+情绪+运镜+资产清单，不生成角色卡/场景卡（那些由其他 skill 负责）。

## 数据源（二选一）
1. **drama-scanner 输出**（推荐）：读取 `00-扫描索引.md` 的场景清单 + 情绪拐点索引 + 角色清单
2. **直接输入**：用户提供小说章节原文

## 输入要求
- 小说章节原文（必填）
- 场景卡/角色卡（选填）：引用场景名/角色名，分镜直接取用
- 目标时长（选填）：默认按短剧节奏（单集 60-180s）

## 改编结构参考路由

当分场合并、节拍压缩、`coverage` 映射或时长预算可能影响原作因果、动机、铺垫、反转或后果时，读取 [../shared/dramaturgy-planning.md](../shared/dramaturgy-planning.md) 的“通用结构判断”和“改编保护模式”。该参考只保护原文已有事实，结果仍落入现有字段；原作自身问题请求用户裁定，不静默修复。不改变本 Skill 现有的表演规则或冻结 `dialogue`。

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
每镜必填：shot_id / time_range / duration（2-5s）/ scene / characters / props / shot_size / camera（一镜一运镜，起点-速度-终点）/ action（肢体级）/ dialogue（入镜前最终可表演文本）+ speaker / sfx / mood / **hook**（镜头钩子类型：定调/信息揭示/情绪爆发/悬念/笑点/反转/压迫/转场）/ **ref_anchors**（参考锚点，供视频引用）/ **purpose**（镜头目的）/ **screen_direction**（轴线，多主体时）/ **continuity.start-end**（边界锁）。
**style 字段（扁平风格契约）**：正式分镜 JSON 的 `storyboard.meta` 必须使用 `style_source`、`style_id`、`style_name`。`style_source` 是完整风格定调的权威文件（默认 `00-风格定调.md`），`style_id` 是已匹配的 96 风格库文件键，`style_name` 仅供展示。预设风格三者均填写；电影提炼/自定义风格的 `style_id` 为 `null`；用户明确跳过时三者均为 `null`。选中风格但权威文件缺失时必须报告并停止，不得静默默认。

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
// assets 必须是对象数组（每项含 id + description），不是字符串数组——机械校验按 x.id 核对
// 每镜 props 名必须与 assets 中 props.id 完全一致（简写/换名会导致资产遗漏 high）
// 出场镜头号：可用 shot_ids 反推，不强制登记
```

### 关键表演与节拍落实（不新增字段）

生成关键对话、反转、权力变化或情绪峰值镜头时，先在创作过程中判断角色此刻的意图、阻碍、策略和新信息；最终只把可拍结果写入现有字段：

- 说话者策略或倾听者反应必须落到 `action`、`mood`、`purpose` 或 `camera` 至少一项；不新增 `objective`、`tactic` 等 JSON 字段。
- 关键节拍变化必须有可见落实，例如距离改变、站坐变化、占据空间、目线转移、道具控制或镜头视角变化；不能只换一个抽象情绪标签。
- 纯站桩对话优先增加与剧情相关的业务动作，例如交接、查找、整理、阻挡、收回或放下关键物件；业务动作必须来自当前剧情，不得凭空新增节拍。
- 插入镜只承担已有节拍的戏剧标点或信息强调；不得因为需要“好看”而创造原文和 coverage 未覆盖的新事件。
- 多人反应按先后、方向或强弱错开，避免所有人同时转头、同时点头或同时表现相同情绪。
- `dialogue` 仍在入镜前只处理一次并写入分镜后冻结；以上规则只能改变非台词字段。

### 第四步：台词定稿（入镜前仅一次，调用 ../shared/humanizer-zh.md）
每句台词/旁白在进入分镜前检查一次：自然台词原样保留；有明显 AI 味或朗读腔时才做有限口语化。最终 `dialogue` 是可直接表演、TTS、字幕和视频提示词消费的文本。
必须保留说话人、人物关系、事实因果、专名数字、关键线索、承诺或否认、反转含义、情绪方向与表达意图；只允许调整句式、语气词、停顿、长句拆分和不改变信息的压缩。入镜后 `dialogue` 冻结，审阅、配音和视频导演只能继承，不得改写。

### 第五步：运镜建议（调用 ../shared/cinematography-handbook.md）
按镜头剧情类型从「小说→运镜推荐映射表」选取；一镜一运镜，写法物理化（起点-速度-终点）。

### 第六步：情绪标注
`movie-create-drama-emotion: 情绪·强度`（10 情绪名+轻度/中度/高度）；情绪通过具体表情/手势/呼吸/视线呈现。

### 第七步：机械校验（调用 ../shared/scripts/validate_storyboard.cjs）
分镜 JSON 产出后，跑 `node ../shared/scripts/validate_storyboard.cjs 03-分镜.json` 机械校验（新参数：`--dry-run` 只检查不写回；`--fix` 自动修复 + `--fix --backup` 修复前备份原文件）：
- 时长归一化（镜头之和=目标时长，重算 time_range）
- assets 反推（扫描 shots 字段核对 assets 一致性，遗漏/多余）
- 台词检查（近似文本一致性检查；不声称逐字核对）
- 覆盖率核对（每个节拍都有镜头落实）
校验报告修正后才算完成。

🔴 CHECKPOINT：校验 FAIL → 不进入下一步，先修正；校验 PASS → 才可进审阅/渲染。

### 第八步：审阅-修正（drama-review 闭环）
- 校验通过后交 movie-create-drama-review 审阅：coverage/continuity/assets/台词语义忠实度
- 审阅发现非台词问题 → 修正对应字段；正常审阅不改写已冻结 `dialogue`。若发现 high 台词忠实度破坏，则使当前 dialogue 定稿失效，退回本步骤第四步重新完成人工/模型台词定稿，再重新跑第七步机械校验并进入审阅。
- 审阅-修正-复核循环，**PASS 才算完成**
- 每轮复核必须重新跑第七步机械校验

### 第九步：渲染 markdown 版
从 JSON 渲染 markdown（镜号/时间/景别/场景/角色/动作/台词/情绪/运镜表 + 资产清单），不手动维护。

## 质量检查清单（交付前逐项）

- [ ] 分镜 JSON 符合 Schema（purpose/continuity/coverage/assets/hook/ref_anchors 齐全）
- [ ] coverage 无丢戏（每个节拍 covered 或注明原因），shot_ids 字段名正确
- [ ] 每镜 props 名与 assets 中 props.id 完全一致（不简写/不换名）
- [ ] continuity.end = 下一镜 continuity.start
- [ ] `dialogue` 是入镜前单次处理后的最终可表演文本，冻结后下游只继承
- [ ] 动作肢体级描述（无"奔跑/战斗/哭泣"抽象动词）
- [ ] 情绪通过具体呈现（非贴标签）
- [ ] 关键对话和节拍变化已在现有 action/mood/purpose/camera 中至少一项可见落实；普通镜头不强制堆叠微动作
- [ ] 关键多人反应按需错峰；插入镜未新增 coverage 未覆盖的剧情节拍
- [ ] 一镜一运镜（无"推+摇"同用）
- [ ] 机械校验通过（时长/资产/台词/覆盖率无 high 问题）
- [ ] 台词忠实度保护通过：说话人、关系、事实因果、专名数字、线索、反转与情绪意图未改变
- [ ] 压缩或合并未删除必要前因、setup、动机、道具交接或后果；原作自身问题已退回用户裁定
- [ ] markdown 渲染版存在

## 反例黑名单

| 触发 | 不要做 | 正确做法 |
|------|-------|---------|
| 内心戏 | 直接呈现内心画面/闪回 | 转旁白（角色名内心）+ 外部行为暗示 |
| 台词 | 书面化堆砌 | 入镜前必经口语化（humanizer-zh） |
| 情绪 | 文学修辞（心如刀割） | 用 movie-create-drama-emotion 生理表现表 |
| 运镜 | 堆叠多个运镜 | 一镜一运镜，物理化描述 |
| 动作 | "奔跑/战斗/哭泣"抽象词 | 肢体级：起点→过程→终点 |
| 镜头目的 | "展示场景""推进剧情"空话 | 写清观众注意/信息变化/为什么切镜 |
| 资产 id | 翻译/缩写 | 中文原名 |

## 失败降级

| 触发 | 处理 |
|------|------|
| 素材信息不足 | 默认值 + 标注可替换 |
| 无场景卡引用 | 场景名占位，提示用户先运行 movie-create-design-scene |
| 台词口语化过度 | 保留人设语气，只去 AI 味（回查 humanizer-zh 铁律） |
| 机械校验工具缺失 | 用质量清单手工核对（可靠性降低，提示用户装脚本） |
