# GATE-004：角色受控派生与分镜脚本图契约

> 结果：**APPROVED（已批准，Part2 规格于 2026-08-30 经用户实测修订）**
>
> 决策所有者：Sol；批准日期：2026-08-28；用户已明确授权本 Gate 的产品方向与规格。
>
> 最终验收：**PASS（2026-08-28）**；Luna 实施及测试完成，Terra 最终只读复审 PASS，Sol 验收通过。

## 决策

1. 废止“每个 Part 一律输出技能0–10”的旧规则，改为 Part 1–4 各自独立、精简、固定的字段模板；字段顺序固定，每个字段恰好出现一次，不得合并为同一行。
2. Part 1 是唯一角色定稿与角色视觉事实源：9:16 竖版、2K。
3. Part 2 仅从 Part 1 受控派生：**3:4 竖版、2K、2行×3列六格**；上排约35%且仅为头颈正面/左侧45°/右侧90°，下排约65%且仅为锁骨至鞋履正面/左侧45°/右侧90°，三列等宽、上下列严格对齐。下排以锁骨和双肩为画面上缘，头部、面部、头发、耳朵、颈部不进入下排；禁止背面和全身三视图。该决定取代旧的 4:3 横版排版，原决定已被 2026-08-30 用户实测推翻。
4. Part 3 仅从 Part 1 受控派生：16:9 横版、2K、2行×3列六格；只允许改变有镜头证据的表情和轻微头颈姿态。
5. Part 4 仅拆解 Part 1 已存在的服装、配饰与随身物：4:3 横版、2K；1件=1×1、2件=1×2、3–4件=2×2、5–6件=2×3，超过6件按原顺序分页，每页最多6格。
6. Part 2/3/4 不得新增、替换或推断 Part 1 未冻结的身份、种族、年龄、体型、面部、发型、服装、配饰、伤痕、主色或美术风格。信息不足时退回 Part 1 修订，再重新生成受影响 Part。
7. 新项目第三块正式改为 `03-分镜脚本图提示词.md`。旧 `03-分镜提示词.md` 仅只读兼容，不自动迁移、覆盖或删除。
8. `.movie-create/storyboard.json` 是镜头、资产、连续性、台词与时长的唯一事实源。03 是静态宫格渲染；04 是时序视频编译；两者都直接消费 JSON，04 不得读取、复制或反向解析 03。
9. 原逐镜六段式中的场景、构图、光影、材质与色彩语义并入 04 的逐镜静态视觉基线；04 再叠加动作起点/过程/终点、运镜、情绪反应、冻结对白、voice directives、声音、时间轴和目标模型语法。
10. 03 宫格分页按镜头顺序执行：1镜=1×1、2镜=1×2、3–4镜=2×2、5–6镜=2×3、7–9镜=3×3；超过9镜分页，每页最多9格。每格必须映射到现有 `shot_id`，不得新增剧情事实。
11. 通用反向词不得自动加入直接的性/解剖敏感词（包括已实测造成风险的“裸露”“私密部位”）；改用“完整着装、服装结构完整、覆盖关系正确”等正向视觉约束。本规则用于降低误审风险，不声称绕过任何平台审核。

## 授权实施范围

- `skills/movie-create-design-character/SKILL.md`
- `skills/movie-create-design-character/references/character-card-spec.md`
- `skills/shared/negative-block.md`
- `skills/shared/scripts/validate_character_card.cjs`
- `tests/cards/test_validate_character_card.cjs`
- `tests/cards/fixtures/character/**`
- `skills/movie-create-drama-script/SKILL.md`
- `skills/movie-create-drama-script/references/script-spec.md`
- `skills/movie-create-drama-emotion/SKILL.md`（仅限将第三块旧写入名改为新名，并声明旧名只读兼容）
- `skills/movie-create-out-video-director/SKILL.md`
- `skills/movie-create-out-video-director/references/pre-prompt-planning.md`
- `skills/movie-create-entry/SKILL.md`
- `skills/shared/skill-registry.json`
- `skills/shared/skill-registry.md`
- `.codex-plugin/plugin.json` 与 `.claude-plugin/plugin.json` 中仅限交付名称说明，不改版本
- `tests/integration/test_four_blocks_contract.cjs`
- `tests/integration/fixtures/**`
- 本 Gate 文件

禁止引入完整 storyboard v2、normalizer、稳定资产 ID、资产注册表、项目迁移、风格库批量重写、模型 API 调用或版本发布。

## 验收标准

- 角色 validator 按 Part 校验精确字段顺序、唯一出现、禁止额外字段、固定画幅、Part 2 六格强布局与下排边界、Part 3 六格、Part 4 宫格/分页及 Part 1 引用。
- 新增 FAIL fixtures 覆盖旧 4:3、弱布局、缺角度/边界/降级路径的 Part 2、字段合并、额外技能、Part 4 错误格数和自动敏感词。
- 第三块的新名称、文件名、宫格职责与旧路径只读回退在 entry、registry、script、OUT 和集成测试中一致。
- 04 明确只从 storyboard JSON、style-guide、voice directives 和冻结资产事实编译，不读取 03。
- 现有 storyboard 安全校验语义不变。
- 以下检查全部通过：

```powershell
node skills/shared/scripts/check_skill_registry.cjs
node tests/cards/test_validate_character_card.cjs
node tests/cards/test_validate_scene_card.cjs
node tests/storyboard/test_validate_storyboard.cjs
node tests/integration/test_four_blocks_contract.cjs
node tests/integration/test_local_resource_paths.cjs
git diff --check
```

## 文件所有权与阶段

- 本 Gate 与最终验收：Sol。
- 上述实现文件与测试：Luna，且 Luna 不得扩大范围或重新解释本 Gate。
- 实施后复审：Terra，只读。

## 回滚与停止条件

- 若精确模板无法在不引入新资产注册表或 storyboard v2 的情况下实现，停止并返回 Sol。
- 若需要迁移、删除或覆盖既有用户项目，停止；旧产物只能保持只读兼容。
- 若 03 与 04 需要互相解析才能工作，停止；必须回到共同 JSON 事实源。
- 若实现需要修改授权范围外的共享接口，停止并申请新 Gate。
