# define.invariant.clone-history-holds-only-its-own-session

## .what

**a clone's history links only transcripts its own session created.** a transcript is a candidate by
its **creation** stamp, never by its last-write stamp.

`rhx clone get` reads the history dir and renders every linked transcript as the clone's talk. so the
link IS the provenance claim — once a foreign transcript is linked, every downstream read inherits a
lie that no later check can catch.

## .kind

**nature**, for the core claim. a transcript created before a process existed cannot hold that
process's output — that is causality, not a decision this repo made. no design could have gone
otherwise.

🟡 **nurture**, for the fallback. *which stamp to read when the filesystem keeps no creation time* is
a chosen degrade, and the choice is argued below.

## .invariant

```
linked(clone, transcript)  ⟹  transcript.birthtime >= clone.spawnedAt − TOLERANCE
```

with the record read through a trustworthiness gate, because a filesystem record is not always
readable:

```
trustworthy(birthtime)  ⟺  present ∧ > 0 ∧ <= mtime
¬trustworthy            ⟹  fall back to mtime   (the pre-cure behavior — a DECLARED degrade)
```

## .why — `mtime` is a CORRELATE of creation, and a LIVE peer breaks it

- for a transcript nobody appends to again, `mtime` and `birthtime` agree
  - ⇒ which is why a mtime-only window held for so long, and looked authoritative
- a **live** session is appended to on every turn
  - so its `mtime` is always `now`
  - ⇒ therefore always `>= spawnedAt`, ⇒ **in-window for every clone, forever**

🔴 **and it is not merely a wrong read — it FORGES a verdict.** `clone say`'s `released` is defined as
*the transcript count rose*. link the enroller's transcript and **the enroller's own output satisfies
the verdict**, for a message no peer ever took.

⇒ that is the exact inverse of the defect `v2026_09_11.fix-clone-say` exists to cure: the wish fixes
*a landed say reported as a failure*; this produced *a never-landed say reported as a success*. one
costs a retry, the other a silent drop.

⚠️ **it also defeats its own proof.** a dogfood that says *"reply with token X"* and reads `X` back
from the enroller's transcript has measured the enroller — the token is there because the enroller
wrote it into the prompt. **a test can be a correlate too.**

## .scope

it governs **which transcript is linked**. it says naught about:

| the question | its owner |
|---|---|
| how a linked record resolves to a direction | `define.invariant.clone-directioned-observe` |
| which of two in-window candidates is ours | the atomic `.exids/` claim + the ambiguous-refuse guard |
| whether the clone authored a record it linked | 🟡 **unsettled** — see the residual below |

🟡 **the guard below it is armed for the wrong shape.** the ambiguous-refuse fires at `>= 2`
candidates; the adoption happened at exactly **1**, because the clone's own transcript did not exist
yet. ⇒ one candidate reads as certainty where it may be an **absence**
(`define.invariant.empty-render-names-its-cause`).

## .the litigation

the docblock and the code disagreed **in the same file, two lines apart**:

```ts
// "a transcript CREATED before this clone spawned cannot be ours"   ← the docblock
return input.transcriptMtimeMs >= spawnedAtMs - CLONE_SPAWN_WINDOW_TOLERANCE_MS;
```

⇒ **the rule is stated in the sentence above the line that breaks it**, so this invariant was never
disputed — it was never written down. that is what makes it an invariant rather than a settled
argument: there are no two sides here, only a field that was closer to hand than the correct one.

**measured 2026-09-16**: a clone's history dir held two links — its own, made at spawn, and the
**enroller's session**, linked 2.5 hours later by the per-episode re-link poll. a `clone get` on that
clone rendered the enroller's own assistant messages under `🎧` — *heard from the clone*.

🟡 the two wall-clock stamps are deliberately absent. what the claim rests on is the **gap** — a link
made hours after spawn cannot be this clone's own session — and a clock literal in a committed brief
is a permadrift the repo's own pre-commit gate refuses.

## .the counter-argument, stated fairly

*"`birthtime` is unreliable — it is 0 on some filesystems and a ctime fallback on others. a swap
trades a rare wrong link for a common empty history."*

⇒ **true, and it is why the predicate has a trustworthiness gate rather than a bare field swap.**
every untrustworthy read degrades to `mtime`, which is exactly the pre-cure behavior — so the
invariant **narrows candidacy where creation is knowable and never widens it where it is not.** a
filesystem that keeps no birthtime is no worse off than before; one that does is correct.

🟡 the gate's third clause is the non-obvious one: `birthtime <= mtime`. no real file is written
before it was created, so a birthtime past its mtime is a filesystem that **reports a stamp it does
not keep**. distrust it.

## .what would overturn it

the core claim is nature, so it needs a mechanism change, not a preference:

- a brain-cli that **resumes** a prior session into a fresh clone — then a clone's legitimate
  transcript would predate its spawn, and identity would have to ride an exid handed down at spawn
  rather than a time window at all
- ⇒ no resume path exists today: every clone spawns a fresh session (`genBrainCliPtyClone`), which is
  what makes the window sufficient

the fallback is nurture and turns on evidence: a measurement that `birthtime` is unreadable on a
platform this repo supports would move the degrade, never the invariant.

## .enforcement

- a transcript linked to a clone whose **creation** predates that clone's spawn = **blocker**
- a candidacy filter that reads `mtime` where `birthtime` is trustworthy = **blocker** (the correlate
  — `rule.require.read-the-record-not-the-correlate`)
- a birthtime swap with **no declared fallback** for a filesystem that keeps none = **blocker** (it
  empties every history on that platform)
- a dogfood that proves delivery by a token **the prover supplied**, against a transcript whose
  provenance is unchecked = **blocker** — it can be satisfied by the prover's own writes

## .the residual — a separate, unsettled defect

🟡 **a linked transcript's records render `🎧` with no check that the clone authored them.** the
direction invariant resolves `type:'assistant'` → `out` and is correct *given* the right transcript;
it presumes the provenance this invariant now supplies. so a mis-link arrives with **false
provenance**, which is what made the wrong read persuasive rather than obvious.

⇒ that check is **not implemented**. this invariant closes the adoption; it does not verify authorship.

## .see also

- `isTranscriptWithinSpawnWindow.ts` — the one owner of the predicate, with the three-clause gate
- `rule.require.read-the-record-not-the-correlate` — instance 6, and the only one whose cure needed a
  **declared degrade** rather than a plain redirect
- `define.invariant.clone-directioned-observe` — the direction rule this invariant is a precondition of
- `define.invariant.clone-say-delivery` — where a forged `released` would have landed
- `.dream/2026_09_16.a-clone-adopts-its-parents-live-transcript-via-mtime.dream.md` — the full
  diagnosis, the on-disk proof, and the three items still owed
