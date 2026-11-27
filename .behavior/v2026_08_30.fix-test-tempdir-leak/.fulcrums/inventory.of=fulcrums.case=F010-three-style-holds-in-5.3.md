# F010 — three 5.3 nitpicks held as they are, each by reason

## .the forks, and why each holds

1. **repo-rules nitpick.1 — a 🐢 on `secrets.staged.scan`'s clean line.** its peer scan
   `timestamps.staged.scan` (on main, same role, same family of preflight scans) prints
   `🐢 no staged timestamps`. the two scans run back to back before every commit; one voice for the
   pair beats a split. a voice change would be for both, in its own change
2. **ergo-acceptance-journey-coverage nitpick.1 — the clamp probes use a bare `test()`.** the
   probes are fixtures, never behavior suites: `genTempDirPhysical.integration.test.ts` drives them
   in a nested jest run and asserts on their counts (`3 passed, 3 total`). a given/when/then frame
   would add three names to a file whose only contract is to allocate dirs under a slug
3. **ergo-snapshot-visual-blemishes nitpick.4 — the install.age farm token `/TMP_ROOT`.** the
   claim was that the farm no longer lives under the os temp root. true — and this round's root mask
   (`getTestTempRootPattern`) now renders the DERIVED temp root, where the farm does live, as
   `/TMP_ROOT`. so the token names the farm's real root, and main's snapshot stays unchanged

## .rework

clean — each is one line or one wrapper.

## .confidence

90%.

## .verdict

settled by the driver, by reason. disputed, not conceded.
