# F6 — the boot replaces the vendor system prompt, never appends to it

## .the fork
F1 named both flag forms. they differ in what else the system prompt holds:
1. `--system-prompt-file <boot.md>` — the boot is the whole system prompt; claude code's own prompt (tool
   guidance, tone, text output rules) is dropped, save a one-line agent header
2. `--append-system-prompt-file <boot.md>` — claude code's prompt stays, and the boot follows it

## .taken, why
replace. measured 2026-11-02, haiku, `-driver`, `rhx boot.cache.probe --diff --across worktree`:

| door | second session cache read | second session cache write | verdict |
|---|---|---|---|
| replace | 132,111 | 4,147 | ✓ |
| append | 13,546 | 129,691 | ✗ |

under append the system holds [2] the vendor prompt (10,676 chars, a breakpoint) and [3] the vendor's
dynamic tail plus the boot. a second session at another path reads only the vendor prompt from cache and
writes the boot again. append does not meet the wish.

## .what replace costs
the vendor's behavior guidance is absent from a clone. measured: `rhx boot.adherence.probe` holds 5/5 for
a published brief and 5/5 for a `repo=.this` brief. an A/B of the two real-brain race suites
(`clone.screen-dogfood`, `clone.transcript-lag`) fails the same 8 cases under both doors, so those
failures do not trace to the drop.

## .rework
clean: one flag in `asBrainCliSpawnArgs`, its unit clamp, and the brief prose.

## .confidence, why not higher
85%. the drop of the vendor prompt may shift clone conduct in ways no probe here asks after (tool habits,
output form). the adherence probe covers the boot's own briefs only.

## .where
`src/domain.operations/enroll/asBrainCliSpawnArgs.ts` · `.log/role=any/skill=boot.cache.probe/20261102T054831Z.2607459/`
(append) · `.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-02T05-49-49Z.stderr.log` (append A/B)

## .verdict
ruled **replace** by the director, 2026-11-03, under charter ca-607907466 (S3). grounds: replace
caches the boot across sessions (132,111 read vs 13,546 under append), adherence holds 5/5, and the
rework is one flag if ever reverted.

prior note, kept for a future revert: a director who wants the vendor prompt kept must accept a per-worktree boot write, or a door this
route has not found.
