# fulcrum F46 — inject the two collaborators, or mock them

- **rework** = dirty
- **status** = `[author]` — 🔴 **re-answered at i003**: site 1 closed, site 2 **narrowed as far as
  it goes**, and the three alternatives MEASURED rather than argued
- **confidence** = 97% — the deferral now rests on three measurements, not an estimate
- **where** = `src/domain.operations/upgrade/execUpgrade.test.ts:44`
  (the `syncHooksForLinkedRoles.test.ts` site is **closed** — see below)

## 🔴 .the fork was posed TOO COARSELY, and a re-raise proved it

the first answer treated **two** added `jest.mock` declarations as **one** decision, weighed one
remedy against one cost, and deferred both. `rule.forbid.unit.remote-boundaries` grades each a
blocker and names three remedies: a **fake**, **dependency injection**, or a move to
`.integration.test.ts`.

🔴 **a bundled fork settles both sites at the price of the cheaper one.** graded apart, the two sites
are not alike at all:

| the mocked collaborator | what it is | can a REAL fixture drive it? |
|---|---|---|
| `getAllActorsOndisk` (syncHooks suite) | a pure filesystem read — `existsSync` + `readdirSync` + a json parse | ✅ **yes.** two syscalls of fixture |
| `syncHooksForLinkedRoles` (execUpgrade suite) | an orchestrator whose **error channel** is what the case exercises | 🔴 **no.** see below |

⇒ **that column is the whole fulcrum, and the first answer never computed it** — it reached for one
remedy (a DI seam), found it dirty at the harder site, and applied that verdict to both.

## ✅ .site 1 — CLOSED, and the repair was a RESTORATION

`syncHooksForLinkedRoles.test.ts` now writes a real actor to disk and lets the **real** read find it:

```ts
const setOneActorOndisk = (input: { dir: string; hash: string; brain: string }): void => {
  const actorDir = join(
    getActorsRootDir({ repoPath: input.dir }),
    asActorOndiskDirName({ hash: input.hash }),
  );
  mkdirSync(actorDir, { recursive: true });
  writeFileSync(join(actorDir, 'actor.json'), JSON.stringify({ brain: input.brain, roles: [] }));
};
```

🔴 **the suite's own docblock already declared this design, and the mock broke it.** verbatim, from
main:

> *"a REAL temp cwd makes getAllActorsOndisk return [] (no .agent/.actors), so the test is hermetic
> without a mock of the actor read"*

⇒ so the repair restored the file's stated contract rather than invented one. graded against
`rule.always.fix-forward-under-scouts-honor`: **SAFE** ✅ (zero production change) and **CLEAN** ✅
(one test file). **11 passed**, `--what types` green.

🟡 **and the coverage came out strictly stronger, not merely rule-compliant** — the real read's
dir-name parse (`asActorOndiskHashFromDirName`) and manifest parse (`getActorOndiskManifest`) are
now exercised on the path, where a mocked return skipped both. the `repoPath` reconstruction the
first answer had to assert by hand is now produced by the operation that owns it.

## 🔴 .site 2 — CONCEDED, deferred, and the reason is specific

`execUpgrade.test.ts` mocks `syncHooksForLinkedRoles` so a case can make its **error channel**
fault. three facts make a real drive unreachable from this stone:

| fact | measured |
|---|---|
| the suite's context is a **path that does not exist** — `new ContextCli({ cwd: '/test' })`, shared by every case | `execUpgrade.test.ts:130` |
| the real read faults on it — `getOneRepoPath` calls `realpathSync`, which throws on an absent path | `getOneRepoPath.ts:20-29` |
| the suite mocks **nine** first-party siblings already, all on main | `execUpgrade.test.ts:10-40`; the diff is `115 insertions(+), 0 deletions` |

⇒ to un-mock this one collaborator is to convert the whole suite to a real temp repo **and** build a
genuinely broken on-disk role so the error channel is non-empty. that is a rewrite of a suite this
branch did not author.

🟡 the `.integration.test.ts` route is no cheaper: an integration test forbids mocks outright
(`rule.forbid.integration.mocks`), so the case would need a real linked role package plus a
real permission fault — and a read-only-file fault does not hold as root, which is a live CI hazard.

### 🔴 .the i003 re-raise — every sanctioned alternative ATTEMPTED, and each measured closed

the lane re-raised a third time, and rightly: *"a concede-with-deferral is not a repair."* so each
isolation left was **tried** rather than reasoned about, and each failed on a fact:

| the alternative | why it is closed — measured, not estimated |
|---|---|
| 🔴 `jest.spyOn(module, fn)` — the repo's own lesson says *"can spy, but never mock"* | 🔴 **`TypeError: Cannot redefine property: syncHooksForLinkedRoles`.** ts-jest emits non-configurable getters for a module namespace, so **no export on it is spyable**. the suite failed to load at all |
| inject through `context` | `ContextCli` is a `DomainLiteral` keyed on `cwd`. a function field breaks its identity and `serialize` contracts — a domain violation, never merely a cost |
| let the real one run | it walks linked roles under a cwd that does not exist and returns `{ errors: [] }` — the **one** shape this case must not have |

⇒ 🟡 **the spy row is the one worth a record.** it is the remedy a reader reaches for first, it is
the repo's own stated line, and it is **structurally impossible under this transpiler** — a fact no
amount of argument would have surfaced. the next author who reaches for it now finds the `TypeError`
already recorded rather than re-derives it.

#### what the repair DID close

the mock is narrowed to the strongest form available, and it is the pattern **main itself
established in this very file** for `execNpmInstallGlobal`:

```ts
jest.mock('@src/domain.operations/init/hooks/syncHooksForLinkedRoles', () => ({
  ...jest.requireActual('@src/domain.operations/init/hooks/syncHooksForLinkedRoles'),
  syncHooksForLinkedRoles: jest.fn(),
}));
```

| the reviewer's named harm | after the narrow |
|---|---|
| the mock could drift on **shape** | ✅ **closed.** the type is the real one, so a return-shape change reddens at typecheck |
| every OTHER export replaced by a stand-in | ✅ **closed.** `requireActual` holds them real |
| the mock could drift on **behavior** — the real one might come to throw rather than aggregate | 🟡 **open.** this is the residual the grade below prices |

**54 passed**, `--what types` green, `--what lint` green.

### the severity, by the harm test

**`better`.** name the harm that ships if this is not fixed: a compiler-checked mock cannot drift on
**shape**; it can still drift on **behavior** — the real orchestrator could come to throw rather
than aggregate, and the mock would not. that is a maintenance risk a future engineer pays, never a
harm a user or an on-call engineer suffers. it evolves; it does not earn budget
(`rule.always.concede-with-a-severity`).

## 🔴 .what the re-raise taught, beyond this fulcrum

> **a fulcrum that bundles N sites records ONE judgment and hides N−1.**

the reviewer's line is the sharp form: *"a REFUTE about repair portability is not a sound refutation
of the violation itself."* ⇒ a dispute on the **remedy** leaves the **violation** live, and where
several sites hide behind one remedy verdict, the cheap ones are never re-examined.

🟡 the sweep question this adds: *"does every site in this fulcrum share the same cost, or did I
grade the hardest one and carry its verdict to the rest?"*

## .the verdict, once ruled

— awaited —

## .see also

- `.dream/2026_09_25.two-unit-suites-mock-a-collaborator-a-seam-would-inject.md` — the deferred work,
  now scoped to site 2 alone
- `rule.forbid.unit.remote-boundaries` — the rule this fulcrum answers
- `rule.always.fix-forward-under-scouts-honor` — the two questions that graded each site
- `rule.always.concede-with-a-severity` — the harm test behind the `better` grade
