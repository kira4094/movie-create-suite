# GATE-001：阶段 1 Skill 命名、路由与插件元数据

> 结果：**APPROVED（已批准）**
>
> 所有者：Sol
>
> 批准日期：2026-08-22

## 已批准输入

- 计划：`D:\WindowsOS\Desktop\luna-执行计划-movie-create-suite.md`
- 计划版本：`Luna 执行计划 V2`
- 计划 SHA-256：`BE2CBEBB591350BAC0A83432844AE3DCAF23010FB75B78968CEE43ADD834C0C9`
- 仓库基线 HEAD：`1b7402253aa5d25d5e5c32558eca942db7b4ad6d`
- 架构基线：`docs/architecture-baseline.md`
- 冻结决策：`docs/adr/ADR-001-skill-naming-and-registry.md`

## 已批准决策

- 对外注册表必须且只能包含 13 个可调用 Skill。
- 目录名、SKILL.md frontmatter 的 `name` 与注册表 `id` 必须完全一致。
- `skills/shared/skill-registry.json` 是唯一机器权威；Markdown 注册表只负责人读说明。
- 风格路径 A 调用 `movie-create-design-style`。
- 风格路径 B 调用 `movie-create-design-preset`。
- 风格路径 C 表示自定义或题材推荐，不得伪装成路径 A/B 的调用。
- 历史名称只能按 ADR-001 冻结的“非可调用 Skill”格式保留。
- 插件元数据必须区分 12 个子 Skill 与 13 个对外 Skill；本阶段不修改发布版本。

## 已授权实施范围

Luna 只可新建或修改：

- `skills/shared/skill-registry.json`
- `skills/shared/skill-registry.md`
- `skills/shared/scripts/check_skill_registry.cjs`
- `skills/movie-create-entry/SKILL.md`
- `.claude-plugin/plugin.json`
- 仅当现有 Skill Markdown 把历史名称用作实际调用目标时，才可修改对应文件，将其替换为真实调用名或按 ADR-001 明确标注。

Luna 禁止修改：

- `skills/shared/风格定义库/**`
- `skills/shared/scripts/validate_storyboard.cjs`
- 分镜字段、Schema、fixture、校验器、CLI 行为、兼容语义或迁移策略
- `version.json`、发布版本、`PROJECT_LOG.md` 或 `PROGRESS.md`
- `docs/architecture-baseline.md`、`docs/adr/**`、`docs/gates/**`、桌面执行计划或 AGENTS.md

## 必须满足的实施行为

- 注册表必须覆盖全部且仅覆盖现有 13 个 Skill。
- `depends_on` 只能包含阶段 1 执行时已经存在的路径。
- 尚未创建的契约或 Schema 路径必须放入 `planned_dependencies`，直至相应文件真正建立。
- 检查器必须清晰报告缺失、多余和错配项，并在失败时以非 0 状态退出。
- 检查器必须验证目录名、frontmatter 和注册表 ID 一致，以及风格路径 A/B 路由正确。
- 任何用反引号标出并明确作为调用目标的 `movie-create-*` 名称都必须存在于注册表。
- 禁止增加第三方依赖或联网安装。
- 必须保留用户已有改动；若与任务范围重叠，Luna 必须停止并报告。
- 新增或修改的说明文字、检查器输出、报错与注释使用中文；仅代码标识符、JSON 字段、Skill ID、命令、路径、枚举和固定兼容值可保留英文。

## 通过标准与验证

必须运行：

```powershell
git status --short
node skills/shared/scripts/check_skill_registry.cjs
rg -n "调 design-style（preset|调用 movie-style|调用 movie-script-review|调用 movie-character-card|调用 movie-scene-card" skills -g "*.md"
git diff --check
```

通过要求：

- 检查器退出码为 0；
- 恰好注册 13 个 Skill，不存在缺失、多余或 ID 错配；
- 入口路径 B 调用 `movie-create-design-preset`；
- 插件元数据正确说明 11 / 12 / 13 三种口径；
- 禁止的历史调用检索不存在仍需处理的实际调用命中；
- 没有修改任何禁止文件；
- 新增或修改的自然语言内容符合中文要求；
- `git diff --check` 通过。

## 失败与回退条件

出现以下情况时，Luna 必须停止，不得扩大范围：

- 实施需要新增别名或改变任何 Skill 的可调用 ID；
- 无法机械判断历史名称的真实意图；
- 必需修改与意外的用户改动重叠；
- 验证失败且无法仅在授权文件内修复；
- 实施要求改变校验器、Schema、兼容性、迁移策略或发布版本。

失败时，Luna 必须把证据交回 Sol，不得进入阶段 2。

## 后续阶段授权

本 Gate **只授权阶段 1**。阶段 1 通过复审且 Sol 另行冻结并批准 Gate A 的校验语义前，阶段 2 仍未获授权。
