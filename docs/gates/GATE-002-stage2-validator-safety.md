# GATE-002：阶段 2 分镜校验器安全修复

> 结果：**APPROVED（已批准）**
>
> 所有者：Sol
>
> 批准日期：2026-08-22

> 范围修订：**Rev.2 — 2026-08-22，经用户确认。** 本修订将 Stage 2 收窄为“提示词质量防退化”，并覆盖下文中与测试位置、完整 v2 预实现或后续阶段默认推进相冲突的旧表述。

## Rev.2 质量目标

本阶段不以“工程结构更完整”为成功标准，只处理会让短剧提示词链路损坏、丢失信息或产生假通过的真实问题：

- 不可行时长导致死循环或无法结束；
- `parseInt` 接受畸形时长；
- `--fix` 写回破坏原文件、包裹对象或未知字段；
- coverage、`intentional_repeat`、`shot_id`、资产引用或时间轴被误判为通过；
- 台词检查把近似核对误称为逐字核对，或静默跳过短台词和旁白；
- 机械修复把 1 秒硬下限误当成 2–5 秒创作质量建议。

本阶段不得建立完整 v2 Schema、normalizer、稳定资产 ID、`assets.registry.json`、`project.json`、全消费者迁移或视频导演模块化。

## Rev.2 测试资产位置

测试文件与生产 Skill 分离。最终允许路径调整为：

- `skills/shared/scripts/validate_storyboard.cjs`
- `tests/storyboard/test_validate_storyboard.cjs`
- `tests/storyboard/fixtures/*.json`

旧计划中的 `skills/shared/scripts/test_validate_storyboard.cjs` 与 `skills/shared/scripts/fixtures/` 不再作为最终位置。测试阶段可以使用临时副本或工作区暂存文件；验收前必须清理：

- 与本项目真实缺陷无关的 fixture；
- 重复覆盖同一行为且没有额外回归价值的 fixture；
- 调试脚本、`.new`、`.tmp`、备份和中间生成物；
- 工作区中的未采用实验实现。

最终保留的每个 fixture 必须能对应至少一个明确的历史风险或 Gate 验收条件。fixture 只供测试使用，不得被 Skill 运行时自动加载。

## Rev.2 后续路线

Stage 2 通过后不得自动进入原 V2 Stage 3–6。下一步只能是 Q0：以 2–3 个匿名短剧黄金样例，对角色一致性、场景一致性、剧情覆盖与连续性、台词情绪可表演性、Seedance/H3 格式与实际生成效果进行人工对比。

只有 Q0 证明当前单一 `dialogue` / `mood` 确实造成质量损失时，Sol 才可另行签发最小的“三文本台词 + 逐角色表演”Gate。

## 已批准输入

- 最终计划：`D:\WindowsOS\Desktop\luna-执行计划-movie-create-suite.md`
- 计划版本：`Luna 执行计划 V2`
- 计划 SHA-256：`BE2CBEBB591350BAC0A83432844AE3DCAF23010FB75B78968CEE43ADD834C0C9`
- 阶段 1 最终验收：`docs/gates/GATE-001-stage1-naming-routing.md`
- Gate A 冻结语义：`docs/adr/ADR-002-storyboard-v2.md`
- 实施起点：包含 Luna 阶段 1 与中文决策文档的当前 HEAD

## 本 Gate 批准的决策

- `coverage`、`intentional_repeat`、机械时长、安全修复和台词近似核对的语义，以 ADR-002 的“Gate A：已冻结的校验语义”为唯一权威。
- 阶段 2 只修复既有 v1 校验器并建立回归测试，不实施完整 v2 Schema、normalizer、资产注册表或下游双写。
- `--fix` 保留兼容入口；新增 `--dry-run` 与可选的 `--fix --backup`。
- 所有自然语言说明、代码注释、测试说明、输出与报错使用中文；代码标识符、JSON 字段、命令、路径、枚举和固定兼容值可保留英文。

## 已授权文件

Luna 只可创建或修改：

- `skills/shared/scripts/validate_storyboard.cjs`
- `skills/shared/scripts/test_validate_storyboard.cjs`
- `skills/shared/scripts/fixtures/storyboard-valid-v1.json`
- `skills/shared/scripts/fixtures/storyboard-duration-mismatch-v1.json`
- `skills/shared/scripts/fixtures/storyboard-impossible-duration-v1.json`
- `skills/shared/scripts/fixtures/storyboard-intentional-repeat-v1.json`
- `skills/shared/scripts/fixtures/storyboard-empty-shots-v1.json`
- `skills/shared/scripts/fixtures/storyboard-invalid-duration-v1.json`
- `skills/shared/scripts/fixtures/storyboard-mixed-minimum-duration-v1.json`
- `skills/shared/scripts/fixtures/storyboard-wrapped-unknown-fields-v1.json`

若原子替换失败测试必须使用辅助 fixture，可在同一 fixtures 目录新增一个最小匿名 JSON，但必须在汇报中说明原因。

## 禁止范围

Luna 不得修改：

- `docs/**`、AGENTS.md 或桌面计划；
- `skills/shared/风格定义库/**`；
- Skill 生产端或下游消费者；
- `storyboard.schema.json`、normalizer、资产注册表或项目配置；
- `skill-registry.json`、入口路由和插件元数据；
- `version.json`、发布版本、日志或发布记录；
- Gate B 所属的任何完整 v2 契约、迁移和双写语义。

## 必须覆盖的测试

测试脚本必须对每个 fixture 断言退出码、`verdict`、关键问题类别与是否写回，并至少覆盖：

- 有效 v1 通过；
- 时长不匹配在 `--dry-run` 下产生计划但哈希不变；
- 安全的 `--fix` 写回后重新校验通过；
- 目标时长小于镜头数时快速失败且不写回；
- 空镜头失败且不进入分摊；
- 非正、非有限、小数、字符串或带单位时长失败；
- 部分镜头已经为 1 秒时，缩短算法只在实际减少时消耗差值并精确收敛；
- `intentional_repeat` 的 `reason`、非空 `shot_ids` 和引用存在性；
- `covered`、`omitted_with_reason`、`nonvisual_context` 与未知状态的冻结规则；
- `time_range` 起止、连续性、区间长度和最终结束时间；
- `shot_id` 唯一；
- assets 的重复 ID、遗漏引用和多余声明；
- 包裹对象的未知顶层字段在 `--dry-run` 与 `--fix` 后均保持原值；
- `--backup` 内容与修复前输入逐字节一致；
- `--fix` 与 `--dry-run` 冲突、`--backup` 单独使用、未知参数和缺参均以非 0 退出；
- 直接台词、短台词、旁白的近似核对类别与严重度；
- 写回仅改变获准的时长字段，不改变容器形态、资产位置或未知字段。

测试必须使用临时副本，不得修改仓库中的基准 fixture。

## 必须运行的验收命令

```powershell
git status --short
node skills/shared/scripts/test_validate_storyboard.cjs
node skills/shared/scripts/validate_storyboard.cjs skills/shared/scripts/fixtures/storyboard-impossible-duration-v1.json --dry-run
node skills/shared/scripts/check_skill_registry.cjs
git diff --check
```

通过要求：

- 全部回归断言通过；
- 不可行时长命令快速以非 0 退出且没有写回；
- 注册表检查继续通过；
- 变更文件全部位于本 Gate 授权范围；
- 中文要求通过；
- `git diff --check` 通过。

## 停止、失败与回退条件

以下情况必须停止并交回 Sol：

- 实现需要解释或改变任何已冻结 Gate A 语义；
- 需要改变 v2 容器、资产 ID、下游字段或迁移策略；
- 发现用户改动与授权文件重叠；
- 无法证明原子写回失败时原文件保持不变；
- 任一必需 fixture 无法在无第三方依赖下验证；
- 修复需要修改授权范围外的文件。

测试失败时只可在授权文件内修复；不得删减测试、降低严重度或扩大写回字段来制造通过。

## 后续阶段授权

本 Gate **只授权阶段 2**。即使阶段 2 通过，阶段 3–6 仍须等待 Gate B 独立批准。

## Sol 最终验收

> 验收结果：**ACCEPTED（最终通过）**
>
> 验收日期：2026-08-22
>
> 实现提交：`7f4a238 fix: harden storyboard quality validation`

### 验收结论

Stage 2 已按 Rev.2 的“提示词质量防退化”范围完成。实现只强化既有 v1 分镜校验、安全修复与回归测试，没有引入完整 v2 Schema、normalizer、稳定素材 ID、`assets.registry.json`、`project.json`、生产端双写、下游消费者迁移或视频导演模块化。

Terra 完成两轮只读复审：首轮为 `CONDITIONAL`，指出混合 1 秒镜头精确收敛、失败不写回、coverage 缺失假通过与旧式顶层 assets 兼容证明不足；修正后第二轮结果为 `PASS`。Sol 随后在正式项目中独立复跑验收。

### 最终冻结口径

- `coverage` 必须是非空数组；每个条目必须显式提供四种已批准状态之一。缺失或未知状态均为 `high`。
- 包裹 v1 优先读取 `storyboard.assets`；内部缺失时兼容读取旧式顶层 `assets`；两处同时存在且内容冲突时安全失败，不猜测合并。
- `--fix` 仅可原位修改 `shots[*].duration` 与 `shots[*].time_range`，不得移动资产、改变容器形态或丢失未知字段。
- 1 秒是机械可行下限；2–5 秒仍是创作质量建议，不能由机械修复强制替代。

### 正式仓库验证证据

以下检查全部通过：

```powershell
node --check skills/shared/scripts/validate_storyboard.cjs
node --check tests/storyboard/test_validate_storyboard.cjs
node tests/storyboard/test_validate_storyboard.cjs
node skills/shared/scripts/validate_storyboard.cjs tests/storyboard/fixtures/storyboard-impossible-duration-v1.json --dry-run
node skills/shared/scripts/check_skill_registry.cjs
git diff --check
```

验证结果：

- 综合回归测试通过；
- 不可行时长快速以退出码 `1` 和 `FAIL` 返回，`fix_plan` 为 `null`；
- 注册表 13 个条目与 13 个实际 Skill 一致；
- 校验器与测试脚本的正式仓库 SHA-256 分别为 `61D7752688AF5A717C4A2ADEA479EBADAD3ABFBAFC8FE1E7EEF2E4833DECEA6D` 与 `084755455CD19BF4132FBCD82EFD494C6499068BA6E9215BF8B558CE26E99F01`；
- 最终实现变更严格限制在校验器、测试脚本和 8 个测试 fixture。

### Fixture 与清理结论

8 个 fixture 均直接对应历史风险或 Gate 条件，因此全部保留在 `tests/storyboard/fixtures/`。旧位置 `skills/shared/scripts/fixtures/` 的 8 个未跟踪重复副本已删除；早期未采用的实验暂存目录 `D:\Projects\Codex\work\movie-create-suite-stage2` 已删除。测试 fixture 不会被 Skill 运行时自动加载。

### 后续边界

本验收只完成 Stage 2，不授权自动进入原计划 Stage 3–6。下一步若继续，只能另行签发 Q0 Gate，使用 2–3 个匿名短剧黄金样例进行五维人工质量对比；只有 Q0 证明现有台词或表演字段造成实际质量损失，才可讨论最小字段升级。
