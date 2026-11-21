# F7 — the piped set tree prints under `--json`, as the guided tree does

- **fork** — keep the piped `🔐 keyrack set` tree on stdout under `--json`, the same as the extant guided github-app and aws-sso trees · thread an output mode into every vault adapter's `set` so each tree is suppressed or sent to stderr under `--json`
- **taken** — keep it as the guided path keeps it. the vault adapters render their own trees today, with no output mode in the `set` contract; a fix touches every vault adapter and the guided paths too, which is a contract change for the whole set verb rather than the off-ec2 work. the off-ec2 crew's one command takes no `--json`
- **rework** — clean. an output mode on `KeyrackHostVaultAdapter.set` is an addition; the piped path would read it the same way the guided paths would
- **confidence** — 75%. an unattended box may want `--json`; but the defect predates this change and spans every ephemeral mech, so it earns its own change
- **evidence** — a probe in round i003 (r010) confirmed it: `set --source @stdin --json` prints the tree lines, then the json, so `JSON.parse(stdout)` fails. the guided aws-sso set does the same today
- **the shared root** — "did a tree open" is decided in three places: `asOsSecureSetTreeHead`, the rows the guided github-app mech prints, and the blank line `invokeKeyrack.ts` places after a set (`source !== null || mech.startsWith('EPHEMERAL')`). all three exist because the vault renders as it runs; the same output mode on `set` that cures `--json` would let the cli own the blank line, so the two are one rework, ruled together (peer round i004, r011)
- **where** — peer round i001 on `5.1.execution.from_vision`, r009 nitpick.1; re-raised i003 r008, r010; the tree is printed in `vaultAdapterOsSecure.set` (`asOsSecureSetTreeHead`)
- **verdict** — open; the commander rules at the pr
