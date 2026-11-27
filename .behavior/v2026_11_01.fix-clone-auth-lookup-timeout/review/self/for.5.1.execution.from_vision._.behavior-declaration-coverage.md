# self review — behavior-declaration-coverage — 5.1.execution.from_vision

read `0.wish.md` and `1.vision.yield.md` (all 219 lines) line by line, each requirement against
the diff.

## the wish

| requirement | where it lands | status |
|---|---|---|
| peer-cred lookup timeout is 60s, not 5s | `src/infra/socket/constants.ts:14` `= 60_000`; `getSocketPeerCred.ts:74` reads it (the literal `5000` is gone) | ✅ |
| gate bound sits above the lookup | `clone/socket/constants.ts:155-156` `= SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS + 5_000` → 65s | ✅ |
| same-user say on a loaded box is accepted | `[case19]`: 9s `ss`, real gate, `sayClone` → `{ delivered: true }` | ✅ |
| clamp: lookup in (5s, 60s) accepted, red before, green after | red: `auth-denied` at 5095ms (yield); green 5/5; revert → red, restore → green (yield) | ✅ |
| PR today, suite green, release watch green | owed — the last todo; the route asks for it at its end | ⏳ owed, visible in the yield |

## the vision, section by section

- **after table, row 1–2 (60s, 65s derived)** — ✅ as above
- **after table, row 3 (9s lookup → said)** — ✅ `[case19]`
- **after table, row 4 (other-user say → `auth-denied`)** — ✅ proven end to end, and newly
  effective: execution found the gate read the reader's own pid and passed any caller (S3, F8).
  after the peer-line parse, two server clamps prove the deny with no second unix user:
  `[case20]` (a fake `ss` with every process tuple stripped → `auth-denied`, zero bytes to the
  child) and `[case21]` (a fake `ss` that names pid 1, owned by root → the uid compare denies;
  `return true` in place of the compare turns it red —
  `.log/role=mechanic/skill=git.repo.test/what=integration/2026-11-01T22-08-00Z.stderr.log`)
- **the contract: "no new flag, no new reply reason, no new output"** — ✅ `git diff` touches no
  reply reason, no cli flag, no copy. the trace line at `genCloneSocketServer.ts:357` interpolates
  the constant, so it reports 65000ms by itself
- **"the derivation is the invariant"** — ✅ the gate is an expression of the lookup bound, and
  `constants.test.ts` `[case2]` asserts the order
- **the clamp spec** — each clause checked:
  - fake `ss` on `PATH` that sleeps 9s then execs the real `ss` — ✅ `genCloneSocketServer.integration.test.ts`, the `writeFileSync` with `sleep ${SS_DELAY_SECONDS}` + `exec ${ssReal} "$@"`
  - the extant `genServerWithCapture` harness, real gate (no `isCallerSameUser` injected) — ✅
  - before: rejects, records which reason — ✅ `auth-denied` (the F7 alternative,
    `auth-gate-timeout`, did not occur; F7 measured that the kill settles at the bound)
  - after: delivered — ✅ · sink holds `<message>\r` — ✅ `'slow box hello\r'` · trace holds no
    `clone socket auth error` line — ✅ stricter: no trace line holds `auth` at all, which also
    rules out `auth gate timed out`
- **the unit pins** `=== 60_000` and `gate > lookup` — ✅ `constants.test.ts` `[case1]`, `[case2]`
- **internal research: the docblock "will be rewritten to the derived form"** — ✅
  `clone/socket/constants.ts:139-144`
- **edgecase: lookup exceeds 60s → killed, deny, before the 65s gate; "holds only once the exec
  bound is real (F7); execution measures it before it builds on it"** — ✅ measured first, before
  any code: a 1000ms bound over a 4s fake `ss` rejected at 1010ms, `killed: true`, SIGTERM. the
  result is recorded in the yield and in the constant's `.note`
- **edgecase: lookup never settles → gate fires at 65s** — ✅ unchanged mechanism; only the value
  moved
- **edgecase: lookup 30s–60s → client wedge (case 3)** — ✅ named in the gate docblock `.note`;
  the cure is F3, wisher: defer, dream caught
- **open question F7 contingency (execFile rewrite)** — ✅ correctly NOT built; the measurement
  made it moot
- **F2, F4, F6** — ✅ out of scope per wish and wisher; each a dream under `.dream/`, linked
  from the route

## the experience inventory

the four demoed cases: case 1 (`[case19]`), case 2 (`[case20]` + `[case21]`, above), case 3
(the client wedge is deferred, F3; a caller that hangs up before the gate settles is never typed,
`[case22]`), case 4 (quiet box unchanged — the file's 54 other cases run the real gate
against a fast `ss` and stay green, 59/59).

## gaps found

none in code. the one item owed is the release todo, which the route schedules last and the
yield shows unchecked.
