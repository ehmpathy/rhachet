# requirement: a boot edit reaches every clone spawned after it whole, and a live clone at its next compaction

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- after `rhx init` re-renders an actor's `boot.md`, every clone of that actor spawned later boots the
  new bytes, with no new actor dir
- a clone already live keeps the boot it spawned with as its system prompt — the cache prefix is never
  rewritten mid-session — and takes the edit as its boot drift at its next compaction (`/compact`, or
  the brain cli's own auto-compaction), its conversation kept
- the drift is only what changed since the clone spawned, per brief, never the whole boot again

## .amended

2026-11-17, by the wisher, in the wish of `.behavior/v2026_11_17.feat-live-clones-take-boot-drift`
(the fast follow named on ehmpathy/rhachet#713): the second half once read "a clone already live keeps
the boot it spawned with — through each turn and through `/compact` — until it is spawned again". the
spawn half is unchanged.

## .how a live clone takes the edit

the boot reaches a clone as `--system-prompt-file`, read once at spawn, and claude does not re-read it
at a compaction (measured with `rhx boot.compact.probe`, 2026-11-02, haiku). so the edit takes another
door: each clone spawns on a boot revision, `<actor>/boots/sha256=<hash>/`, which holds the spawn bytes
and a drift `CLAUDE.md` loaded via `--add-dir`. every render re-writes the drift of each revision, and
a compaction re-reads it: measured with `rhx boot.compact.probe --door add-dir`, 2026-11-17, haiku — the
request after `/compact` held a line added to the drift after spawn, in its messages, with the system
block unchanged and the boot present once.

a `--resume` reuses the system prompt its session first recorded (measured with
`rhx boot.resume.probe`, 2026-11-03), so a resume is no new spawn for this requirement: it spawns on
the revision its session spawned on (`genCloneBootRevisionForSpawn`), so its drift carries every edit
since, at its first compaction.

## .clamp

- `src/domain.operations/clone/genCloneOndisk.ts` — a clone spawns on a boot revision, and keeps a ref
- `src/domain.operations/enroll/asBrainCliSpawnArgsWithBootRevision.ts` — `--add-dir <revision>` and
  the revision's `boot.md` as `--system-prompt-file`
- `src/domain.operations/boot/setBrainDirBoot.ts` — `rhx init` re-renders `boot.md` in place, then
  re-writes the drift of every revision of the actor (`setActorBootDrifts`)
- `src/domain.operations/enroll/getClaudeMdExcludesList.ts` — every brain dir door shut, so the boot
  loads once

## .proof

| tier | test | status |
|---|---|---|
| acceptance, key-free | `blackbox/cli/enroll.acceptance.test.ts` "owns the system prompt" [case2] — after a brief edit and `rhx init --hooks`, the first spawn's revision boot is unchanged, its drift carries the edit, and the next spawn boots a new revision that holds the edit whole; no new actor dir; a resume by id spawns on its session's revision, and a resume with no record says so | proven (42/42 green) |
| acceptance | `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` [t4] — after an edit and `rhx init`, a new clone quotes the new sentinel with no new actor; the live `[t3]` clone, after `/compact`, quotes both its spawn sentinel and the new one | runs on `BRAIN_LIVE_SCOPE=all`, skips by default: a live clone reply spends the paid key |
| skill | `rhx boot.compact.probe --door add-dir` — measured by hand, logs under `.log/role=any/` | ✓ 2026-11-17 |

## .source

the approved vision of `.behavior/v2026_11_02.fix-boot-briefs-cacheable`, 2026-11-02, which rules the
boot's door may move while the corpus stays whole; amended by the wish and approved vision of
`.behavior/v2026_11_17.feat-live-clones-take-boot-drift`, 2026-11-17.
