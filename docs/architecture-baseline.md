# Architecture Baseline — movie-create-suite

> Status: Terra fact baseline and decision input only. This document does not approve a Gate or authorize implementation.
>
> Observed at HEAD `1b7402253aa5d25d5e5c32558eca942db7b4ad6d` on 2026-08-22.

## Scope and evidence

This is a read-only baseline for the Stage 0 review package. Facts below were collected from the repository at the observed HEAD; proposed future contracts are isolated in ADR-001 and ADR-002.

## Skill inventory and flow accounting

There are **13 callable plugin Skills**. For every entry below, its directory name equals the `name` in SKILL.md frontmatter.

| Layer | Directory / callable name | Role | Entry relationship |
|---|---|---|---|
| ENTRY | `movie-create-entry` | Thin novel-adaptation orchestrator | Public entry; coordinates art, script, and OUT layers |
| L1 | `movie-create-drama-story` | Original short-drama story generation | Used before the adaptation flow only for AI-creation path |
| L1 | `movie-create-drama-scanner` | Whole-novel scan and indexes | Adaptation precondition / upstream data source |
| L1 | `movie-create-drama-script` | Storyboard JSON and Markdown script | Produces the central `03-分镜.json` |
| L1 | `movie-create-drama-review` | Director review loop | Consumes storyboard JSON |
| L1 | `movie-create-drama-emotion` | Emotion timeline | Consumes storyboard `mood` / coverage or scanner data |
| L1 | `movie-create-drama-dialogue` | TTS dialogue table | Consumes storyboard `dialogue` or Markdown fallback |
| L2 | `movie-create-design-style` | Film-reference style extraction | Style route A |
| L2 | `movie-create-design-preset` | 96-style preset selector | Style route B |
| L2 | `movie-create-design-scene-layout` | Macro spatial blueprint | Before scene-card texture/detail work |
| L2 | `movie-create-design-character` | Character cards | Reads confirmed style direction |
| L2 | `movie-create-design-scene` | Scene cards | Reads confirmed style direction / layout |
| OUT | `movie-create-out-video-director` | Model-specific video prompts | Consumes storyboard and other supported source forms |

| Scope | Count | Rationale |
|---|---:|---|
| Novel-adaptation path child Skills | 11 | Scanner, script, review, emotion, dialogue; five L2 design Skills; OUT. Excludes ENTRY and AI-only `drama-story`. |
| AI-creation path child Skills | 12 | The above 11 plus `movie-create-drama-story`. |
| Plugin public total | 13 | Twelve child Skills plus `movie-create-entry`. |

The existing `.claude-plugin/plugin.json` description says “12 个 skill”; that is stale relative to the 13-Skill public total.

## Historical names: occurrence and classification

Historical names must not be treated as callable IDs. Current occurrences fall into these classes:

| Historical concept | Current locations / meaning | Required future classification |
|---|---|---|
| `movie-style` | Entry style A, style templates, design-style / preset / character / scene instructions | Historical concept for film-reference style extraction; callable replacement `movie-create-design-style` |
| `movie-scene-layout` | Scene-layout instructional flow | Historical concept; callable replacement `movie-create-design-scene-layout` |
| `movie-character-card` | Scanner and script references to role-card outputs | Historical concept; callable replacement `movie-create-design-character` |
| `movie-scene-card` | Scanner, script, layout and character references to scene-card outputs | Historical concept; callable replacement `movie-create-design-scene` |
| `movie-script` | Scanner and dialogue references | Historical concept; callable replacement `movie-create-drama-script` |
| `movie-script-review` | Existing historical review label where present | Historical concept; callable replacement `movie-create-drama-review` |
| `movie-emotion-timeline` / `movie-dialogue-table` | Scanner references | Historical concepts; replacements `movie-create-drama-emotion` / `movie-create-drama-dialogue` |
| `movie-emotional-director` | Character and script emotion vocabulary; video-related descriptions | Ambiguous legacy concept: emotion timeline means `movie-create-drama-emotion`; video performance means `movie-create-out-video-director`; a shared emotion lexicon remains a document, not a Skill |

The entry currently has a functional routing defect: route B is described as preset selection but the route table says `调 design-style`; route B must eventually call `movie-create-design-preset`. This Stage 0 package records the issue only.

## Existing project outputs and path conventions

Several Skills hard-code the personal-root pattern `D:\Projects\TolariaData\MovieCreate\{小说名}\...`; this is not portable and is a baseline issue, not a Stage 0 change.

| Producer / consumer | Existing output or input convention |
|---|---|
| scanner | Project root with `00-扫描索引.md` and scan-derived asset/index material |
| style direction | `{project}/00-风格定调.md` |
| design-character | `...\01-角色卡\{角色名}.md` |
| design-scene-layout | `...\02-场景卡\{场景名}-布局.md` |
| design-scene | `...\02-场景卡\{场景名}.md` |
| drama-script | `...\03-剧情脚本.md` and `...\03-分镜.json` |
| drama-emotion | `...\04-情绪时间轴.md` |
| drama-dialogue | `...\05-配音台词表.md` |
| out-video-director | `06-视频提示词.txt` in the entry flow |

## Existing aspect-ratio defaults

No single project configuration is authoritative today. Defaults and asset-specific formats are distributed:

| Area | Existing convention |
|---|---|
| Project / scene-card default | 9:16 vertical 2K; design-scene permits 16:9 when the user explicitly asks for horizontal |
| Character main portrait / costume | 9:16 vertical 2K; character Skill says horizontal projects use 16:9 |
| Character multi-view and emotion card | 16:9 horizontal 2K |
| Character wearables | 4:3, 2K |
| Scene-card specification | Contradiction: prose says default 9:16, while template and a later rule specify 4:3 horizontal 2K |
| Film style trial images | Fixed 16:9 2K |
| Film style identity / multi-view assets | Fixed 3:4 2K |
| Storyboard image / video prompt | Placeholder `{画幅}` / final-video specification; not centralized |

## Existing storyboard data shape

`movie-create-drama-script/references/script-spec.md` documents a **v1 bare object** with root `duration_seconds`, `coverage`, `shots`, and `assets`.

| Object | Existing fields |
|---|---|
| root | `duration_seconds`, `coverage`, `shots`, `assets` |
| coverage item | `beat`, `source_text`, `shot_ids`, `status` (`covered`, `intentional_repeat`, `omitted_with_reason`, `nonvisual_context`) |
| shot | `shot_id`, `time_range`, `duration`, `scene`, `characters`, `props`, `purpose`, `camera`, `action`, `dialogue`, `speaker`, `mood`, `hook`, `ref_anchors`, `continuity`, and optional screen-direction fields |
| continuity | `start` / `end`; each can contain `position`, `posture`, `gaze`, `props` |
| assets | `characters`, `scenes`, `props`; current IDs are display names and entries carry `id`, `description`, `shots` |

The validator also recognizes a wrapped input by selecting `data.storyboard` as its read root. Its current write-back recreates `{ storyboard: root, assets: data.assets }`, which drops all other unknown wrapper-level fields.

## Current validator CLI, behavior, and risks

### CLI as implemented

```text
node skills/shared/scripts/validate_storyboard.cjs <分镜.json> [--script <原文.txt>] [--fix]
```

It parses only `--script`, `--fix`, and a positional file. It prints JSON `{ verdict, issues, summary }`, returns 0 only without high-severity issues, and returns 2 when no file is supplied. `--dry-run` and `--backup` do not exist yet.

### Checks as implemented

- Requires `shot_id`, `time_range`, `duration`, `scene`, `purpose`, `continuity`, `hook`, and `ref_anchors`; checks continuity start/end presence.
- Compares `Math.max(1, parseInt(duration) || 0)` sum to truthy `duration_seconds`; reports discontinuous time ranges.
- Derives `characters`, `scene`, `props` use and compares root `assets`.
- Treats empty coverage as high except `omitted_with_reason` and `nonvisual_context`; `intentional_repeat` has no complete semantics.
- Checks adjacent `position`, `posture`, and `props` continuity.
- With `--script`, skips narrators and normalized dialogue below eight characters, then accepts a first or last ten-character anchor in source text. This is approximate, despite the header’s literal-comparison claim.
- `--fix` changes durations / `time_range` and directly overwrites the input if normalization happened.

### Known risks

- Target duration below shot count can make `--fix` non-convergent because it decrements its difference even while every shot remains clamped at one second.
- Empty shots can cause modulo-by-zero behavior / non-convergence.
- `parseInt` accepts malformed durations; nonpositive or nonfinite targets are not explicitly rejected.
- Direct overwrite is not atomic and has no backup.
- Wrapper write-back drops unknown top-level fields.
- `intentional_repeat` and dialogue wording overstate unsupported semantics.

## Version and Git state

| Item | Observed state |
|---|---|
| Git HEAD | `1b7402253aa5d25d5e5c32558eca942db7b4ad6d` |
| Start worktree status | Clean (`git status --short` produced no paths) |
| `.claude-plugin/plugin.json` | Version `v0.28.0(20260817.1420)` and stale “12 个 skill” description |
| `version.json` | `0.28.0`, build `20260817.1420`, SHA `58c46ef0a933e7097a8064ddb26bfe7597ab1f40` — not current HEAD |

## Minimal anonymous fixture contract for a later implementation

Stage 0 creates no fixtures. After approval, `tests/baseline/` (or the approved fixtures location) should contain only synthetic data: valid bare v1; duration mismatch / impossible duration / empty shots / invalid duration / mixed-minimum duration; intentional-repeat; a wrapped v1 with unknown top-level data; v2 canonical, multi-performer, multi-dialogue, cross-shot-dialogue; and asset-registry add / rename / retired / no-reuse cases. No user project or novel asset may be copied.
