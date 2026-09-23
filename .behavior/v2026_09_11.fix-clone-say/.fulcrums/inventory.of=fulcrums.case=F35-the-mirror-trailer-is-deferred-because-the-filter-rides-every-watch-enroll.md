# fulcrum F35 — the `await` mirror trailer is DEFERRED, because a filter for it rides every `watch` enroll

| field | value |
|---|---|
| rework | **dirty** |
| status | OPEN |
| confidence | 84% |
| where | `src/domain.operations/clone/pty/genPtyCloneHostFromProcess.ts` (the mirror tee) |

## .the fork, stated fairly

cure 23 made an `await` enroll return the brain's answer on stdout. the answer arrives with the
child's terminal-reset bytes trailing it:

```
0 blockers / 0 nitpicks
[?1006l[?1003l[?1002l[?1000l[>4m[<u[?1004l[?2004l[?25h]9;4;0;]0;[?25h
```

| option | the call |
|---|---|
| **A — defer** (taken) | the verdict parses, so no gate this wish owns is broken. catch a dream, record the call here |
| B — filter now | add a mode-conditional strip to the mirror tee, so machine-channel stdout carries the answer alone |

## .taken, and why at the time

**A.** three reasons, in the order they weighed:

1. 🔴 **the filter sits in a path every `watch` enroll uses.** a `watch` enroll's stdout IS a human's
   terminal, and that terminal genuinely needs the reset bytes. so the fix is not *"strip the
   trailer"* — it is *"strip the trailer in one mode and forward it in the other"*, a new predicate
   in the one path whose failure a human cannot diff
2. **it repairs no defect this gate measures.** `asPeerGivenVerdict` reads a numeric count, and the
   count sits on its own line above the trailer — measured, in cure 23's proof
3. 🟡 **its origin is unmeasured.** I did not establish whether `origin/main` emits the same trailer,
   and the prior route's approved `.given` files are on another branch. so I cannot say whether B
   repairs a regression or improves a prior blemish — and that answer changes whether B is in this
   wish's scope at all

## .rework, and why it is dirty

| what B touches | why it ripples |
|---|---|
| `genPtyCloneHostFromProcess` | the mirror tee, shared by `watch` and `await` |
| a new transformer | the filter must be named, never inline (`rule.forbid.inline-decode-friction`) |
| an **acceptance** clamp | it needs a real child that exits, so no unit test can observe it |
| a color-preservation clamp | a blanket escape strip would eat a reviewer's colored answer body |

⇒ four surfaces, one of them a real-brain acceptance test, none of them touched by cure 23. a
reversal of B would be a teardown rather than a rename.

## .confidence, and why it is 84% rather than higher

the **defer** is solid; what is soft is the claim that B is out of scope. if `origin/main` proves
clean, then cure 23 introduced the trailer and B becomes a regression repair this wish owns — which
would make A the wrong call. I hold 84% that main also emits it, from the fact that the mirror tee
predates this wish, and 🔴 **that is an inference from structure, never a measurement**
(`rule.forbid.mechanism-inferred-from-outcome` is exactly why it is not stated as a fact).

⇒ so the fulcrum's residual is a single cheap measurement, named in the dream as the fix's first act.

## .the record

- 🌙 `.dream/2026_09_20.an-await-enroll-trails-raw-terminal-reset-bytes-onto-stdout.dream.md` — the
  work: the seam, the four-step fix shape, the color hazard, the SAFE/CLEAN answers
- its route symlink at `$route/dreams/`

## .the verdict

unruled.
