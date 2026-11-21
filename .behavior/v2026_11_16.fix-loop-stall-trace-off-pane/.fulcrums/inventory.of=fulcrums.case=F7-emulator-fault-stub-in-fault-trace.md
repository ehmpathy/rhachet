# fulcrum F7: the screen feed fault-trace test injects an emulator that throws, not the real one

## .the fork

`genCloneScreenFeed.faultTrace.integration.test.ts` must prove that a screen feed fault reaches
the trace log and not the pane, in a real child with real stdio.

- **a.** drive the real `@xterm/headless` and provoke a write fault from it
- **b.** inject a `Terminal` whose `write` throws, and keep every other boundary real

## .taken — b

- the real emulator accepts any string, so no input makes it throw; a fault can only come from a
  module that refuses the write. a, as framed, has no reachable input
- the boundary under test is the trace sink and the child's stdio, both real; the emulator is the
  fault's source, not the contract the test reads
- the real emulator is exercised for real elsewhere: `genBrainCliPtyClone.integration.test.ts`
  (loads `getEmulatorModuleOrNull()` and reads real `read.lines`) and `genCloneScreenFeed.test.ts`,
  which meets the "one real integration test" allowance of `rule.require.external-contract-integration-tests`
- the stub is documented in place, beside the call

## .rework — clean

if a real-emulator fault becomes reachable (a version that throws on some input), the stub is one
fixture to swap; no prod code depends on the choice.

## .confidence — 90%

why not higher: a future `@xterm/headless` could add a throw path a fixture could reach; the test
would then prefer it.

## .where

stone 5.3.verification, peer review r003 nitpick.1.
