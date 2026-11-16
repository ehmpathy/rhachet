# F12 — the module mocks that predate this pr stay; the cases this pr added sit where no module mock reaches them

- **fork** — rewrite `setKeyrackKey.test.ts` and `setKeyrackKeyHost.test.ts` off their module mocks (the daos, the daemon sdk) and `vaultAdapterOsSecure.integration.test.ts` off its `promptHiddenInput` mock, in this pr · leave each extant mock as main has it, and keep every case this pr adds off a module mock
- **taken** — leave the extant mocks. each was on main before this pr; the pr touched `setKeyrackKey.test.ts` only to pass the new required-nullable `source`, and touched the os.secure integration suite only to add piped-source cases, which call no prompt. the one case this pr had added on top of a module mock (`setKeyrackKeyHost.test.ts` [case0]) moved to `setKeyrackKeyHost.integration.test.ts` [case12], over the real daos; the new `setKeyrackKey.test.ts` [case4] reads the value the vault received through an injected fake, never a module mock
- **rework** — clean. each rewrite is local to one test file; no prod code and no contract depends on it. caught as a dream: `.dream/v2026_11_16.chore.keyrack-set-unit-tests-off-module-mocks.md`
- **confidence** — 80%. the rewrite is test-only and safe, but it is a rework of three files this pr did not author, and it would bury the pr's own diff
- **where** — peer round i001 on `5.3.verification`, r009 blocker.1 and nitpick.1
- **verdict** — open; to commander at pr
