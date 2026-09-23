# fulcrum F13 — the brain MODEL rides `clone get` / `whoami`

**rework** clean · **status** OPEN · **confidence** 80%

## .the fork

seed **S2** records the wisher, on the read channel, who asks for the brain's current model:
*"lets pull that in"* — that `clone get` / `whoami` report the model the clone runs now. the
vision's design section states outright *"the current model rides `clone get`"*.

the shipped `CloneGetReply` carries `{ focus, input, countInInput, countOnScreen }` and a `probe`
strength. it does NOT carry a `model` field. so the wisher's pull-in is unimplemented on this stone.

two ways to close it:

- **option A — expose the model now.** add a `model` (or a `[research]`-gated `model`) field to the
  `capable` get reply, sourced per the vision's own split — spawn-stamped (reliable, stale after
  `/model`) or read-now (the transcript/screen, a research item).
- **option B — defer it, itemized (taken).** the model read is a research-gated extension, NOT a
  Task-5 deliverable; no requirement in the R/V table blocks on it. this fulcrum is the wisher-visible
  record of that deferral, so the pull-in is not lost.

## .taken, and why

**option B — deferred, itemized here.** the `now` model read is a `[research]` item by the vision's
own A1-class split (`ANTHROPIC_MODEL` sets the launch default only; `/model` overrides it with no
write-back, so only the transcript/screen carries the current model — the same instrument this wish
still measures). the `spawn` model is reliable but stale, so a bare `model` field would report a
value that lies after the first `/model`. a half-answer on a read no retry policy blocks on is worse
than an honest deferral with a record.

⇒ so the pull-in is captured as an OPEN fulcrum rather than silently dropped: r8-n2's ask was that
the wisher SEE what was pulled in and not shipped, and this entry is that visibility.

## .rework — clean

a `model` field on the `capable` get reply is additive: a new optional field on `CloneInputState` /
`CloneGetReply`, sourced at one site. no caller of the extant four fields breaks, and the machine
channel is already additive (V13). so a later verdict to expose it is a clean forward step, never a
teardown.

## .confidence — 80%, and why

high that the DEFERRAL is right for THIS stone (the `now` read genuinely gates on the same unmeasured
transcript/screen instrument, and no R/V requirement blocks on it). the 20% doubt is whether the
wisher wants the STALE spawn-stamped model exposed now as a partial answer — a call reserved for them,
which is exactly why it is a fulcrum rather than a silent skip.

## .where

- seed `S2` — `.seeds/inventory.of=seeds.case=S2-track-the-brain-model.md`
- the vision design note *"the current model rides `clone get`"* — `1.vision.yield.md`
- the shipped reply shape — `src/domain.operations/clone/socket/asCloneGetReply.ts` (`CloneGetReply`)
- the deferral prose — `5.1.execution.from_vision.yield.md`

## .the demos that RENDER this call

**NONE.** no `case=N` demo renders a `model` field — the seven demos render probe/verdict shapes only,
so no demo seeds a criteria assertion about the model. a verdict on F13 changes no demo.
