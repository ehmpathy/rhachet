# self review — behavior-declaration-adherance — 5.1.execution.from_vision

each changed file, line by line, against `1.vision.yield.md`.

## found, and fixed

**`[case19]` set `jest.setTimeout(30_000)` inside its `given`, with the comment "outlasts jest's
5s default".** both halves were wrong:

- `rhx grepsafe --pattern 'testTimeout|setTimeout' --path . --glob 'jest*'` →
  `jest.integration.env.ts:7: jest.setTimeout(180000)`. the integration default is 180s, not 5s
- `jest.setTimeout` called in a describe body runs at COLLECTION time and sets the file's default.
  so the line did not raise one case's budget — it LOWERED all 59 cases in the file from 180s to
  30s. under a loaded CI box that is a flake source for 58 cases this behavior never meant to touch,
  and it drifts from the vision's "the extant `genServerWithCapture` harness" (the harness and its
  budget were to stay as found)

fix: the line and its comment are deleted. a 9s gate plus a round trip sits far inside 180s.
rerun: `rhx git.repo.test --what integration --scope 'path://src/domain.operations/clone/socket/genCloneSocketServer' --mode apply`
→ 59 passed, 32s.

lesson: a timeout knob inside one case's scope is file-wide in jest. read the env file before
you reach for it.

## file by file — held

### `src/infra/socket/constants.ts`
- `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS = 60_000` — exactly the vision's contract block, path and
  name included
- docblock: "a guard against a hang, never a latency target" matches vision awkward #3; the
  `.note` records F7's measurement, which the vision required before build

### `src/infra/socket/getSocketPeerCred.ts`
- `timeout: SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS` — the only behavior change the vision asks of
  this file
- the command string is byte-identical (`ss -xp | grep -E "${grepPattern}" || true`). the vision's
  F7 contingency (`execFile`, filter in node) was conditional on a measurement that came back
  negative, so the shell stays — adherent
- `env: process.env` — not in the vision. it equals node's default in prod, and without it the
  vision's own clamp ("a fake `ss` on `PATH`") cannot reach the shell under jest. a means to the
  spec, not a deviation from it; its `.note` says so

### `src/domain.operations/clone/socket/constants.ts`
- `CLONE_AUTH_GATE_TIMEOUT_MS = SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS + 5_000` — the vision's
  contract line, verbatim in substance
- docblock: "5s margin for the post-lookup `/proc` stat and settle" = vision F1's stated reason;
  the F32 refutation kept, minus its now-false "would have NACK'd at 8s"; the `.note` on the 30s
  wedge floor = vision awkward #1 and case 3
- import direction: domain imports infra, never the reverse

### `src/domain.operations/clone/socket/constants.test.ts`
- `[case1]` asserts `=== 60_000`; `[case2]` asserts `gate > lookup` — the two pins the vision's
  clamp section names, no more

### `src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts`
- fake `ss` sleeps 9s then `exec`s the real `ss` with `"$@"` — vision: "sleeps 9s, then execs the
  real `ss -xp`" ✅
- `genServerWithCapture()` with no `isCallerSameUser` override — vision: "the real gate wired" ✅
- `sayClone` from the same uid — ✅ (the test process is the server's uid)
- thens: delivered · `'slow box hello\r'` in the sink · no trace line with `auth` — the vision's
  three "after" claims, the last one strictly ✅
- the `elapsedMs >= 9000` then is beyond the vision's three; it guards the clamp from a vacuous
  pass (the first run settled in 137ms against the real `ss`) ✅
- fail fast on an absent `ss` with a `ConstraintError` + hint — `rule.require.failfast`, never a skip ✅
- PATH restored in `afterAll`; the docblock's claim that the swap cannot leak holds: jest runs a
  describe's `beforeAll` after prior describes' tests finish, and cases in one file run serially

### `.depcheckrc.yml`
- outside the vision; examined in `has-pruned-yagni`. it moves no behavior the vision describes

## open questions for the wisher

none.
