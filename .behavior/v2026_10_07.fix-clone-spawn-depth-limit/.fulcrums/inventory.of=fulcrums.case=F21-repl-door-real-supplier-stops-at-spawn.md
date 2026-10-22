# F21 — the real-supplier repl door: a spawn intercept at integration, a live boot at acceptance

**the fork:** (a) the probe drives the real anthropic supplier and the real agent-sdk, and
intercepts `child_process.spawn` alone: it records the env the sdk hands the claude child, then
throws · (b) let the spawn through, so a live haiku brain boots and replies, and assert on that
reply · (c) both, in one acceptance file · (d) both, split by tier: the intercept in an
`.integration.test.ts`, the live boot alone in the `.acceptance.test.ts`.

**taken:** (d).

- the intercept proves what a live boot cannot: the spawn count (zero at a leaf caller), and the
  restore per call. it replaces a process boundary, which `rule.forbid.acceptance.mocks` forbids
  at the acceptance tier and the integration tier's own rule allows only with a reason; a test
  that stops a spawn to count it is an integration-grain observation
  → `blackbox/sdk/replDoorRealSupplier.realnode.integration.test.ts`. the ci integration job
  builds first (`.github/workflows/.test.yml:225`), so its `dist` read holds
- the live boot proves the service end to end: a real haiku answers, and the child that answered
  booted with the depth and the mark. its spawn is wrapped, never replaced, so the acceptance file
  holds no mock → `blackbox/sdk/replDoorRealSupplier.realnode.acceptance.test.ts`

**rework:** clean. a file split; no prod code moves.

**confidence:** 90%. the one call left to the council is whether a spawn intercept that reads the
real sdk's own call is a mock at the integration tier too; the rows carry no `jest.mock` and
replace no rhachet code.

**where:** `blackbox/sdk/replDoorRealSupplier.realnode.integration.test.ts`,
`blackbox/sdk/replDoorRealSupplier.realnode.acceptance.test.ts`,
`blackbox/.test/infra/probe.replDoorRealSupplier.cjs`,
`blackbox/.test/infra/probe.replDoorRealSupplierLive.cjs`.

**verdict:** taken (d), for the council.
