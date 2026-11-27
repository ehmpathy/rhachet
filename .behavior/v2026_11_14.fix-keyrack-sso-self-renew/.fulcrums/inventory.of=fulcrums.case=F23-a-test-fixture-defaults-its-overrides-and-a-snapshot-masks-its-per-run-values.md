# F23 — a test fixture defaults its overrides, and a snapshot masks its per-run values

## .the fork

two i001 points apply prod-contract rules to test artifacts:

- r007 nitpick.4: `genSampleKeyrackSsoGrant` takes `slug?` and `reach?`, and the integration test's `unlockSsoGrant` takes `capInMs?`, against `rule.forbid.undefined-inputs`
- r010 nitpick.4: the renew json snapshots mask `renewedCount` to `-1`, so they pin the shape and not the count

for each: **a** — follow the prod rule (required `| null` fields; an exact count in the snapshot) · **b** — keep the test convention

## .taken

b, for both.

- a `genSample*` fixture is a default with overrides by the repo's own convention (`rule.require.shared-test-fixtures`: "`genMocked*` — mock with defaults"). `rule.forbid.undefined-inputs` guards internal contracts, where an omitted field hides a decision. a fixture's omitted field IS the decision: take the default. 26 calls across 14 suites would each grow two `null`s that carry no intent
- the count differs per run: the tick fires every 250ms, and how many ticks land before a read depends on host load. an exact count would flake. the value is pinned by explicit asserts beside each snapshot (`renewedCount >= 1`, `toEqual(0)` at t12), so the snapshot holds the shape and the assert holds the value (`rule.require.snapshots`: both)

## .rework

clean: the fixture's fields turn `| null` with every caller updated; a count pin would need a fake clock in a real daemon subprocess.

## .confidence — 85%, why not higher

the undefined-inputs rule names no test carve-out in its text; a reader who holds it to every `input` would choose a.

## .where

- `src/.test/assets/genSampleKeyrackSsoGrant.ts`
- `src/domain.operations/keyrack/daemon/daemonSsoRenew.integration.test.ts`
- `blackbox/cli/keyrack.status.renew.acceptance.test.ts` (`asRenewKeysSnapshotSafe`)

## .verdict

open — to the commander at the pr.
