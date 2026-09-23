# F16 — `absent` and `unreadable` are covered below the CLI grain, never at the blackbox CLI

**rework** clean · **status** OPEN · **confidence** 85% — a later CLI fixture is purely additive, so the grain choice reverses at no cost

## .the fork, stated fairly

six say verdicts ship. four reach a deterministic CLI acceptance fixture through the real stub brain:
`released` (default box), `enqueued` (busy mode), `buffered` (bufferedhold mode), `withheld` (dirty /
modal / **nobox** modes — all three of its reasons). two do NOT: `absent` and `unreadable`.

| verdict | why no CLI fixture |
|---|---|
| `absent` | it is the residual — `delivered: true` AND no rise held anywhere. but the stub echoes every message, so `countOnScreen` always rises; a message that reaches the box always lands `enqueued` or `buffered`. to force `absent` a stub would have to accept bytes, write NO transcript, AND redraw a screen whose count did not move — a screen a real brain-cli never draws |
| `unreadable` | it needs a probe-blind peer (`feed-not-live` / `feed-faulted` / `peer-probe-blind`) AND no transcript rise within the 15s bound. a same-version clone always answers the probe, so a CLI fixture would need either a FAKE older-peer socket server (breaks the suite's real-child-through-a-real-pty invariant) or a genuine 15s poll hang per case (slow, flake-prone) |
| `released` + probe-blind (the SUCCESS degrade) | plain `released` DOES reach a CLI fixture (the default box). its probe-blind VARIANT — the `😶🎙️ said … + 🟡 verified by transcript only` tree, `DEGRADE_COPY` split by cause — renders only when a same-version peer is probe-blind AND the transcript DID rise, which needs the SAME fake older-peer / faulted-emulator the two failures do. so this success tree is a THIRD render pinned below the CLI grain, not a decided hole (r4-n3) |

⇒ the fork: **build a CLI fixture for the three anyway (fake peer / 15s hang), or cover them one grain down and record the gap.**

## 🔴 .the correction — `withheld` had a THIRD reason, and this fulcrum's account of it was WRONG

the row above once read *"`withheld` (dirty / modal modes)"*, which counted two of that verdict's
**three** reasons. the third is `focus-unrecognized` — a screen with no readable input band — and it
was absent from every table here.

⇒ the distinction that matters: it was **not a grain choice.** the two verdicts above are un-constructible
at CLI grain without a fake peer or a 15s hang, and that is what this fulcrum exists to record.
`focus-unrecognized` needs neither — a stub that draws no full-width rule pair trips it, since
`getInputBand` returns null below two rule rows. so it was a **hole**, and a hole is closed rather
than recorded.

🔴 **and it is a production class, never a hypothetical one.** two measured defects drew exactly this
screen, and each one left every say on that clone withheld for the clone's whole life:

| the defect | what it drew |
|---|---|
| `asPtyGeometry` — a 0x0 pty geometry (measured 2026-09-16) | a screen whose band could not be found |
| `genPtyCloneHostDetached` — a detached host with no tty (measured 2026-09-16) | the same |

⇒ **closed this round** by `RHACHET_STUB_MODE=nobox` plus `[case14]` in
`blackbox/cli/clone.acceptance.test.ts` — the unforced withhold, the json trio, both snapshot twins,
and the `--force` refusal (focus outranks the region, so an unrecognized screen has no force path,
exactly as a modal does not). raised by r011-i007-b1 as a nitpick; conceded `better` and fixed rather
than argued down.

## .taken, and why

**cover them at unit + integration grain, and record this fulcrum.** both verdicts are fully asserted
where they can be constructed deterministically and fast:

- `computeCloneSayVerdict.test.ts` — `absent` (the residual, count-did-not-rise), and `unreadable`
  across all three probe-blind reasons plus the null-screen default (lines 129–278)
- `computeCloneSayReport.test.ts` — the rendered failure copy + exit class for both, snapshot-locked;
  AND the `released` + probe-blind SUCCESS degrade tree, one snapshot per cause (peer-probe-blind /
  feed-faulted / feed-not-live), so the transcript-only success face is pinned at the unit grain too
- `getCloneSayObservation.integration.test.ts` — the probe-blind observation through a real socket

a CLI fixture that faked an older peer would prove LESS than the integration test (it would assert a
stub's shape, not a real clone's), and a 15s-per-case hang would tax every suite run for a path the
lower grains already pin. so the grain choice is not a coverage gap — it is coverage at the grain that
can construct the state honestly.

## .rework, and why

**clean.** a later CLI fixture is purely additive — a new stub mode + a new `given` block, with no
shipped code changed. if a real older-peer clone ever needs a blackbox proof, the fixture lands then
against a real version-skewed peer, which is the only honest way to build it.

## .confidence 90%

the 10% is the chance a wisher holds that EVERY shipped verdict owes a CLI-grain proof regardless of
cost — a defensible strictness call. the counter: the two un-constructible verdicts are exactly the two
whose CLI fixture would be a fake (an older peer that is not a real clone) or a 15s hang, and a fake
fixture proves less than the integration test it would duplicate.

🔴 **raised from 85% by the `focus-unrecognized` correction above, and the reason is the correction
itself.** the fulcrum's claim is *"these are un-constructible at CLI grain"* — and one of its members
turned out to be cheaply constructible, which means the claim had been asserted rather than tested per
member. now it has been: the one member that could be built was built, so the residual two are the
residual **because they resist construction**, never because nobody tried. a fulcrum whose members were
each probed is worth more than one whose set was assumed.

## .where

- `src/domain.operations/clone/socket/computeCloneSayVerdict.test.ts:129-278` — both verdicts, unit grain
- `src/domain.operations/clone/socket/computeCloneSayReport.test.ts` — the render + snapshot
- `src/domain.operations/clone/socket/getCloneSayObservation.integration.test.ts` — probe-blind through a real socket
- `blackbox/cli/clone.acceptance.test.ts` — the four CLI-constructible verdicts (case9 dirty / case10 modal / **case14 unrecognized** / case11 busy / case12 bufferedhold)
- `src/.test/assets/stubBrainCli.cjs` — the stub whose echo makes `absent` un-constructible at CLI grain; its `nobox` mode is what closes the `focus-unrecognized` hole

## .the demos that RENDER this call

NONE. no `case=N` demo renders a CLI-grain `absent` or `unreadable` assertion — the verdicts are
demoed at their honest grain (`case=4` narrates the probe-blind degrade, proven at integration). so a
verdict on this fulcrum changes no demo, and the `2.1.criteria` seed inherits no CLI-grain assertion
for either verdict.

## .the verdict

unruled. surfaced to the wisher: **is unit + integration coverage sufficient for the two verdicts a
CLI fixture cannot construct without a fake peer or a 15s hang, or must every shipped verdict carry a
blackbox CLI proof?** raised by r008 (behavior-intent-coverage) b1.
