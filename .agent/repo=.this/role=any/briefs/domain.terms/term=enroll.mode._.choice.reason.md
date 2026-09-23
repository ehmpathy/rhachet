# domain.term.choice.reason: enroll.mode

## .etymology

**`mode`** over `attended` / `interactive`: those two name a property of the HUMAN, and that read
is the defect this axis replaced. `isCloneEnrollAttended` fed the socket gate, so a tty read
decided whether a clone could be REACHED; `mode` decides only what the enroller DOES
(`define.invariant.clone-attendance-is-a-mode-never-a-reach`).

**`await`** over `oneshot`, for the third value. three reasons, and each stands alone:

| # | the reason |
|---|---|
| ACCURACY | no enroll is ever truly one-shot. `--resume` picks a prior clone back up, so the child that "finished" is reachable again. what is bounded is the ENROLLER'S WAIT, never the clone's life |
| GRAIN | `watch`, `async`, `await` are each a verb about what the ENROLLER does, which is what this axis measures. `oneshot` was a noun about the child |
| COLLISION | `one-shot` already carries four unrelated senses in this repo, so a fifth in a contract is `rule.forbid.domain-term-ambiguity` |

the four extant `one-shot` senses, measured 2026-09-20 over `src/**/*.ts`:

| file | the sense it already carries |
|---|---|
| `contract/cli/invokeEnroll.ts:401` | a render mode — *"unlike the one-shot list/say/get views"* |
| `clone/screen/genCloneScreenFeed.ts:308` | a latch — *"a one-shot latch local to this settle"* |
| `clone/socket/constants.ts:201` | a caller kind — *"default for a one-shot caller"* |
| `clone/pty/isInteractiveTty.ts:5` | an invocation — *"a headless `-p` one-shot"* |

**`printMode`** for the predicate's input field, over `awaits`: the input must name the NATURE it
reads (claude's `-p`), never the mode it produces. `awaits: true → 'await'` states no reason,
where `printMode: true → 'await'` is an inference.

## .disputes

### dispute: a tty-only default — raised 2026-09-20 — status: RESOLVED (keep the two-input derivation)

- raised.by  = the wisher
- claim      = *"and the default is what, oneshot if non-tty, watch if tty?"* — one input, one
               table row each, and the print flag never consulted
- counter    = the tty and the print flag answer **different questions**. the tty answers *"is
               there a terminal to interact through?"*; only `-p` answers *"does the child
               exit?"*. collapse them and a non-tty SESSION enroll derives `await` and hangs
               forever on a `waitForExit` that never settles — and a non-tty session enroll is
               real: one clone enrolls a peer and must get the address back
- resolution = keep both inputs. the tty picks between `watch` and `async`; the print flag
               outranks that row entirely

### dispute: oneshot — raised 2026-09-20 — status: RESOLVED (take `await`)

- raised.by  = the wisher
- claim      = *"await = oneshot -> you await the reponse / cause you can always --resume a prior
               clone; so its not really oneshot ever"*
- counter    = none. `oneshot` had been chosen for the child's lifecycle, and the `--resume`
               observation refutes that read outright
- resolution = `await`. the two further arguments (grain, collision) were found while the rename
               landed and both point the same way

### dispute: a DERIVED-only axis — raised 2026-09-20 — status: RESOLVED (all three are askable)

- raised.by  = the wisher
- claim      = *"so was --async"* — named among the deferrals of this wish, after a self-say was
               refused rather than cured. the mode triple was settled as vocabulary, and only
               `--watch` and `--async` ever reached the cli. so `await` had a name, a derivation,
               a term cluster, and no surface
- counter    = the axis is settled by NATURE, so a caller's ask can only narrow what nature
               permits — which reads as an argument that no ask is owed at all
- resolution = the counter is true of the DERIVATION and silent about the SURFACE. all three are
               statable, and each askable value carries a nature clamp, so the surface cannot
               state an impossibility: `--watch` needs a terminal, `--await` needs a prompt,
               `--async` needs neither. a settled vocabulary with one value absent from its own
               surface teaches the surface rather than the vocabulary

### dispute: a PRECEDENCE chain over a refusal — raised 2026-09-20 — status: RESOLVED (refuse by name)

- raised.by  = this drive, while `--await` landed
- claim      = the extant read was `watch ? 'watch' : async ? 'async' : null`, so a clash already
               had an answer and the third flag could simply extend the chain
- counter    = a precedence is UNDETECTABLE from the output. the enroll succeeds, the clone stands
               up, the exit is 0 — and the caller reads a well-formed result produced by a mode
               they did not ask for. that is the shape
               `define.invariant.an-unknown-flag-is-refused-never-dropped` forbids one grain out:
               the flag was RECOGNIZED and then discarded, which costs the caller the same as a
               drop and is just as invisible
- resolution = refuse, and NAME both flags. ⇒ and the cost grew with the axis — two modes have one
               clashing pair, three have three pairs plus a triple, so a chain would hide four
               distinct asks rather than one

## .evidence

- **the measured defect** — three l3 review lanes of route `v2026_09_11.fix-clone-say` run
  `enroll … -p '<prompt>'` as a no-tty subprocess. each returned the enroll banner in place of
  the reviewer's verdict, and each graded
  `💥 malfunction: reviewer output lacks a numeric blocker/nitpick count`. the same lanes are on
  record as `approved 336.2s, 0 blockers ✓` on route `v2026_07_26`, so the regression is this
  wish's own
- **the cure, measured 2026-09-20** — a no-tty `npx rhx enroll claude --roles reviewer -p 'reply
  with exactly: 0 blockers / 0 nitpicks'` returns `0 blockers / 0 nitpicks` on stdout, with the
  enroll banner on stderr
- **the clamps** — `computeCloneEnrollMode.test.ts` walks the `{tty, asked, printMode}` cube (10
  cases) and carries five clamps, one of which (`a print-mode enroll never detaches, whatever the
  terminal`) reddens if the `printMode` row is dropped from the derivation
- **the surface clamps, dogfooded 2026-09-20** — each mutation was RUN, not asserted:

  | the mutation | the result |
  |---|---|
  | the ternary chain restored in `asCloneEnrollModeAsked` | 🔴 **4 passed, 4 failed** — every clash row, one per pair plus the triple |
  | the `asked === 'await' && !printMode` guard dropped | 🔴 **14 passed, 1 failed** — the unbounded-hang clamp |
  | `--await` removed from `getBrainCliPassthroughArgs`' `BOOLEAN_FLAGS` | 🔴 **3 passed, 1 failed** — the two-list tie clamp NAMED the absent flag |

  ⇒ the third row is the one that earns its keep: the tie clamp predates this flag and caught a
  leak this drive introduced, before any acceptance run spent a minute on it
