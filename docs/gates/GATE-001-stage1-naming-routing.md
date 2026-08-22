# GATE-001 — Stage 1 Naming, Routing, and Plugin Metadata

> Result: **APPROVED**
>
> Owner: Sol
>
> Approved on: 2026-08-22

## Approved inputs

- Plan: `D:\WindowsOS\Desktop\luna-执行计划-movie-create-suite.md`
- Plan version: `Luna 执行计划 V2`
- Plan SHA-256: `BE2CBEBB591350BAC0A83432844AE3DCAF23010FB75B78968CEE43ADD834C0C9`
- Repository baseline HEAD: `1b7402253aa5d25d5e5c32558eca942db7b4ad6d`
- Architecture baseline: `docs/architecture-baseline.md`
- Frozen decision: `docs/adr/ADR-001-skill-naming-and-registry.md`

## Decision approved

- The public registry contains exactly 13 callable Skills.
- Directory name, SKILL.md frontmatter `name`, and registry `id` must match exactly.
- `skills/shared/skill-registry.json` is the sole machine authority; the Markdown registry is explanatory only.
- Style route A calls `movie-create-design-style`.
- Style route B calls `movie-create-design-preset`.
- Style route C is custom or genre recommendation and must not masquerade as an A/B invocation.
- Historical names may remain only with the frozen explicit non-callable label from ADR-001.
- Plugin metadata distinguishes 12 child Skills from 13 public Skills and does not change the release version in this stage.

## Authorized implementation scope

Luna may create or modify only:

- `skills/shared/skill-registry.json`
- `skills/shared/skill-registry.md`
- `skills/shared/scripts/check_skill_registry.cjs`
- `skills/movie-create-entry/SKILL.md`
- `.claude-plugin/plugin.json`
- Existing Skill Markdown files only where a historical name is currently used as an actual invocation target and must be replaced or explicitly labelled under ADR-001.

Luna must not modify:

- `skills/shared/风格定义库/**`
- `skills/shared/scripts/validate_storyboard.cjs`
- Storyboard fields, schemas, fixtures, validators, CLI behavior, compatibility semantics, or migration policy
- `version.json`, release versions, `PROJECT_LOG.md`, or `PROGRESS.md`
- `docs/architecture-baseline.md`, `docs/adr/**`, `docs/gates/**`, the desktop plan, or AGENTS.md

## Required implementation behavior

- Registry entries must cover all and only the 13 existing Skills.
- `depends_on` may contain only paths that exist during Stage 1.
- Future contract or schema paths belong in `planned_dependencies` until created.
- The checker must report missing, extra, and mismatched entries clearly and exit nonzero on failure.
- The checker must verify directory/frontmatter/registry equality and correct style A/B routing.
- Any backticked `movie-create-*` explicitly presented as a call target must exist in the registry.
- No third-party dependency or network installation is allowed.
- Existing user changes must be preserved; overlapping changes require Luna to stop and report.

## Pass criteria and validation

Run all of:

```powershell
git status --short
node skills/shared/scripts/check_skill_registry.cjs
rg -n "调 design-style（preset|调用 movie-style|调用 movie-script-review|调用 movie-character-card|调用 movie-scene-card" skills -g "*.md"
git diff --check
```

Pass requires:

- checker exit code 0;
- exactly 13 registered Skills, with no missing, extra, or mismatched ID;
- entry route B calls `movie-create-design-preset`;
- plugin metadata has the correct 11 / 12 / 13 accounting;
- the prohibited historical invocation search has no actionable invocation hits;
- no prohibited file is modified;
- `git diff --check` passes.

## Failure and rollback conditions

Luna must stop without broadening scope if:

- implementation requires a new alias or changes any Skill's callable ID;
- historical-name intent cannot be resolved mechanically;
- a required edit overlaps an unexpected user modification;
- any validation fails and cannot be fixed within the authorized files;
- implementation would require validator, schema, compatibility, migration, or release-version changes.

On failure, Luna returns evidence to Sol. Do not proceed to Stage 2.

## Next-stage authorization

This Gate authorizes **Stage 1 only**. Stage 2 remains unauthorized until Stage 1 passes review and Sol separately freezes and approves Gate A validator semantics.
