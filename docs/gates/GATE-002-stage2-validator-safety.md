# GATE-002：阶段 2 分镜校验器安全修复

> 结果：**APPROVED（已批准）**
>
> 所有者：Sol
>
> 批准日期：2026-08-22

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
