# Skill 注册表

机器权威是同目录的 `skill-registry.json`；本文件只供人阅读，不作为校验器输入。

本插件公开提供 13 个技能：小说改编主路径使用 11 个子技能；AI 创作路径在其上增加 `movie-create-drama-story`，共 12 个子技能；连同入口 `movie-create-entry`，插件总数为 13。

| 层 | 技能 | 用途 |
|---|---|---|
| ENTRY | `movie-create-entry` | 全流程入口编排 |
| L1 | `movie-create-drama-story` | AI 创作故事 |
| L1 | `movie-create-drama-scanner` | 小说扫描索引 |
| L1 | `movie-create-drama-script` | 生成分镜与剧情脚本 |
| L1 | `movie-create-drama-review` | 分镜审阅闭环 |
| L1 | `movie-create-drama-emotion` | 情绪时间轴 |
| L1 | `movie-create-drama-dialogue` | 配音台词表 |
| L2 | `movie-create-design-style` | 电影参考风格提炼（路径 A） |
| L2 | `movie-create-design-preset` | 96 风格库预设选择（路径 B） |
| L2 | `movie-create-design-scene-layout` | 场景空间蓝图 |
| L2 | `movie-create-design-character` | 角色卡 |
| L2 | `movie-create-design-scene` | 场景卡 |
| OUT | `movie-create-out-video-director` | 视频提示词 |

入口风格路由：A 调用 `movie-create-design-style`；B 调用 `movie-create-design-preset`；C 是自定义/题材推荐，不伪装成 A/B 调用。
