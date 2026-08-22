# ADR-002：版本化分镜契约与兼容性

> 状态：**Gate A 已由 Sol 批准；Gate B 仍为 Proposed。** Gate A 只冻结阶段 2 的校验语义；完整 v2 契约和阶段 3–6 尚未获授权。

## 问题陈述

v1 字段同时服务人读与机器。字符串 `dialogue` 无法表达多说话人或源文 / 表演 / TTS 版本；单一 `mood` 无法表达多角色表演；展示名 ID 会因改名漂移。校验器存在不安全的时长修复与不完整的包裹对象支持。

## v2 规范表示候选

```json
{
  "meta": { "schema_version": "2.0", "aspect_ratio": "9:16", "style_id": "001_cyberpunk", "language": "zh-CN" },
  "duration_seconds": 90,
  "shots": [{
    "shot_id": "S001", "scene_id": "SCN-001", "character_ids": ["CHR-001"], "prop_ids": ["PRP-001"],
    "performances": [{ "character_id": "CHR-001", "emotion": { "type": "震惊", "intensity": "medium", "physical_cues": ["瞳孔放大"], "transition_from_previous": "疑惑升级" } }],
    "dialogues": [{ "speaker_id": "CHR-001", "source_text": "这不可能。", "performance_text": "这……不可能。", "tts_text": "这……不可能。" }]
  }], "coverage": [], "assets": {}
}
```

`source_text` 是源文审计权威，也是唯一与源文比较的字段；`performance_text` 是人读 / 表演版本；`tts_text` 是配音生产版本，缺失时默认取表演文本。三者不可互换。校验器结果必须标为“近似文本一致性检查”，不得声称严格逐字核对。

### 稳定资产候选

`{project_root}/assets.registry.json` 使用不可变的 `CHR-001`、`SCN-001`、`PRP-001` ID。记录含 `id`、`display_name`、可选 `aliases`、`status`（`active` / `retired`）和首次发现来源。ID 永不重编或复用；改名只改展示名，旧名进入别名。建议 scanner 是唯一写入者，所有其他 Skill 与 normalizer 仅可读取；无法确认的合并须停下请求用户确认。

## 容器兼容矩阵 — Gate B 冻结候选

建议：裸文档在根层保留分镜字段；包裹文档由 `storyboard` 拥有 `meta`、`duration_seconds`、`shots`、`coverage`、`assets`，所有包裹层顶层字段均不透明且必须保留。任何实现不得重建 `{ storyboard, assets }` 或其他不完整顶层对象。

| 输入形态 | 顶层字段 | `storyboard` 内字段 | normalizer 读取结果 | `--fix` 写回规则 |
|---|---|---|---|---|
| v1 裸对象 | `duration_seconds`、`shots`、`coverage`、`assets`、旧字段 | 无 | 规范 v2；推断值标记 `source: "legacy_inferred"` | 仅在原裸对象内更新允许的时长字段；保留其他所有字段 |
| v1 包裹对象 | 允许且不透明的未知字段；支持旧式顶层 `assets` | `duration_seconds`、`shots`、`coverage`；`assets` 可在内部或旧式顶层 | 规范 v2；优先 `storyboard.assets`，否则旧式顶层资产；冲突时安全失败，不猜测合并 | 保持原包裹、未知字段、容器与资产所有位置；仅原位更新允许的时长 / 时间段字段；不得移动资产 |
| v2 | 包裹层字段不透明；顶层 `assets` 仅作旧兼容读取 | `meta`、`duration_seconds`、`shots`、`coverage`、`assets` | 规范 v2 | 不改变容器形态、资产所有位置或未知字段；仅原位更新允许的时长字段 |

必需 fixture：含未知顶层对象 / 值及非空资产位置的包裹 v1。`--dry-run` 与 `--fix` 均必须保留该未知字段 / 值，以防实现重建 `{ storyboard, assets }` 写回。

## v1 至 v2 映射候选

| v1 | v2 | 规则 |
|---|---|---|
| `scene` | `scene_id` | 通过只读注册表解析，或保留展示值并标为 legacy-inferred |
| `characters[]` | `character_ids[]` | 同上；双写时保留旧字段 |
| `props[]` | `prop_ids[]` | 同上；双写时保留旧字段 |
| `mood` + 角色 | `performances[]` | 仅在角色可确定时推断；歧义须报告，不能臆造 |
| 字符串 `dialogue` + `speaker` | `dialogues[]` | 生成一个 legacy-inferred 条目；除非获批的旁白 / 改编策略另有规定，初始复制到三个文本字段 |
| 根 v1 `assets` | 注册表引用 | 仅作旧式声明；不得分配或写入稳定 ID |
| 时长、coverage、continuity | 语义不变 | 保留原容器与字段；不批量迁移 |

normalizer 默认仅在内存工作。创建迁移文件必须显式使用已获批的 `--write`；Gate B 后生产端双写，且不批量迁移历史项目。

## Gate A：已冻结的校验语义

Sol 于 2026-08-22 批准以下语义；阶段 2 实现不得自行解释或扩展。

### coverage 与 `intentional_repeat`

- `intentional_repeat` 表示源节拍因明确叙事目的被再次呈现，不是遗漏豁免，也不能掩盖未覆盖节拍。
- 字段名固定为 `reason`，值必须是非空字符串。
- `shot_ids` 必须是非空数组，且每个引用都必须对应存在的 `shot_id`。
- 缺少 `reason`、缺少有效镜头引用或引用不存在均为 `high`，使校验结果为 `FAIL`。
- `covered` 同样必须至少引用一个存在的镜头；`omitted_with_reason` 必须提供非空 `reason`；`nonvisual_context` 可无镜头，但必须提供非空 `reason`。
- 未知 coverage 状态为 `high`，不得静默视为已覆盖。

### 机械时长与安全修复

- `duration_seconds` 必须是有限、正整数；`shots` 必须是非空数组。
- 每个 `duration` 必须是有限、正整数且至少 1 秒；字符串、带单位值、小数、`NaN` 和无穷值均不接受，不得使用 `parseInt` 吞掉畸形输入。
- 1 秒是硬性机械下限。目标时长小于镜头数时必须快速 `FAIL`，报告最低可行总时长且绝不写回。
- 2–5 秒是创作建议；有效时长超出此范围只产生 `medium` 告警，不阻塞机械通过。
- 增加时长时，从第一镜开始循环，每次只增加 1 秒并消耗 1 秒差值。
- 缩短时长时，从第一镜开始循环，只对当前大于 1 秒的镜头减少 1 秒；未发生实际减少时不得消耗差值。目标合法时算法必须有限终止。
- `time_range` 使用非负整数秒表示的 `M:SS-M:SS`；首镜从 `0:00` 开始，相邻镜连续，区间长度等于 `duration`，末镜结束时间等于 `duration_seconds`。
- `--dry-run` 只输出 `fix_plan`，输入文件哈希必须保持不变。
- `--fix` 保留既有命令语义，只在全部输入可安全修复时更新 `duration`、`time_range` 与必要的时长汇总字段，随后重新校验。
- `--backup` 只能与 `--fix` 合用；备份内容必须与修复前输入逐字节一致。
- `--fix` 与 `--dry-run` 互斥；未知参数、缺参或非法组合以非 0 状态退出。
- 写回必须使用同目录临时文件和原子替换；失败时原文件保持不变。不得重建顶层对象，也不得移动、删除或改写未知字段。
- 任何不可安全修复的 `high` 问题都必须在写回前终止。

### 台词近似核对

- 报告名称固定为“近似文本一致性检查”，不得声称逐字比对。
- 比较前对文本执行 Unicode `NFKC` 归一化，并移除空白、标点和符号。
- v1 直接台词使用字符串 `dialogue`；v2 仅允许 `source_text` 参加源文检查，`performance_text` 与 `tts_text` 不参加源文一致性判定。
- 说话人含“旁白”或结构化类型为 `narrator` 时归为旁白；系统提示归为 `system`。旁白或系统文本不得静默跳过。
- 归一化后少于 8 个字符的文本属于短文本：若完整文本能在源文中找到则通过，否则产生 `medium` 的“短文本无法确认”告警，不得产生 `high`。
- 归一化后至少 8 个字符的文本比较开头与结尾各最多 10 个字符的锚点；任一锚点命中即视为近似一致，否则产生 `medium` 告警。
- 旁白未命中时产生独立的 `medium`“旁白无法确认”告警；语义审阅仍由后续审阅环节负责。
- 台词近似检查不裁定 humanizer 后的表演质量，也不能替代人工语义审阅。

## Gate B：完整契约候选

Sol 必须整体批准：本矩阵（含旧式包裹 `assets` 的优先级与冲突失败）；`performances[]`；`dialogues[]` 与文本权威关系；稳定 ID / 展示名 / 别名 / 唯一写入者 / 不复用；映射、推断标记、双写与不批量迁移策略。

## 后续实施验收契约

- 裸 v1、包裹 v1 与规范 v2 均可读取和校验。
- 多角色表演、多句 / 跨镜台词、旁白及未知包裹数据不丢失。
- `--fix` 支持 dry-run、可选备份、原子替换、不可行时长快速失败及未知字段保留。
- 改名不会改变稳定 ID；retired ID 永不复用。
- intentional repeat 不能掩盖未覆盖节拍；时长与近似台词语义符合 Gate A。

## 仍需 Sol 决策

- 批准 / 修订包裹 `assets` 的优先级与冲突失败。
- 决定无法解析的旧展示名是否为“读取告警、v2 生产硬错误”（Terra 建议），或采用其他策略。
- 冻结完整 v2 的包裹形式、多角色 / 多台词细节、跨镜台词结构和资产注册表写入契约。

Gate A 已独立批准。Gate B 仍须在确认资产位置、冲突行为和完整 v2 结构后由 Sol 另行批准。
