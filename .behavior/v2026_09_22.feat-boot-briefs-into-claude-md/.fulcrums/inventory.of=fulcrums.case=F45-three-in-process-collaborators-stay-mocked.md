# F45 — three in-process collaborators stay mocked, rather than injected

| field | value |
|---|---|
| case | F45 |
| title | three in-process collaborators stay mocked, rather than injected |
| rework | **dirty** |
| status | OPEN — raised by a peer lane, best-guessed, deferred to the council |
| confidence | 72% |

## .the fork, stated fairly

`src/domain.operations/init/hooks/syncHooksForLinkedRoles.test.ts` opens with three
`jest.mock` calls against its own leaf collaborators:

```ts
jest.mock('@src/domain.operations/brains/getLinkedRolesWithHooks');
jest.mock('@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains');
jest.mock('@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl');
```

`rule.forbid.unit.remote-boundaries` states its enforcement flatly: *"mock usage in unit tests
= **BLOCKER**"*, and names the sanctioned alternatives — **fakes**, **dependency injection**, or
a move to `.integration.test.ts`.

so the fork:

| option | what it costs |
|---|---|
| **A — keep the mocks** (taken) | a literal violation of a rule whose enforcement clause admits no exception |
| **B — dependency injection + fakes** | the three leaves move into the orchestrator's injected surface, so its SIGNATURE changes, and every caller changes with it |
| **C — move to `.integration.test.ts`** | the real leaves run, so the orchestrator's error-collection branch becomes unreachable — you cannot make a real leaf throw on command without a fixture built to break |

## .taken, and why at the time

**A.** three reasons, in order of weight:

1. 🔴 **the harm the rule names is not the harm present here.** its stated case against a mock is
   that it *"lies"* about a dependency whose real behavior differs — and every example it gives is
   a **remote boundary**: `fs`, a db, an http client. these three are in-process pure-ish
   collaborators in this same repo, each with its own direct coverage (the comment names
   `syncAllRoleHooksIntoEachBrainRepl.test.ts`). the mock does not stand in for a boundary whose
   behavior we cannot see; it forces a throw so the ORCHESTRATOR's error-collection and
   operator-report logic is the subject. the lane that raised it conceded this in the same breath —
   it wrote that the remote-boundary clause is not violated, and offered a refutation as acceptable.
2. **option B changes production shape to satisfy a test-structure preference**, and it ripples: the
   orchestrator's signature is read by every caller. under
   `rule.always.fix-forward-under-scouts-honor` that is the **dirty** branch — not unsafe, but far
   outside the diff this change opened — so it is deferred with a record rather than smuggled in.
3. **option C destroys the subject.** the test exists to prove the collector gathers N leaf failures
   into one operator report. with real leaves there is no seam to fail at, so the case would become
   a happy-path walk and the branch it clamps would go uncovered — a strictly worse outcome for the
   same rule's own coverage goals.

## .rework, and why

**dirty.** option B is a signature change on a production orchestrator with live callers. to reverse
it later is a second signature change, and any caller written against the injected shape in between
must be unwound too. that is a teardown, never a rename.

## .confidence, and why it is low

**72%.** the rule's `.why` and its examples support A; its `.enforcement` clause, read literally,
forbids A outright and offers no in-process carve-out. so this rests on the rule's INTENT over its
LETTER, and that is exactly the call a wisher may want to make themselves. a reasonable council could
instead rule that the rule means what it says and that the DI refactor is owed — in which case B is
the answer and this row is overruled.

⚠️ the honest alternative outcome: the rule gains an explicit in-process carve-out, which would make
A correct by the letter too. that is a change to another repo's brief, so it is a **reseed**, never a
change this tree adopts.

## .where

- `src/domain.operations/init/hooks/syncHooksForLinkedRoles.test.ts:10-12`
- the rule: `rule.forbid.unit.remote-boundaries` (ehmpathy/mechanic)

## .the verdict, once ruled

— unruled —
