# F27 — the sync-order integration test keeps its two delegate mocks

## .the fork

peer review 5.3 r009 nitpick.1 (and r003 nitpick.2) flags two `jest.mock` blocks in
`syncRoleHooksIntoTarget.integration.test.ts`:

- one wraps the real `setHookDispatchersViaAdapter` in `jest.fn(actual…)`, to read disk at the moment
  the settings are written, which pins the order: manifest whole first, settings second
- one loads the real `rhachet-brains-anthropic` adapter via `jest.requireActual`, since jest cannot
  drive the config loader's vm dynamic import

- **(a)** add an injected recorder seam to `setHookDispatchersForTarget` and drop both mocks
- **(b)** keep both mocks, documented inline; each delegates to real code

## .taken

(b). neither mock fakes a behavior: every write is the real adapter's, on real disk. an injected seam
would add a field to a production contract that only this test reads. the order guarantee holds on the
built cli as well: `init.hooks` [case2] and enroll [case2e][t4].

## .rework

clean. a seam and a rewritten test, no other caller.

## .confidence

85%. `rule.forbid.integration.mocks` allows a documented mock only where clearly unavoidable; the vm
import is, the observation wrap is a choice.

## .where

`src/domain.operations/init/hooks/syncRoleHooksIntoTarget.integration.test.ts`

## .verdict

open, for the director at the pr.
