# GATE-003：Q0 前台词与风格契约纠偏

> 结果：**APPROVED（已批准）**
>
> 所有者：Sol
>
> 批准日期：2026-08-22

## 决策目标

在进入 Q0 黄金样例前，消除会污染真实质量评测的两项跨 Skill 矛盾：

1. 小说忠实与台词口语化被错误写成“最终台词必须与原文逐字一致”；
2. 分镜声明写入风格，但正式规范未定义视频导演可稳定读取的字段。

本 Gate 只修正 Prompt 契约，不建立完整 v2、normalizer、稳定资产 ID、资产注册表、`project.json`、迁移流程或新的运行时框架。

## 冻结决策 A：`dialogue` 是最终可表演台词

- v1 的 `shots[].dialogue` 表示已经完成必要口语化、可直接供表演、TTS、字幕和视频提示词使用的最终台词。
- Humanizer 在台词进入分镜前执行一次检查；台词自然时原样保留，存在明显 AI 味或朗读腔时才做有限口语化。
- 写入分镜后 `dialogue` 冻结。审阅、配音和视频导演只能继承，不得再次改写或重复口语化。
- “忠实原文”定义为保留：说话人、人物关系、事实、因果、专名、数字、关键线索、承诺或否认、反转含义、情绪方向与表达意图。
- 允许调整：句式、语气词、停顿、长句拆分、书面词替换、符合人设的口癖，以及不改变剧情信息的压缩。
- 新增事实、删除关键线索、改变人物关系或因果、换说话人、改变反转含义为 `high`；语气或人设偏移、口语化过度为 `medium`。
- 机械校验继续只提供“近似文本一致性检查”，不得声称逐字核对。
- 本阶段不新增 `source_text / performance_text / tts_text` 三文本结构。若 Q0 证明逐句审计确有必要，再单独决策最小双文本或三文本方案。

## 冻结决策 B：使用扁平 `storyboard.meta` 风格契约

正式 v1 分镜使用：

```json
{
  "storyboard": {
    "meta": {
      "style_source": "00-风格定调.md",
      "style_id": "001_cyberpunk",
      "style_name": "Cyberpunk"
    }
  }
}
```

- `style_source`：完整风格内容的权威来源；默认是项目内 `00-风格定调.md`。
- `style_id`：96 风格库的规范文件键，例如 `001_cyberpunk`；仅预设或已匹配库内风格时填写。
- `style_name`：供用户阅读和交付展示的名称，不作为模糊查找的唯一依据。
- 预设风格：三个字段均填写。
- 电影提炼或自定义风格：`style_source` 与 `style_name` 填写，`style_id` 为 `null`。
- 用户明确跳过风格：三个字段均为 `null`。
- 视频导演读取优先级：先读取 `style_source` 的完整定调，再用 `style_id` 精确补充单个风格定义，`style_name` 仅展示。
- 已选择风格但权威文件缺失时必须报告并停下或请求用户处理，不得静默使用默认风格。
- 三个字段全为 `null` 表示用户明确跳过；不得与意外缺字段混淆。

选择扁平字段而非 `meta.style` 对象，是为了维持 v1 的最小兼容面，避免为三个路由值新增嵌套解析与迁移语义。

## Luna 文件所有权

Luna 只可修改以下文件：

- `skills/movie-create-entry/SKILL.md`
- `skills/movie-create-drama-script/SKILL.md`
- `skills/movie-create-drama-script/references/script-spec.md`
- `skills/movie-create-drama-review/SKILL.md`
- `skills/movie-create-drama-dialogue/SKILL.md`
- `skills/movie-create-out-video-director/SKILL.md`
- `skills/shared/humanizer-zh.md`

不得修改校验器、fixtures、测试、ADR、注册表、风格定义库、插件元数据或发布版本。

## 实施要求

- 删除分镜审阅通过后的第二次 humanizer 步骤，并保持后续步骤编号连续。
- 将所有“最终 `dialogue` 与小说原文逐字一致”的要求改为本 Gate 的受保护信息与语义忠实规则。
- 对“逐字保留”的合法用法保留：下游必须逐字继承已经冻结的最终 `dialogue`；画面内可见文字仍按其现有规则逐字输出。
- 配音和视频导演明确消费最终 `dialogue`，不得重新口语化、翻译或改写。
- 在正式分镜 JSON 示例、字段说明、生成流程和视频导演读取流程中统一三个风格字段。
- 入口编排必须把 humanizer 放在分镜冻结前，并说明审阅后不再修改台词。
- 所有新增或修改的自然语言使用中文；代码字段、枚举、命令和路径可保留英文。
- 不复制大段重复规则；详细契约以 `script-spec.md` 为权威，其他 Skill 保留足够的执行摘要和链接。

## 验收标准

必须通过：

```powershell
node skills/shared/scripts/check_skill_registry.cjs
node tests/storyboard/test_validate_storyboard.cjs
git diff --check
```

并满足：

- 目标文件中不存在“审阅通过后再次 humanizer”或“最终台词必须与小说逐字一致”的冲突指令；
- `dialogue` 的最终可表演文本、单次处理、冻结和下游继承口径一致；
- `style_source`、`style_id`、`style_name` 同时出现在正式 JSON 示例和生产/消费说明中；
- H3/Seedance 仍保持映射声明使用人读别名、正文使用模型参考标签；
- 变更严格限制在批准文件；
- 不增加任何新运行时代码、fixture 或测试目录。

## 回退与停止条件

若实施需要新增三文本字段、改变校验器严重度、修改 v2 ADR、引入项目配置或迁移历史分镜，Luna 必须停止并交回 Sol。若发现用户同时修改批准文件，也必须停止，不得覆盖。

## 后续阶段

本 Gate 完成后只允许进入 Q0 黄金样例人工评测，不授权其他工程化阶段。
