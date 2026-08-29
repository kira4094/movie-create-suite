# Skill 注册表

机器权威是同目录的 `skill-registry.json`；本文件只供人阅读，不作为校验器输入。

本插件公开提供 13 个技能：小说改编主路径使用 11 个子技能；AI 创作路径在其上增加 `movie-create-drama-story`，共 12 个子技能；连同入口 `movie-create-entry`，插件总数为 13。

| 层 | 技能 | 用途 |
|---|---|---|
| ENTRY | `movie-create-entry` | 编排四块交付；内部态统一放 `.movie-create/` |
| L1 | `movie-create-drama-story` | 生成 `.movie-create/source/story.md`，服务后续四块 |
| L1 | `movie-create-drama-scanner` | 生成 `.movie-create/scan-index.md`，服务角色/场景/分镜 |
| L1 | `movie-create-drama-script` | 唯一生成 `.movie-create/storyboard.json` 与 `03-分镜脚本图提示词.md`（旧名只读兼容） |
| L1 | `movie-create-drama-review` | 审阅内部 storyboard，结果写 `.movie-create/review.md` |
| L1 | `movie-create-drama-emotion` | 内存情绪接口，注入角色峰值、分镜 mood/action/purpose 与视频反应 |
| L1 | `movie-create-drama-dialogue` | 冻结前建议、冻结后逐镜 voice directives，注入视频块 |
| L2 | `movie-create-design-style` | 生成 `.movie-create/style-guide.md`，服务角色/场景/分镜/视频 |
| L2 | `movie-create-design-preset` | 选择预设并写入内部风格指南，服务四块 |
| L2 | `movie-create-design-scene-layout` | 生成 `.movie-create/scene-layout/`，由场景块吸收 |
| L2 | `movie-create-design-character` | 生成用户交付 `01-角色提示词/` |
| L2 | `movie-create-design-scene` | 生成用户交付 `02-场景提示词/` |
| OUT | `movie-create-out-video-director` | 消费冻结分镜/情绪/对白，生成用户交付 `04-视频提示词.md` |

入口风格路由唯一为 A/B/C/D：A=电影截图/证据提炼，仅调用 `movie-create-design-style`；B=96 预设，仅调用 `movie-create-design-preset`；C=明确跳过风格，不调用两者；D=自定义或题材推荐。D 自定义使用用户正向规则/style-dna；D 题材推荐在直接模式选可追溯的最匹配 96 预设并标记默认、协作模式推荐 1–3 项，实际落到 96 预设时才调用 `movie-create-design-preset`。入口路线 D 与解析后的来源 B（预设）/D（自定义）/C（无风格）分开记录，避免混淆。
