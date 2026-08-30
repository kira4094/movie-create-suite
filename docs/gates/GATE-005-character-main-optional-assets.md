# GATE-005：角色主卡与按需独立资产契约

> 结果：**APPROVED**
>
> 决策所有者：Sol；批准日期：2026-08-30；用户已明确同意将原角色卡 Part 3、Part 4 降级为按需独立提示词。

## 决策

1. `01-角色提示词/{角色名}.md` 是默认角色主卡，固定且仅包含 Part 1 全身定妆照与 Part 2 多视图，顺序为 Part1→Part2；任何执行档位都不得改变该结构。
2. 原 Part 3 能力改为独立的 `01-角色提示词/{角色名}-表演参考图.md`。只有用户明确提出时生成；文件不使用 Part 3 编号，固定为 16:9 横版、2K、2行×3列六格。
3. 原 Part 4 能力改为独立的 `01-角色提示词/{角色名}-穿戴物细节图.md`。只有用户明确提出时生成；文件不使用 Part 4 编号，固定为 4:3 横版、2K，并按物件数量决定网格与分页。
4. 两类可选资产仍属于角色块和 `01-角色提示词/`，不新增第五个顶层交付块，也不得混入角色主卡。
5. Part 1 仍是角色视觉事实源。Part 2、表演参考图和穿戴物细节图只能受控继承，不得重新设计角色。
6. 表演参考图只校准同一角色的面部身份与可复用表演范围，不承担剧情逐镜情绪权威。03 的静态表情与 04 的动态表演均以 `.movie-create/storyboard.json` 的 `mood/action` 为权威来源。
7. GATE-004 中 Part 2 的 3:4 竖版六格强布局继续有效；本 Gate 不得削弱其上下排角度、锁骨至鞋履边界和失败降级约束。

## 授权实施范围

- `skills/movie-create-design-character/**`
- `skills/movie-create-entry/SKILL.md`
- `skills/shared/shot-size-library.md`
- `skills/shared/scripts/validate_character_card.cjs`
- `skills/shared/scripts/validate_prompt_payload.cjs`（仅支持无 Part 编号的可选角色资产）
- `tests/cards/**`
- `tests/integration/test_four_blocks_contract.cjs`
- `tests/integration/fixtures/**`
- `docs/architecture-baseline.md`
- `docs/gates/GATE-004-character-v3-storyboard-image.md`（仅增加被取代提示）
- 本 Gate 文件

禁止修改 03/04 的事实源、输出名称或四块顶层交付边界；禁止更新版本号、发布或迁移用户项目。

## 验收标准

- 默认角色校验无论是否传入旧序列，都只接受 Part1→Part2；`1,3` 与 `1,2,3,4` 必须失败。
- 表演参考图和穿戴物细节图必须使用各自显式校验模式，严格检查字段顺序、唯一性、额外字段、固定规格与网格/分页。
- 两类可选文件的文件名和标题不得使用 Part 3/Part 4 编号；正文允许合法引用 Part 1 作为参考图来源。
- 入口、角色 Skill、角色规范、语汇库、景别库、架构文档和集成测试不得保留旧强制四 Part、快速 Part1→Part3 或豁免矩阵。
- Part 2 的 3:4 竖版、2行×3列、上排头颈三角度、下排锁骨至鞋履三角度和三条失败降级路径必须继续通过回归测试。
- 03/04 的逐镜情绪继续来自 storyboard `mood/action`。

## 必需检查

```powershell
node tests/cards/test_validate_character_card.cjs
node tests/integration/test_four_blocks_contract.cjs
node tests/shared/test_validate_prompt_payload.cjs
git diff --check
```

## 文件所有权与阶段

- 本 Gate、旧 Gate 被取代声明与最终验收：Sol。
- 实现文件与测试：Luna。
- 实施后复审：Terra，只读。

## 回滚与停止条件

- 若角色主卡再次要求或接受 Part 3/Part 4，回滚并停止。
- 若可选资产必须新增顶层交付块，停止并返回 Sol。
- 若实现削弱 Part 2 强布局，或让 03/04 改为依赖表演参考图，回滚并停止。
