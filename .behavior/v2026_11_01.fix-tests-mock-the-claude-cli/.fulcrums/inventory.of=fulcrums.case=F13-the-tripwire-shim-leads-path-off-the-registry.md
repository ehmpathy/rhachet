# F13 — a tripwire shim leads the real PATH of every jest worker

## .the fork

the fence runs only where a harness function calls the access. a suite that spawns `rhx enroll` or
`rhx clone` finds `claude` on PATH, and once `setupRichStubBrainPath` is gone, a suite that forgets
`genMockClaudeEnv` reaches the host's real claude with no access call at all.

jest hands each test file a copy of `process.env` (`jest-util/build/createProcessObject.js:101`),
and `child_process` runs outside that sandbox, so a spawn with no `env` option inherits the
worker's real env. a PATH set per file would miss it.

| option | what it does | the cost |
|---|---|---|
| A. each tier's globalSetup puts a `claude` shim first on the REAL `process.env.PATH`; workers and children inherit it; it answers `--version` with the floor and refuses all else, exit 2. each env.ts adds a suite-named message to the sandbox env | every child spawn is refused unless it leads with the access's bin; a registered smoketest already does | a bare spawn reads a base message that cannot name its suite |
| A'. a per-file shim set in `setupFilesAfterEnv` | the message names the suite | a spawn with no `env` option skips it |
| B. a drift kind that flags a suite which runs `rhx enroll` with no `genMockClaudeEnv` | static | a text heuristic; misses an env built another way |
| C. trust the drift check and code review | no new code | the vision's promise ("a spawn outside the set is refused") has no proof |

## .taken

A. it fences the spawn itself, at the cell every child inherits. real claude is then reachable only
by the access's bin, for smoketests too, so no exemption exists to get wrong. the mock-cli suites
are untouched because `genMockClaudeEnv` leads PATH with the mock cli's dir. the bin walk skips the
tripwire dir, since the shim answers `--version` like a real bin.

## .rework

clean — the shim is one file and one line per globalSetup; B swaps it for a drift kind.

## .confidence

75%. unmeasured: that the sdk entry spawns its bundled cli by path (an assumption row; its
smoketest's green under the tripwire proves it).

## .where

`3.3.1.blueprint.product.yield.md` — `.codepath tree`, the tripwire block.

## .verdict

best-guessed; moved from A' to A after review.
