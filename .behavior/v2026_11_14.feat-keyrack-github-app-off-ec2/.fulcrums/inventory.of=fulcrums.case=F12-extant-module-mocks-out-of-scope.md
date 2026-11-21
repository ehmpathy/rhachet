# F12 — the keyrack set tests leave their module mocks, in this pr

- **fork** — rewrite `setKeyrackKey.test.ts` and `setKeyrackKeyHost.test.ts` off their module mocks (the daos, the daemon sdk) and `vaultAdapterOsSecure.integration.test.ts` off its `promptHiddenInput` mock, in this pr · leave each mock as main has it
- **taken** — rewrite, here. both unit files are gone: `setKeyrackKey.test.ts` became `setKeyrackKey.integration.test.ts`, and the unit cases of `setKeyrackKeyHost.test.ts` became `[case13]`–`[case18]` of `setKeyrackKeyHost.integration.test.ts`, each over a real temp home and the real daos. each assertion on a mock call now reads the real state back (the host manifest, the inventory). the daemon relock needs no mock: a fresh owner has no live daemon, and the relock returns null
- **the one mock kept** — `vaultAdapterOsSecure.integration.test.ts` keeps its `promptHiddenInput` mock, now with `.mock`, `.why` and `.real` at the mock: the replica mech calls the hidden prompt directly and has no injected seam, and a seam is a prod change to the mech and its domain object. `.real` names `promptHiddenInput.integration.test.ts` and `keyrack.vault.osSecure.acceptance`, which feeds a secret on the built cli's real stdin (`rule.forbid.integration.mocks`, documented exception)
- **rework** — clean. test files only; no case dropped (`setKeyrackKey` 5 → 6 thens, the host unit cases 20 → 21 thens, each gain a read-back)
- **confidence** — 85%
- **where** — peer round i001 r009 blocker.1 and nitpick.1, re-raised in i002 r001 blocker.2
- **verdict** — landed in this pr, per the peer rounds
