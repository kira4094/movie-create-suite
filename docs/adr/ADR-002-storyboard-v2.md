# ADR-002：版本化分镜契约与兼容性

> 状态：**Proposed — 仍需 Sol 的两项独立决策。** 本 ADR 仅定义候选与验收要求；不批准 Gate A 或 Gate B，也不得触发生产代码改动。

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

## Gate A：校验语义候选

Sol 必须在阶段 2 前独立批准以下事项：

1. `coverage.intentional_repeat` 表示源节拍因明确叙事目的被再次呈现。它必须引用至少一个存在的 `shot_id`；既不是遗漏豁免，也不能掩盖缺失节拍。建议要求 `reason`（精确字段名待冻结）并校验全部引用。
2. 1 秒是硬性机械时长下限。目标时长 `< 镜头数 × 1` 时须快速失败、报告可行下限且不得写回。空镜头、非正 / 非有限目标、畸形时长和不安全修复也必须不写回即失败。2–5 秒仍为创作建议；除非 Sol 另行规定，超出仅告警。
3. 台词检查为近似检查：归一化空白 / 标点，单独分类旁白与短台词，再比较有限锚点。v2 仅检查 `source_text` 的源文一致性；表演 / TTS 文本属于制作质量审阅输入。

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
- 冻结 `intentional_repeat` 的原因字段和严重度。
- 决定无法解析的旧展示名是否为“读取告警、v2 生产硬错误”（Terra 建议），或采用其他策略。
- 冻结短台词阈值与旁白类别；当前“归一化后少于 8 字及旁白跳过”仅是已记录行为，不是决策。

Terra 建议先独立批准 Gate A，再在确认资产位置与冲突行为后批准 Gate B。本文不批准任何 Gate。
