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
door: each clone spawns with its own spawn boot, `<actor>/boots/serial=<serial>/`, which holds the
spawn bytes (`boot.md`), a `boot.meta.json` that names their hash, and a drift `CLAUDE.md` loaded via
`--add-dir`. every render re-writes the drift of each spawn boot whose cached drift was computed against
another boot hash, and a compaction re-reads it: measured with `rhx boot.compact.probe --door add-dir`,
2026-11-17, haiku — the request after `/compact` held a line added to the drift after spawn, in its
messages, with the system block unchanged and the boot present once. a prune of the clone reaps its
spawn boot.

a `--resume` reuses the system prompt its session first recorded (measured with
`rhx boot.resume.probe`, 2026-11-03), so a resume is no new spawn for this requirement. a resume writes
no spawn boot, only a marker that its baseline is unknown, so it is never told it is current: the
carry-over of the session's own spawn boot is owed
(`.dream/v2026_11_17.feat.resume-carries-its-session-boot-revision.md`).

## .clamp

- `src/domain.operations/clone/genCloneOndisk.ts` — a clone spawns with its own spawn boot
- `src/domain.operations/enroll/asBrainCliSpawnArgsWithBootSpawned.ts` — `--add-dir <spawn boot dir>`
  and its `boot.md` as `--system-prompt-file`
- `src/domain.operations/boot/setBrainDirBoot.ts` — `rhx init` re-renders `boot.md` in place, then
  re-writes the drift of every spawn boot of the actor (`setActorBootDrifts`)
- `src/domain.operations/enroll/getClaudeMdExcludesList.ts` — every brain dir door shut, so the boot
  loads once

## .proof

| tier | test | status |
|---|---|---|
| acceptance, key-free | `blackbox/cli/enroll.acceptance.test.ts` "owns the system prompt" [case2] — the WRITE half: after a brief edit and `rhx init --hooks`, the first clone's spawn boot is unchanged, its drift carries the edit, and the next spawn boots with the edit whole; no new actor dir | proven |
| acceptance | `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` [t4] — the RE-READ half: the live `[t3]` clone, after `/compact`, quotes both its spawn sentinel and the new one | owed in ci: runs on `BRAIN_LIVE_SCOPE=all` only, since a live clone reply spends the paid key |
| skill | `rhx boot.compact.probe --door add-dir` — the re-read half, measured by hand on a real clone, logs under `.log/role=any/` | ✓ 2026-11-17 |
| — | the resume carry-over | owed, per the dream above |

## .source

the approved vision of `.behavior/v2026_11_02.fix-boot-briefs-cacheable`, 2026-11-02, which rules the
boot's door may move while the corpus stays whole; amended by the wish and approved vision of
`.behavior/v2026_11_17.feat-live-clones-take-boot-drift`, 2026-11-17, and by the review on
ehmpathy/rhachet#770, 2026-11-23, which scoped the spawn boot per clone.
