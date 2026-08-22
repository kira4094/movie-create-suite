# ADR-002: Versioned Storyboard Contract and Compatibility

> Status: **Proposed — two independent Sol decisions required.** This ADR defines candidates and acceptance requirements only; it does not approve Gate A or Gate B and must not trigger production-code changes.

## Problem statement

v1 fields serve human readers and machines together. String `dialogue` cannot represent several speakers or source/performance/TTS variants; one `mood` cannot express multiple performers; display-name IDs drift on rename. The validator has unsafe duration repair and partial wrapper support.

## Candidate v2 canonical model

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

`source_text` is source-audit authority and the only field compared to source. `performance_text` is the human/acting rendition; `tts_text` is the spoken-production rendition and defaults to performance text if unspecified. They are not interchangeable. Any validator result must be labelled “近似文本一致性检查”, never literal word-for-word verification.

### Candidate stable assets

`{project_root}/assets.registry.json` uses immutable `CHR-001`, `SCN-001`, `PRP-001` IDs. Records have `id`, `display_name`, optional `aliases`, `status` (`active` / `retired`), and first-discovery source. IDs never renumber or reuse; rename changes display name and retains the old name as an alias. Scanner is proposed as sole writer; all other Skills and the normalizer only read it. Uncertain merges stop for user confirmation.

## Container compatibility matrix — candidate to freeze at Gate B

Recommendation: bare documents keep storyboard fields at root. Wrapped documents make `storyboard` own `meta`, `duration_seconds`, `shots`, `coverage`, and `assets`; all wrapper top-level fields are opaque and preserved. No implementation may rebuild `{ storyboard, assets }` or a partial top-level object.

| Input form | Top-level fields | `storyboard` fields | Normalizer read result | `--fix` write-back rule |
|---|---|---|---|---|
| v1 bare object | `duration_seconds`, `shots`, `coverage`, `assets`, legacy fields | None | Canonical v2; inferred values tagged `source: "legacy_inferred"` | Update only permitted duration fields in the original bare object; keep every other field |
| v1 wrapped object | Unknown fields allowed and opaque; legacy top-level `assets` supported | `duration_seconds`, `shots`, `coverage`; `assets` may be inside or legacy top-level | Canonical v2; prefer `storyboard.assets`, else legacy top-level assets; conflict fails safely rather than guessed merge | Preserve exact wrapper, unknown fields, container and asset owner; update only permitted duration / time-range fields in place; never move assets |
| v2 | Wrapper fields opaque; top-level `assets` is legacy-readable only | `meta`, `duration_seconds`, `shots`, `coverage`, `assets` | Canonical v2 | Do not change container shape, asset owner, or unknown fields; update allowed duration fields in place |

Required fixture: wrapped v1 with an unknown top-level object/value and nonempty assets placement. Both `--dry-run` and `--fix` must preserve the unknown field/value; this prevents a reconstructed `{ storyboard, assets }` write-back.

## Candidate v1-to-v2 mapping

| v1 | v2 | Rule |
|---|---|---|
| `scene` | `scene_id` | Resolve via read-only registry or preserve display value marked legacy-inferred |
| `characters[]` | `character_ids[]` | Same; dual write retains legacy field |
| `props[]` | `prop_ids[]` | Same; dual write retains legacy field |
| `mood` + actor | `performances[]` | Infer only when an actor is determinable; ambiguity is reported, never invented |
| string `dialogue` + `speaker` | `dialogues[]` | One legacy-inferred entry; initially copy to all three text fields unless approved narrator/adaptation policy differs |
| root v1 `assets` | registry references | Legacy declaration only; never allocates or writes stable IDs |
| timing, coverage, continuity | same meaning | Preserve original container and fields; no bulk migration |

Normalizer is memory-only by default. Explicit approved `--write` is required to create a migrated file; production dual-writes after Gate B and never bulk-migrates historical projects.

## Candidate Gate A: validator semantics

Sol must independently approve these before Stage 2:

1. `coverage.intentional_repeat` means a source beat is deliberately revisited for stated narrative purpose. It must reference at least one existing `shot_id`; it is neither an omission exemption nor a missing-beat suppressor. Recommended rule: require `reason` (exact name to be frozen) and validate every reference.
2. One second is the hard mechanical duration floor. If target `< shot count × 1`, fail fast, report the feasible minimum, and never write. Empty shots, invalid/nonfinite/nonpositive target, malformed duration, and unsafe correction also fail without write. Two to five seconds remains creative guidance, warning outside range unless Sol later says otherwise.
3. Dialogue checking is approximate. Normalize whitespace / punctuation, separately classify narration and short text, and compare bounded anchors. Under v2 only `source_text` is source-checked; performance/TTS text are production-quality review inputs.

## Candidate Gate B: complete contract

Sol must approve together: this matrix (including legacy wrapped-assets precedence and conflict failure); `performances[]`; `dialogues[]` and text authority; stable IDs / display names / aliases / sole writer / no reuse; the mapping, inferred labels, dual-write and no-bulk-migration policy.

## Acceptance contract for later implementation

- Bare v1, wrapped v1, and canonical v2 all read and validate.
- Multiple performers, multiple / cross-shot dialogues, narrators, and unknown wrapper data are not lost.
- `--fix` provides dry-run, optional backup, atomic replacement, impossible-duration fail-fast, and unknown-field preservation.
- Rename never changes stable ID; retired ID is never reused.
- Intentional repeat cannot mask an uncovered beat; the duration and approximate-dialogue semantics match Gate A.

## Decisions still required from Sol

- Approve / revise wrapped `assets` precedence and conflict failure.
- Freeze `intentional_repeat` reason field and severity.
- Decide whether unresolvable legacy display names are a warning for read but a hard v2-production error (Terra recommendation) or another policy.
- Freeze short-dialogue threshold and narrator categories; the current “under eight normalized characters and narrator skip” is only documented behavior, not a decision.

Terra recommendation: approve Gate A separately, then Gate B only after confirming asset placement and conflict behavior. No Gate is approved by this ADR.
