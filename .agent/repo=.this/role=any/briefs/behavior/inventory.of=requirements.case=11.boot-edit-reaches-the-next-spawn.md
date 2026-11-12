# requirement: a boot edit reaches every clone spawned after it; a live clone keeps its spawn boot

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- after `rhx init` re-renders an actor's `boot.md`, every clone of that actor spawned later boots the
  new bytes, with no new actor dir
- a clone already live keeps the boot it spawned with — through each turn and through `/compact` —
  until it is spawned again

## .why the live clone keeps its boot

the boot reaches a clone as `--system-prompt-file`, read once at spawn. claude records the system prompt
at the first request and does not re-read the file on a compaction: measured with
`rhx boot.compact.probe`, 2026-11-02, haiku — the request after `/compact` held the spawn boot, not a
line added to `boot.md` after spawn.

a `--resume` holds the same: measured with `rhx boot.resume.probe`, 2026-11-03, haiku — the resumed
request sent the boot its session first recorded, while the `boot.md` that resume spawned with held the
edit. so a resume is no new spawn for this requirement; a new session is.

the boot once rode the `CLAUDE.md` memory door, which a compaction re-reads, so a live clone met an edit
at its next `/compact`. the door moved to the system prompt so the boot is a cache prefix
(`inventory.of=requirements.case=10`), and the vision of
`.behavior/v2026_11_02.fix-boot-briefs-cacheable`, approved by the wisher 2026-11-02, named this cost:
an edit reaches a clone at restart.

## .clamp

- `src/domain.operations/enroll/asBrainCliSpawnArgs.ts` — the boot path rides `--system-prompt-file`
- `src/domain.operations/boot/setBrainDirBoot.ts` — `rhx init` re-renders `boot.md` in place, in the
  actor dir every clone of the actor reads at spawn

## .proof

| tier | test | status |
|---|---|---|
| acceptance, key-free | `blackbox/cli/enroll.acceptance.test.ts` "owns the system prompt" [case2] — a brief edit and `rhx init --hooks` re-render the same actor's `boot.md` in place; the next spawn's `--system-prompt-file` names that file; no new actor dir | ✅ green 2026-11-04 |
| acceptance | `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` [t4] — after an edit and `rhx init`, a new clone quotes the new sentinel with no new actor; the live `[t3]` clone, after `/compact`, still quotes its spawn sentinel and not the new one | runs on `BRAIN_LIVE_SCOPE=all`, skips by default: a live clone reply spends the paid key |
| skill | `rhx boot.compact.probe`, `rhx boot.resume.probe` — measured by hand, logs under `.log/role=any/` | ✓ 2026-11-02, 2026-11-03 |

## .source

the approved vision of `.behavior/v2026_11_02.fix-boot-briefs-cacheable`, 2026-11-02, which rules the
boot's door may move while the corpus stays whole; the spawn half was asserted by the journey `[t4]`
before this behavior.
