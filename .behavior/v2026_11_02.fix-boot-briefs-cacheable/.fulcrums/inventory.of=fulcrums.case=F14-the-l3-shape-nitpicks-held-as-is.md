# F14 — the l3 shape nitpicks: two repaired, three refuted on their merits

## .the fork

the l3 lanes of i006 raised five nitpicks on code shape, each with a clean fix and none with a shipped harm:

- a prune for `.boot.leads/*.json` (r010 nitpick.2)
- the env switch swapped for the clone's own `claudeMdExcludes` (r011 nitpick.1)
- a `started` latch in the clone dir, read in place of the transcript (r011 nitpick.3)
- the five boot probes' shared flag parse moved to one `boot.probe.operations.sh` (r011 nitpick.4)
- the boundary placement and refusal in one pure function (r011 nitpick.5)

- **A** — hold all five as is; answer each with its reason
- **B** — apply each fix that is right; refute each that would regress a measured guarantee
- **C** — apply all five, the env swap after a probe

## .taken

B. `rule.forbid.deferrals-short-of-a-dedicated-pr` admits no hold of a clean fix, so each one that is
right lands here; a fix that would make the code worse is no deferral to hold, but a point to refute.

applied:
- **the prune** — `delBootCacheLeadsStale` removes a record older than `BOOT_CACHE_LEAD_PRUNE_MS` (twelve
  warm windows) on each claim. a record past the warm window already decides `claim`, the same as an
  absent one, so the prune never changes a decision
- **one boundary function** — `asBootCorpusWithCacheBoundary` refuses the literal, places the line, and
  counts it in the joined corpus; `setBrainDirBoot` calls it once

refuted:
- **the `claudeMdExcludes` swap** — `asClaudeMdExcludesOutsideDirs` strips the clone's own door today, and
  that door is measured; the swap trades it for one no probe has measured on a real clone
- **a `started` latch** — a second record of a fact the transcript holds; two records can disagree, and
  the transcript is the record (`rule.require.read-the-record-not-the-correlate`)
- **the probe flag-parse extraction** — `unknown-flag-refusal.integration.test.ts` reads each skill's own
  source for the function whose last statement is a non-zero exit; a `fail` moved to a sourced file is
  invisible to it, so the clamp would go red on every probe, or be weakened to pass

## .rework

clean: each applied fix is local; each refuted one stays open to a later round, with its blocker named.

## .confidence — 85%

the applied fixes are proven by their own tests; the env-swap refute rests on a probe not yet run.

## .where

- `src/domain.operations/clone/fleet/delBootCacheLeadsStale.ts` · `holdFirstSayForBootCache.ts`
- `src/domain.operations/boot/asBootCorpusWithCacheBoundary.ts` · `setBrainDirBoot.ts`
- `src/domain.operations/enroll/asBrainCliSpawnEnv.ts`
- `src/domain.operations/clone/fleet/getCloneTranscriptProgress.ts`
- `.agent/repo=.this/role=any/skills/unknown-flag-refusal.integration.test.ts`

## .verdict

settled by `rule.forbid.deferrals-short-of-a-dedicated-pr`: two repaired, three refuted on their merits
