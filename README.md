# movie-create-suite

AI 漫剧生产管线（Reasonix plugin）—— 从小说到成片的一站式 skill 套件。

## 安装

```bash
reasonix plugin install kira4094/movie-create-suite
```

或本地安装：

```bash
reasonix plugin install E:/Projects/Claude/plugin/movie-create-suite --yes --replace
```

## 管线

```
小说文本
   │
   ▼
novel-scanner ── 全本扫描 → 五类索引（角色/场景/情绪/服装/道具）
   │
   ▼
movie-scene-layout ── 宏观空间蓝图（先骨架后皮肤）
movie-scene-card   ── 场景卡（视觉五段式 + 空镜 + 风格统一）
movie-character-card ── 角色卡（Part1-4：定妆照→多视图→情绪卡→穿戴物）
   │
   ▼
movie-script ── 分镜 JSON（coverage/continuity/assets/hook/ref_anchors）
   │  └── validate_storyboard.cjs（机械校验：时长/资产/台词/覆盖率）
   ▼
movie-script-review ── 导演审阅闭环（审阅-修正-复核直到 PASS，8 轮上限）
   │  └── humanizer 拟人化（可选，去 AI 味）
   ▼
movie-emotion-timeline ── 情绪时间轴（10 情绪映射）
movie-dialogue-table ── 配音台词表（TTS 分轨）
   │
   ▼
无限画布（角色/场景图） + 视频模型（Seedance/H3）
```

## Skill 一览

| Skill | 职责 |
|-------|------|
| novel-scanner | 全本扫描 → 五类索引 |
| movie-scene-layout | 场景宏观空间蓝图 |
| movie-scene-card | 场景卡（视觉五段式） |
| movie-character-card | 角色卡（Part1-4 资产管线） |
| movie-script | 分镜 JSON v2.0 |
| movie-script-review | 导演审阅闭环 |
| movie-emotion-timeline | 情绪时间轴 |
| movie-dialogue-table | 配音台词表 |
| movie-emotional-director | 情绪→生理表现（Seedance 提示词） |
| movie-style | 电影风格提炼 |
| movie-novel-decomposition | 编排入口（薄壳调度器） |

## shared 共享层

```
shared/
├── cinematography-handbook.md   运镜方法库
├── humanizer-zh.md              台词拟人化
├── camera-and-film-spec.md      相机/胶片规格库
├── negative-block.md            共享负面块
├── style-dna.md                 风格 DNA 库（六维）
└── scripts/validate_storyboard.cjs  机械校验器（Node CLI）
```

## 机械校验用法

```bash
node skills/shared/scripts/validate_storyboard.cjs 分镜.json --script 原文.txt [--fix]
```

校验项：结构完整性 / 时长归一化 / assets 反推 / coverage 丢戏 / continuity 边界锁 / 台词核对（去标点比对）。

## 输出目录

```
D:\Projects\TolariaData\MovieCreate\{小说名}\
├── 00-原文/
├── 00-扫描索引.md
├── 01-角色卡/
├── 02-场景卡/
├── 03-分镜.json
├── 03-剧情脚本.md
├── 04-情绪时间轴.md
└── 05-配音台词表.md
```

## 版本

版本由 update-version.cjs 计算（commit 标签：breaking:/feat:/fix:）。
