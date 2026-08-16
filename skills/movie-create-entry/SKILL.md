---
name: movie-create-entry
description: |
  [ENTRY] 小说影视化拆解编排入口：接收完整小说文本，按两层架构编排 11 个独立 skill 完成全流程——剧本层 L1（scanner→script→review→emotion→dialogue）→ 美术层 L2（design-style/scene-layout/scene/character）→ 出口 OUT（out-video-director 分镜 JSON→视频提示词）。
  分镜 JSON 是全管线中枢：剧本层产出 → 审阅/情绪/配音/视频提示词全部消费它。
  本 skill 是薄壳编排器，不含具体生成规则（各生成规则在对应独立 skill 中）；也可单点调用任意独立 skill。
  当用户提到「小说改编」「AI漫剧」「全流程拆解」「拆整本小说」「小说转漫剧」且需要走完整管线时使用。
  当用户提供小说文本，要求产出全部影视化资产（分镜+角色卡+场景卡+情绪+配音+视频提示词）时使用。
---

# 小说影视化拆解编排入口 v2.0

## 角色定位
你是小说影视化管线编排器：接收小说文本，按两层架构编排 11 个独立 skill 完成全流程产出。你**不直接生成任何卡片/剧本**——具体生成规则与质量清单在各自 skill 中，你只负责任务调度、顺序保证、暂停点控制。

## 两层架构

```
┌─────────────────────────────────────────────────┐
│ 入口：风格定调（必选，三选一 → 96 风格库统一落点）  │
│   路径A：movie-style 提炼（电影参考图 → 分析 →     │
│          匹配 96 库最接近风格深化）               │
│   路径B：96 风格库直接选一（style-index 查表）     │
│   路径C：题材自动匹配推荐（用户给题材 → 推荐风格）  │
│   ★ 产出：00-风格定调.md（全链继承）              │
└─────────────────────────────────────────────────┘
              ↓ 继承风格定调（不重新选）
┌─────────────────────────────────────────────────┐
│ 第一层：文字处理层（剧本解析 + 分镜设计）[L1]       │
│   novel-scanner → drama-script → drama-review     │
│   → drama-emotion → drama-dialogue               │
│   ★ 产出分镜 JSON（中枢，含 style 字段继承定调）    │
└─────────────────────────────────────────────────┘
              ↓ 继承风格定调（不重新选）
┌─────────────────────────────────────────────────┐
│ 第二层：美术风格层（视觉设计）[L2]                 │
│   design-style / design-scene-layout /           │
│   design-scene / design-character                │
│   （读 00-风格定调.md + shared/风格定义库/12段）   │
│   ★ 产出：图像提示词（角色卡/场景卡）              │
└─────────────────────────────────────────────────┘
              ↓ 全部产出 = 文字提示词
┌─────────────────────────────────────────────────┐
│ 出口：out-video-director（分镜 JSON → 视频提示词）  │
│ → 跳转 MiniMax Hub / Seedance 生成                 │
└─────────────────────────────────────────────────┘
```

## 管线架构（完整）

```
小说文本
   │
   ▼
movie-create-drama-scanner ── 全本扫描 → 00-扫描索引.md（角色/场景/情绪拐点/服装节点/道具清单）
   │                    🛑 暂停点①：用户确认清单
   ▼
movie-create-design-scene-layout ── 宏观空间蓝图 → 02-场景卡/{场景名}-布局.md（空间骨架先确认）
movie-create-design-character × N 角色 → 01-角色卡/{角色名}.md
movie-create-design-scene     × N 场景 → 02-场景卡/{场景名}.md（继承布局蓝图 + 五段式）
   │                    🛑 暂停点②：用户确认角色/场景卡（含 HEX 备选拍板）
   ▼
movie-create-drama-script          → 03-分镜.json（coverage/continuity/assets/hook/ref_anchors）
   │                                 + 03-剧情脚本.md（markdown 渲染）
   │  └── validate_storyboard.cjs（机械校验：时长/资产/台词/覆盖率）
   ▼
movie-create-drama-review          → 审阅-修正-复核闭环直到 PASS
   │  └── humanizer 拟人化（可选）
   ▼
movie-create-drama-emotion         → 04-情绪时间轴.md（从分镜 JSON 的 mood 汇总）
movie-create-drama-dialogue        → 05-配音台词表.md（从分镜 JSON 抽台词）
   │                    🛑 暂停点③：交付全部资产
   ▼
movie-create-out-video-director    → 06-视频提示词.txt（分镜 JSON → 逐镜六段式）
   │  → 跳转 MiniMax Hub / Seedance
```

## 输出目录

```
D:\Projects\TolariaData\MovieCreate\{小说名}/
├── README.md              ← 拆解概览（本编排器写）
├── 00-原文/               ← 小说原文
├── 00-扫描索引.md          ← drama-scanner 产出
├── 01-角色卡/             ← design-character 产出
├── 02-场景卡/             ← design-scene / scene-layout 产出
├── 03-分镜.json           ← drama-script 产出（中枢）
├── 03-剧情脚本.md          ← drama-script 渲染版
├── 04-情绪时间轴.md        ← drama-emotion 产出
├── 05-配音台词表.md        ← drama-dialogue 产出
└── 06-视频提示词.txt        ← out-video-director 产出
```

> 若用户指定子目录（如 Realtest/），项目建在 `{根}/{子目录}/{小说名}/`。

## 调度规则

1. **顺序强制**：scanner 先行（一致性基础）→ 角色/场景卡并行（互不依赖）→ script（分镜 JSON）→ review（审阅 PASS）→ emotion/dialogue（吃分镜 JSON）→ out-video-director（吃分镜 JSON 出视频提示词）
2. **暂停点铁律**：① scanner 输出后暂停等用户确认清单；② 角色/场景卡产出后暂停等 HEX/默认值拍板；③ 剧本层交付后暂停，用户确认后再进美术层和出口
3. **单点调用**：用户只要某类资产 → 直接引导到对应独立 skill，不强制走全流程
4. **范围标注**：README 记录输入范围（全本/章节），一致性仅限该范围

## 独立 skill 索引（按层）

| 层 | Skill | 产出 | 触发 |
|----|-------|------|------|
| L1 | movie-create-drama-scanner | 00-扫描索引.md | 全本扫描/清单盘点 |
| L1 | movie-create-drama-script | 03-分镜.json + 03-剧情脚本.md | 分镜/剧本 |
| L1 | movie-create-drama-review | 审阅报告（PASS/FAIL） | 审阅分镜 |
| L1 | movie-create-drama-emotion | 04-情绪时间轴.md | 情绪分析 |
| L1 | movie-create-drama-dialogue | 05-配音台词表.md | 配音/TTS |
| L2 | movie-create-design-style | 风格指南（可选前置） | 电影风格提炼 |
| L2 | movie-create-design-scene-layout | 02-场景卡/{场景}-布局.md | 场景布局/空间蓝图 |
| L2 | movie-create-design-scene | 02-场景卡/ | 场景卡/场景提示词 |
| L2 | movie-create-design-character | 01-角色卡/ | 角色卡/角色提示词 |
| OUT | movie-create-out-video-director | 06-视频提示词.txt | 分镜→视频提示词 |
| — | shared/（共享层） | style-dna/负面块/运镜库/机械校验脚本 | 所有 skill 引用 |

## 用户输入处理指令（激活后执行）

1. **确认输入**：小说文本范围（全本/章节）、目标平台（竖屏/横屏）
2. **声明管线**：告知将走两层架构 + 3 个暂停点，或按用户需求单点调用
3. **执行调度**：按「调度规则」顺序执行，遵守暂停点
4. **交付**：README 概览 + 全部资产 + 质量清单自查结果（各 skill 自查）
