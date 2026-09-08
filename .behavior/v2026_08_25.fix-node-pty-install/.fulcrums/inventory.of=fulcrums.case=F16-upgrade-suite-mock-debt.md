# F16 — retire the two unrepaired mocked upgrade suites now, or defer for scope?

- **raised** = i065, from r008 (`mech-test-scope-purity`, blockers 2 and 5)
- **rework** = **clean** — additive at every seam; measured, see below
- **confidence** = 87%
- **status** = ⏳ open — deferred, on SIZE plus scope

## .the fork, stated fairly

the lane graded six blockers on `rule.forbid.unit.remote-boundaries`. **four were repaired this
round; two were not**, and the two are the largest suites in the subsystem:

| file | what it mocks | lines | at `origin/main`? |
|---|---|---|---|
| `execNpmInstallGlobal.test.ts` | `jest.mock('node:child_process')` | 823 | ✅ verbatim, lines 6-8 |
| `execUpgrade.test.ts` | eight collaborator modules + `jest.spyOn(console, 'log')` | 1113 | ✅ verbatim, lines 8-30 |

**take it now** — the lane is right on the merits, the pattern to copy is three files over (this
round wrote four worked examples of it), and `execNpmInstallGlobal.test.ts` is the twin of
`execNpmInstallLocal.test.ts`, which this round DID repair. so the pair now disagrees on discipline,
which is its own small hazard for the next reader.

**defer it** — 1,936 lines of test rewrite is roughly the size of this whole branch's source diff,
in a subsystem whose behavior this wish does not change.

## 🚨 .the rework grade is CLEAN, and the deferral does NOT rest on it

per F7 — an unmeasured `dirty` is what manufactures the permission to defer — this row states the
grade honestly and then declines to lean on it.

**clean, measured:** every seam the repair needs is additive and already precedented in-tree:

| the seam | its worked example, landed this round |
|---|---|
| an optional injected communicator | `execNpmInstall.ts`'s `options.spawn` |
| an optional injected reader | `execNpmInstallLocal.ts`'s `options.detect` |
| a pure command value, unit-tested with no mock | `asPnpmVersionProbeCommand.ts` |
| a pure classifier, unit-tested with no mock | `asPnpmPresenceFromProbeResult.ts` |
| console captured for real, never spied | `withCapturedStreams` (`src/.test/assets/`) |

no caller hardens against any of them — each defaults to the real operation, so a consumer that
passes no `options` is byte-identical. **the reversal is a deletion of an optional field.**

⇒ so the grade is `clean`, and the deferral therefore rests on the two arguments that actually hold:
**SIZE** (the diff would bury the node-pty repair, `rule.forbid.scope-leaks`) and **PROVENANCE**
(both patterns predate this branch on both sides — `git show origin/main:<path>` confirms them
verbatim, so neither is a regression this round introduced).

## ⚠️ .the counter-argument against my own deferral

stated outright, per F12, because the scope claim here is weaker than F10's:

`execNpmInstallGlobal.test.ts` is not merely *"beside"* this wish — it is the **twin of a file this
round rewrote**, in the subsystem this wish's surface 2 diagnosed (`execNpmInstallLocal`'s
unconditional `--ignore-scripts`). so *"another module entirely"* is unavailable as a defense.

⚠️ and the sharper edge: it clamps that the global install carries `--ignore-scripts` and a
`timeout` — **exactly the arguments a real `spawnSync` could reject or ignore**, and exactly the
class of fact this wish exists to get right. a mocked assertion there proves the mock.

⇒ what genuinely holds is size, not irrelevance. filed that way.

## .the expiry condition

per F13 — a deferral owes its own expiry, stated as a command or an artifact:

```sh
rhx git.repo.test --what unit --scope 'path://upgrade' --mode apply
```

green **with zero `jest.mock` in `src/domain.operations/upgrade/`** closes this row. the check is a
`grepsafe` over that dir, not a judgment.

## .where

- `src/domain.operations/upgrade/execNpmInstallGlobal.test.ts` — blocker 2
- `src/domain.operations/upgrade/execUpgrade.test.ts` — blocker 5
- `.dream/2026_09_07.upgrade-unit-suites-still-mock-their-boundaries.dream.md` — the caught work,
  symlinked at `$route/dreams/`

## .the verdict, once ruled

⏳ open. the wisher may overrule the size call at any time — the seams are additive and the worked
examples are already in the tree, so the repair is mechanical rather than exploratory.
