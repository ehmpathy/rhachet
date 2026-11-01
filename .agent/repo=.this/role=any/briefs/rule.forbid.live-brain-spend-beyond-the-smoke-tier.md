# rule.forbid.live-brain-spend-beyond-the-smoke-tier

> **a live-brain test bills a vendor api (anthropic, openai, any supplier) on every run. on cicd, the smoke tier is the whole
> live budget. every other live-brain test runs only on demand, by a named flag.**

## .the three tiers

| tier | what | where it runs live | credential |
|---|---|---|---|
| 1 | a critical safety guard (a pii gate, a secret guard) | its real-brain run at precommit; on cicd its integration test runs on a documented mock (`.mock` / `.why` / `.real`) | api key |
| 2 | rhachet's acceptance smoke tests | cicd and local, every run | api key |
| 3 | every other live-brain test | only when `BRAIN_LIVE_SCOPE=all` | api key |

rhachet holds no tier-1 guard. its tier 2 is `blackbox/cli/clone.realbrain.acceptance.test.ts` —
one real enroll, one say, one reply, on haiku with a narrow context. the bound is **under $0.50 per
test run**, for the whole tier.

## .the gate

- tier 3 wraps its suite in `describeBrainLiveOnDemand` (`src/.test/infra/describeBrainLiveOnDemand.ts`)
- with no flag, the suite is skipped **by name**: a todo row beside it reads
  `[gated: tier-3 live brain] <suite> — run with rhx test.brain.live, which sets BRAIN_LIVE_SCOPE=all`, so the report lists each one
  and how to run it. never a silent skip
- the skipped suite keeps its own title, so its snapshots stay keyed; a renamed skip leaves them
  unmatched, so jest reports them obsolete and a `-u` run deletes them
- the flag is a closed set: unset or empty is off, `all` is on, any other value fails loud. a typo
  never reads as a green run
- to run them, scoped: `rhx test.brain.live --what integration --scope <suite> --mode apply` (or
  `acceptance`). the skill sets the flag for that call, and refuses a run with no `--scope`
- cicd sets no flag, so cicd runs tier 2 only
- 🔴 jest runs a skipped describe's body to register its tests, so a gated body does no i/o and
  reads no credential at collection. defer each into a `beforeAll` or a getter
  (`getContextOpenAI`'s `key`, `caseAskable`'s key check)

## .the clamp

`src/.test/infra/liveBrainRegistry.ts` is the one place that says what may reach a live brain: the
reach markers (a `rhachet-brains-*` or vendor sdk import, a `claude` spawn by any child-process
call or a print-mode call, a vendor api host, the real-claude bin override, a brain call, a brain
context, a `claude -p` command, and — in an integration or acceptance suite only — a slug handed to
`--brain` or as a `brain:` choice), each
test-infra module that can reach a brain with its reason (its exports classified `live` or `stub`,
or its every use live — an import, or a probe's file name), and the suite exceptions with theirs
(tier 2; a suite with no credential at all), each with the markers it may hold.

`src/.test/infra/getAllLiveBrainSuitesUngated.integration.test.ts` reads that registry, keyless, on
every push:
- a test that holds a marker, a registered live name, or an import of a live-only module must be
  wholly gated: its top-level statements are imports, declarations, `jest.*` calls and exactly one
  `describeBrainLiveOnDemand`, read from the syntax tree
- a gated test may run no marker at collection. jest runs a skipped describe's body to register its
  tests, so each call that runs then is read: at the top level, in the gate's body, in each
  `describe`/`given`/`when`, and in any callback a run call takes. a call that registers (`then`, a
  hook, `useBeforeAll`, `useThen`) is deferred, as is a function that runs only when called; a
  title, a path or a comment is data. a live name that only builds a lazy value (a key read on use)
  may sit at collection, and still marks its suite live
- a marker matches any quote, since no formatter runs on `blackbox/` or `.test/`
- the scan reads one universe, built by exclusion (`getAllLivePaths`): every `.ts`, `.cjs`, `.mjs`,
  `.js` and `.sh` file bar `node_modules`, `.git`, `dist`, `.yalc`, the `.log`, `.behavior` and
  `.dream` records, and `.agent/` other than `.agent/repo=.this/`. the tests are its `*.test.ts`
  files and the modules are the rest, so a new root is read until it is excluded by name
- a test-infra module, in any of those languages, that holds a marker
  or wraps a live name or a live-only module must be registered. test infra is any module outside
  `src/` (`blackbox/` and `.agent/repo=.this/` hold no prod code), and under `src/` any module in
  a `.test/` or `.test.assets/` dir — so a test helper in `src/` lives there, since prod may spawn
  claude
- each export of a registered module must be classified, so a new entry point cannot pass as a stub
- an exception, and a module registered to reach no brain, may hold only the markers it allows,
  and must still hold each one; a registered path must exist. so which markers a file holds is
  read, a removed mock leaves no allowance behind, and a new file at a stale path inherits no pass.
  which receiver an allowed marker calls (a mock or a real supplier) is the `reason`'s prose, and
  is not read
- the tier-2 suite holds no gate, so the one live proof on cicd cannot go dark as a todo row

`describeBrainLiveOnDemand.realjest.integration.test.ts` observes what the text cannot: it collects
every gated suite under real jest twice — once with each vendor key stripped (no key read at
collection), and once under a tripwire: a decoy `claude` first on `PATH` that logs each run, decoy
keys, and the vendor base urls aimed at a local listener that counts each connection. the decoy log
must stay empty and the count zero; a fixture that spawns from a variable and calls a url built
from the env proves the tripwire bites.

🟡 the known edge: the scan reads text, so it sees only what a marker names — a command held in a
variable (`spawn(bin)`), or a call through a local alias, is not seen; the tripwire above sees it
at collection. the scan does not read an extensionless shim (`blackbox/.test/assets/mock-*-cli/*`);
none reaches a brain today, and a new one that does belongs in the registry, by hand.

## .what is forbidden

- a new live-brain test, unless it replaces spend of at least its own size
- a larger model (past haiku) or a longer prompt or context in a live-brain test, under the same bound
- a tier-3 suite that runs without the flag
- a gate that skips with no row that names the suite and the flag
- an oauth token as a test credential; tiers 1 and 2 run on the api key, and no tier uses another

## .why

the api credit is spent per call. a test that calls a real brain on every push charges every push,
in every repo, for a fact the smoke tier already proves. a cheap path tested free is worth more than
a dear path tested on every run.

## .enforcement

- a new live-brain test that adds spend with none removed = **blocker**
- a model or prompt raised in a live-brain test with no spend cut to match = **blocker**
- a wasteful test against the api (a repeat call, a needless model, a fat context) = **blocker** in review
- a tier-3 suite outside `describeBrainLiveOnDemand` = **blocker** (the clamp fails it)
- a new exception in the clamp with no reason, or one that bills = **blocker**
- a new test-infra module that reaches a brain, absent from `liveBrainRegistry.ts` = **blocker** (the clamp names it)
- a new export of a registered module left unclassified = **blocker** (the clamp names it)

## .see also

- `rule.always.replace-spend-when-a-live-brain-test-changes` — the act each change owes
- `rule.require.test-claude-cli-against-haiku` — the model the smoke tier runs on
- `rule.forbid.redundant-expensive-operations` (mechanic) — one call, shared across `then` blocks
