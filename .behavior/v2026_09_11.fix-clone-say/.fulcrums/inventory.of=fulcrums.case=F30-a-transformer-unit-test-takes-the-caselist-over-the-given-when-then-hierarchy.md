# F30 — a TRANSFORMER unit test takes the caselist, over the `given`/`when`/`then` hierarchy

**rework** clean · **status** OPEN · **confidence** 78%

## .the fork, stated fairly

two repo rules point at one file, and they point opposite ways.

| the rule | its stated force on a UNIT test |
|---|---|
| `rule.require.given-when-then` (mechanic) | *"required: integration tests · **recommended**: unit tests"* |
| `rule.prefer.data-driven` (mechanic, `practices/code.test/frames.caselist/`) | *"prefer data driven, caselist based, tests — this is **especially applicable** for unit tests, which often evaluate a transform"* |

⇒ and `rule.prefer.data-driven`'s own worked demo is `asSentenceCase` — an `as*` transformer, mapped
to a bare `test()`, which is exactly the shape the reviewer flags.

| option | cost |
|---|---|
| **A** — a **transformer** takes the caselist; a **stateful or async** op takes the hierarchy. the prefix decides | 21 unit files stay bare-`test()`, so a `given-when-then` lane re-raises the same nitpick every round |
| **B** — every unit file takes the hierarchy | ~21 files restructured; each `as*`/`is*`/`compute*` case gains two nest levels and no information the case row does not already carry. `rule.prefer.data-driven` is then unreachable in this repo |
| **C** — a caselist **wrapped** in one `given`/`when` pair, with the rows as `then`s | satisfies both rule names and neither intent: the `given` is a constant across every row, so it asserts a shared precondition that does not exist |

## .taken, and why

**A**, and the sort is mechanical rather than a taste call — the operation's **verb prefix** decides it
(`rule.require.get-set-gen-verbs`, `define.domain-operation-core-variants`):

| prefix | the 15 files this covers |
|---|---|
| `as*` | `asCloneEnrollDepth` · `asCloneGetReply` · `asCloneGetReplyFromScreen` · `asCloneObservationScreen` |
| `is*` | `isCloneSayToSelf` · `isCloneSocketEligible` · `isTranscriptWithinSpawnWindow` · `isCodeDefectError` |
| `compute*` | `computeCloneEnrollMode` · `computeCloneAcceptRoute` · `computeCloneDispatchPrecheck` · `computeCloneSayRetryAdvice` · `computeCloneSayPollStep` · `computeCloneScreenDispatchGate` |
| `get*` (pure compute-subtype) | `getBrainCliPassthroughArgs` |

**all 15 are pure, deterministic, single-input single-output.** for that shape the specific rule points
at the caselist and the general rule only recommends the hierarchy, so the specific one governs.

⇒ and the split was **applied, never merely argued**: `awaitCloneSubmitReady.test.ts` took the
hierarchy in this same round. `await*` is no transformer prefix, the op polls a clock, and the file was
already half-shaped for it. all four `[caseN]` labels survive and **every assertion is byte-identical**
(`rule.forbid.test-intent-violations`) — 6 passed, the same count as before.

### 🟡 the one clause of the reviewer's concern that was TAKEN

the lane's sharpest point is that the intent *"lives only in the test-name string."* for a caselist
that is where it belongs — **the `description` field IS the given/when/then, in one line** — but it must
actually SAY the triple. so every `description` in the 15 was audited, and each names its given
condition AND its expected result:

```
'a human caller (no depth var) mints a root clone at depth 0'      asCloneEnrollDepth
'a clone says to a DIFFERENT clone → not a self-say'              isCloneSayToSelf
'an option menu with a confirm footer → focus modal, refuse'      computeCloneInputState
```

⇒ the `→` carries the `then`, the clause before it carries the `given`, and the operation under
`describe` carries the `when`. not one reads as a bare label.

## .rework, and why

**clean** — option B is a mechanical restructure of 21 test files. no prod code moves, no contract
changes, no snapshot re-mints. the assertions transfer verbatim, so `rule.forbid.test-intent-violations`
is satisfiable by construction.

🟡 it is clean and **not cheap**: 21 files, and every clamp cite that names a `[caseN]` inside them must
still point at a live label afterward. so it is a dedicated-PR rework rather than a fix-forward, which
is why it is a fulcrum here rather than a repair.

## .confidence 78%, and why it is low

the reviewer has raised this in **four rounds** — i001 r007, i001 r008, i002 r008, i003 r008 — and a
rubric whose entire subject is `given-when-then` will keep it a violation whatever i argue, because
from inside that rubric it IS one.

the counter i hold: a rule's `severity:` header is the author's default for the class, never a verdict
on the instance (`rule.forbid.overzealous-blockers`), and **the lane itself grades this a nitpick with
zero blockers** — so it agrees no harm ships.

the residual doubt is real, and it is not about the 15: it is that i am the party who benefits from the
verdict that requires no work. **that is precisely why this is a fulcrum rather than a `.taken`
argument** — the wisher owns the tie between two of their own rules, and i have argued it four times
without any right to settle it myself.

## .where

- the 15 transformer suites, enumerated in the prefix table above
- `src/domain.operations/clone/socket/awaitCloneSubmitReady.test.ts` — the one file that took the hierarchy
- `.behavior/v2026_09_11.fix-clone-say/5.3.verification.yield.md` — `## 🟡 the declared test-shape deviation`, the durable record
- `…r001._.taken.by_self.repo-rules.md` — nitpick.1, the round-scoped argument

## .the demos that RENDER this call

NONE. no `case=N` demo reaches a unit test's frame. a verdict here changes no demo, and changes no
assertion — only the syntax that wraps them.

## .the verdict

unruled.
