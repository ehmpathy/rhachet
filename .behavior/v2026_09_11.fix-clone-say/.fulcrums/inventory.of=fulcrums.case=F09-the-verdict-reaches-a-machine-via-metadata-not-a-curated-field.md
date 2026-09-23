# F09 — the verdict reaches a machine via `metadata`, not a curated `CliErrorJson` field

**rework** clean · **status** OPEN · **confidence** 72%

## .the fork, stated fairly

four of the six verdicts are refusals, so they ride the **error** channel. under `--output json` a
refusal renders `CliErrorJson` (`asCliErrorJson.ts:9-28`):

```ts
{ class, message, hint, reachState, reachCause, metadata }
```

there is no `verdict` field. so the question is how a daemon's retry policy reads the verdict on the
four cases retry is actually about — `queued` (do not re-send) vs `uncommitted` (do re-send) is the
whole distinction this wish exists to draw.

🔴 **this entry OWNS the option-A re-snap measurement below.** the yield's two mentions of it cite this
table rather than hold a copy — an arithmetic gets one owner, because a stale number reads as a fresh
one (`rule.require.a-cue-is-not-a-claim`). ⇒ re-measure it here, and nowhere else.

| option | cost |
|---|---|
| **A** — promote `verdict` to a curated top-level field, beside `reachCause` | **92 occurrences across 12 snapshot files** re-snap (`asCliErrorJson.test.ts.snap` alone: 31), on a shape all six talk verbs emit and that has no stake in this wish |
| **B** — carry `verdict` in the thrown error's metadata; consumers read `metadata.verdict` | a machine branches on an **uncurated** field, mildly against the grain of the file's own design intent |
| **C** — emit the success payload on failure paths too | breaks `withCliOutputErrors`' *"ONE catch, ONE shape"* guarantee outright. refused |

## .taken, and why at the time

**B.** metadata is projected **verbatim and unredacted** by deliberate design, and the docblock says
so in the strongest available terms (`:16-27`):

> *"🔴 metadata redaction hides the FIX. the curated fields above are a CONVENIENCE for the consumers
> that branch on them — they are never a filter. an error whose fix lives in `path`/`absolutePath`/
> `from` (or any field this shape does not name) must still reach the human and the machine"*

⇒ so B is not a workaround — it is the path the file was shaped to leave open. it delivers the full
capability (verdict legible on all six verdicts, both channels) with **zero** change to a shared
shape and zero re-snap of a file that has no stake in this wish.

A is the tidier answer and its precedent is real — `reachCause` was promoted for this exact reason,
for this exact audience (*"the wish's cron/comms audience"*, `:169-173`). it is deferred rather than
refused: it is additive, logic-free, and a clean follow-on once the verdicts themselves are settled.

## .rework, and why

**clean.** B adds a key to a metadata object that is already passed through untouched — no shape, no
transformer, no snapshot outside this wish's own. and a later move to A is purely additive: a consumer
that reads `metadata.verdict` still reads it after promotion, since promotion copies rather than moves.

⇒ that asymmetry is what makes B the safe first step. **B→A is clean; A→B would be a removal.**

## .confidence 72%, and why it is the lowest here

the counter is real and I hold it honestly: the same docblock that authorizes B frames curated fields
as the ones consumers *"branch on"*, and the retry decision is the single most load-bearing branch this
wish creates. an architect may hold that a signal this central belongs promoted on the first pass, and
that a 12-file additive re-snap is a cheap price for a contract a cron reads — especially since those
snapshots re-snap in one `--resnap` run.

the 28% is also partly a **measurement bound**: I counted `class|reachCause` occurrences, not the
distinct assertions that would change. the true re-snap cost is at most 12 files and probably less.

## .where

- `src/contract/cli/asCliErrorJson.ts:9-28` — the shape, and the unredacted-metadata mandate
- `src/contract/cli/asCliErrorJson.ts:169-173` — the `reachCause` promotion precedent, same audience
- `src/contract/cli/withCliOutputErrors.ts:20-22` — the channel split that creates the fork
- `src/contract/cli/__snapshots__/asCliErrorJson.test.ts.snap` — 31 of the 92
- `1.vision.yield.md`, `.the machine channel`

### 🔴 .the demos that RENDER this call

| demo | the verdict it renders | marked unruled? |
|---|---|---|
| `case=2` t2 | `withheld` / `input-region-dirty` | ✅ yes |
| `case=3` t4 | `buffered` / `input-region-holds-text` | ✅ yes |
| `case=4` t3 | `unreadable` / `peer-probe-blind` | ✅ yes |
| `case=6` t1 | `withheld` / `modal-holds-focus` | ✅ yes |
| `case=6` t3 | `absent` / `no-rise-observed` | ✅ yes |

⇒ **five renders, four files — every refusal verdict in the vision.** all five render `verdict`
inside `metadata` only (option B's shape) and state F09 is unruled on the line — never at the
**top level**, which would be option A plus option B at once: two owners of one value, and a
promotion nobody ruled. so a C-or-A verdict is a mechanical edit rather than a re-argument.

## .the verdict

unruled. 🟡 surfaced as **Q5** — a machine-contract call whose cheap option is defensible and whose
tidy option costs a dozen unrelated files.
