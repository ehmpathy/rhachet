# F19 — the extant unit files keep their module mocks; new cases follow the file's shape

- **fork** — rework `vaultAdapterAwsConfig.test.ts` and `relockKeyrack.test.ts` free of `jest.mock`
  (inject the daemon sdk, exec, fs and the export ops as context, or move every case to an integration
  suite); or add this pr's cases in the shape each file already holds
- **taken** — the second. on main, `vaultAdapterAwsConfig.test.ts` already mocks `node:child_process`,
  `node:fs`, `fs/promises`, `@aws-sdk/credential-provider-sso` and `./getAllAwsSsoCacheEntries`, and
  `relockKeyrack.test.ts` already mocks `../daemon/sdk` and the socket path. this pr adds no new
  boundary module to either: it stubs two more functions of the daemon sdk module already mocked, and
  this pr's own two ops (`genAwsProfileExport`, `delAwsProfileExport`), each with a `.mock/.why/.real`
  doc. it also removed the one real disk touch a unit file had gained (the temp HOME)
- **why not the rework** — a mock-free unit file means a context argument on `relockKeyrack` and on the
  vault adapter's methods, which every caller of each passes: a signature change to two extant prod
  contracts and a rewrite of ~60 extant cases, none of it the wish's. the behaviors these cases stand
  for run unmocked elsewhere: the cache and the drop in `genAwsProfileExport.integration.test.ts`
  ([case14]), the cli relock against a real daemon in acceptance [case20][t1], the real aws cli in
  `genAwsProfileExport.awscli.integration.test.ts`
- **rework** — clean. the new cases are self-contained; a later move to injected context rewrites them
  with the rest of each file
- **confidence 75%, low because** — the rule names a mock in a unit file a blocker with no exception
  clause, and this holds the line on extant shape, not on the rule
- **verdict** — held in this pr; a mock-free rework of the two unit files is for the wisher, caught
  with the shape of the fix as `.dream/v2026_11_14.fix.keyrack-unit-tests-mock-remote-boundaries.md`
