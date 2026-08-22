# ADR-001: Skill Naming and Registry

> Status: **Accepted by Sol — 2026-08-22.** Implementation authority is granted only by the corresponding Gate record.

## Context

The plugin has 13 callable Skills but documentation mixes current IDs with historical concept names. The entry’s style route B says preset selection while routing to style extraction. Plugin metadata calls the product a 12-Skill suite, conflating children and public surface.

## Proposed decision

1. A callable Skill ID is valid only when `skills/<id>/`, `SKILL.md` frontmatter `name:`, and a `skills[].id` entry in `skills/shared/skill-registry.json` match exactly.
2. The 13 IDs in the architecture baseline are the full public registry, preserving explicit 11 / 12 / 13 accounting.
3. JSON is the machine authority; a Markdown registry is human explanation only and never validator input.
4. Legacy names may remain only in historical / explanatory prose. The frozen label is `历史概念名（非可调用 Skill）：<old>；当前调用：<movie-create-...>`; when no single replacement exists, list the intent-specific replacements explicitly. Old names must not appear as a call target.
5. `movie-emotional-director` is resolved by intent: timeline generation → `movie-create-drama-emotion`; video performance → `movie-create-out-video-director`; common vocabulary → shared document, not a Skill.

## Proposed style routing

| Route | User intent | Callable Skill | Result |
|---|---|---|---|
| A | Film / episode references, director and screenshots | `movie-create-design-style` | Evidence-based style extraction |
| B | Choose from the 96-style library | `movie-create-design-preset` | Preset selection |
| C | Custom or genre recommendation | No false A/B call | Record the custom direction; route only after user confirmation |

Route C is not a surrogate invocation of A or B. Entry operational text must use full callable IDs.

## Consequences

- A later checker can identify missing, extra, and mismatched Skills mechanically.
- Route B can be corrected without redefining style-Skill behavior.
- Historical searchability remains, without ambiguous dynamic routing.
- Plugin descriptions can accurately distinguish 12 child Skills from 13 public Skills.

## Rejected alternatives

- Callable aliases: defeats static validation and clear user routing.
- Markdown as a second machine registry: creates dual authority and drift.
- Calling 12 children the plugin total: hides ENTRY and contradicts the layout.

## Sol decision

**APPROVED.** The naming authority, 13-Skill inventory, JSON registry authority, style routing, and frozen legacy-label format above are accepted. This decision does not authorize changes outside the Stage 1 Gate scope.
