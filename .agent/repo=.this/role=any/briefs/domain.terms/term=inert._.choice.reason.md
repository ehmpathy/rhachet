# domain.term.choice.reason: inert

## .etymology

from chemistry: an **inert** gas is one that is present in the vessel and enters no reaction. that
is exactly the shape here — the input is *in the system*, countable, echoed back in the readout,
and it reacts with not one thing.

the chemical sense also carries the right connotation of **surprise**. inert gases were named
because experimenters expected a reaction and observed none; the absence was the finding. an inert
flag is discovered the same way — by an expected effect that did not occur, never by an error.

chosen over four rejected words:

| word | why rejected |
|---|---|
| `ignored` | implies a **deliberate** disregard by the surface. an inert input is usually a defect the surface has no awareness of, so `ignored` assigns an intent that is not there — and invites the reader to look for the code that decided to ignore it, which does not exist |
| `no-op` | names a **correct** design (an idempotent re-run correctly changes no state). it does not mark a fault, so to reuse it here would overload one word onto a design and a defect — the exact ambiguity `rule.forbid.domain-term-ambiguity` forbids |
| `dropped` | names a **mechanism**, not a state. an input can go inert by a parser that discards it, by a matcher that fails to match, or by a filter applied to the wrong set. to name the state after one of its causes pre-commits the reader to a diagnosis — `rule.forbid.mechanism-inferred-from-outcome` |
| `silent` | already a forbidden synonym of `dark`, and it describes the FAILURE MODE rather than the input. many defects are silent; only some are inert |

## .disputes

### dispute: no-op — raised 2026-09-06 — status: RESOLVED (keep `inert`)
- raised.by  = mechanic (this round)
- claim      = "no-op" is the word engineers already reach for when a flag has no effect, and
               requires no new vocabulary
- counter    = `no-op` is **value-neutral to positive**: an idempotent `del` on an absent row is a
               no-op and is CORRECT (`rule.require.idempotent-operations` depends on that being
               unremarkable). an inert input is ALWAYS a defect. to merge them puts a design and a
               defect under one word, so a reader cannot tell from the term whether to celebrate
               or to file. the whole value of `inert` is that it carries the verdict.
- resolution = keep `inert`; record `no-op` as a forbidden synonym for THIS sense. `no-op` stays
               correct in its own sense (a correct, state-preserving call). dispute closed.

## .evidence

### the round that discovered it

`--paths-wout` was supplied seven times to a review lane and excluded not one file. every surface
reported success:

- exit code `0`
- the run completed and returned a well-argued review
- the scope header **echoed all seven globs back** — because it read
  `negativePathGlobs`, which by then held one

the run's own `input.scope.debug.json` recorded `"pathsWout": ".behavior/**/.reviews/**"` — a bare
string that held precisely the *seventh* flag. six were discarded by a parser whose generic branch
was `options[key] = value` (last write wins), while `--refs` and `--optional` had explicit
repeat-collect branches and `--paths-wout` did not.

### the cost, measured

the defect was diagnosed **three times, wrongly**, before the artifact was read:

1. read as a budget problem → asked for more budget
2. read as a commit-state problem → the diff was degenerate, so the filter excluded no file
3. read as a filter-provenance problem → dispatched upstream as a cause, and **disproven** by
   `stepReview.js:309-311`, which applies the exclusion to the joined list regardless of source

each wrong read was plausible because the outcome was identical under all four hypotheses. that is
the signature of an inert input: **the outcome underdetermines the cause**, so a diagnosis by
outcome is a coin flip. only a read of the recorded input settled it.

### the property that makes it detectable

an inert input is invisible to every check except a **measurement of the effect it claimed**. the
fix was confirmed not by a clean exit but by a token count:

| | before | after |
|---|---|---|
| tokens | 898.1k | 736.0k |
| target files | 218 | 148 |
| `.agent/` in targets | 140.0k | absent |

⇒ the entry in `term=inert._.choice._.md` that says *"the cure is a measurement, never an exit
code"* is drawn from this run, where a prior attempt had applied the same exclusions, exited
clean, and changed the token total by zero.

### the invariant it argues for

a surface that accepts an input it will not honor should **refuse** it. where a refusal is not
possible, the surface must report the input's realized effect (`matched: 0`) rather than its
supplied value — because an echo of the supplied value is what makes an inert input indetectable.

## .see also

- `term=dark._.choice._.md` — the lane state an inert scope flag produces (causally linked, not a synonym)
- `term=clamp._.choice._.md` — the shape of the proof that an input is no longer inert
- `rule.forbid.mechanism-inferred-from-outcome` — the rule this round violated, then repaired
