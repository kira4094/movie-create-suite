# ADR-001：Skill 命名与注册表

> 状态：**Accepted by Sol — 2026-08-22。** 仅相应 Gate 记录可授予实施权限。

## 背景

插件有 13 个可调用 Skill，但文档混用当前 ID 与旧概念名；入口的风格路径 B 说明为预设选择，却路由到风格提炼；插件元数据将产品称为 12-Skill 套件，混淆了子 Skill 与对外表面。

## 决策

1. 可调用 Skill ID 必须同时与 `skills/<id>/`、其 `SKILL.md` frontmatter 的 `name:`、以及 `skills/shared/skill-registry.json` 的 `skills[].id` 完全一致。
2. 架构基线列出的 13 个 ID 是完整对外注册表，并保留 11 / 12 / 13 的明确口径。
3. JSON 是机器权威；Markdown 注册表仅供人读，绝不作为校验器输入。
4. 旧名称仅可出现在历史 / 解释文字中。已冻结标签为 `历史概念名（非可调用 Skill）：<old>；当前调用：<movie-create-...>`；没有单一替换项时，须明确列出按意图区分的替换项。旧名称不得作为调用目标。
5. `movie-emotional-director` 按意图拆分：情绪时间轴 → `movie-create-drama-emotion`；视频表演 → `movie-create-out-video-director`；共享词汇 → 共享文档而非 Skill。

## 风格路由

| 路径 | 用户意图 | 可调用 Skill | 结果 |
|---|---|---|---|
| A | 影视参考、导演与截图 | `movie-create-design-style` | 证据驱动的风格提炼 |
| B | 从 96 风格库选择 | `movie-create-design-preset` | 预设选择 |
| C | 自定义或题材推荐 | 不伪装为 A / B 调用 | 记录自定义方向；仅在用户确认后路由 |

路径 C 不是 A 或 B 的替代调用。入口运行说明必须使用完整可调用 ID。

## 后果

- 后续检查器可机械识别遗漏、多余与不匹配的 Skill。
- 可修正路径 B，而无需重新定义两个风格 Skill 的职责。
- 保留历史检索能力，同时移除含糊的动态路由。
- 插件描述可准确区分 12 个子 Skill 与 13 个对外 Skill。

## 不采纳方案

- 可调用别名：会破坏静态校验与清晰的用户路由。
- Markdown 作为第二机器注册表：会形成双重权威并漂移。
- 将 12 个子 Skill 当作插件总数：会隐藏 ENTRY，且与目录结构矛盾。

## Sol 决策

**APPROVED.** 上述命名权威、13-Skill 清单、JSON 注册表权威、风格路由与冻结旧名称标签均已接受。本决策不授权超出阶段 1 Gate 范围的改动。
