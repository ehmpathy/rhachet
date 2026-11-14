# F16 — the cache holds the exported creds, not a stamp

- **fork** — the cache file holds the exported creds (the wish's words), or only a stamp
  `{ exportedAt, expiresAt }` plus the identity, since no keyrack caller today reads the creds back
  (`vaultAdapterAwsConfig.get` reads only `expiresAt`; the pre-warm and the refresh read naught;
  `EPHEMERAL_VIA_AWS_SSO` has one vault, which hands out the profile name as the secret)
- **taken** — the creds. the wish says the cache "serves the exported credentials until near their
  expiry", and `genAwsProfileExport` returns them, so a caller that wants the creds (the mech's
  `deliverForGet`, or a future vault) gets one export's values without a second spawn. the file is
  0600 in a 0700 dir, beside the same creds the aws cli keeps in `~/.aws/cli/cache`
- **what the stamp would buy** — no plaintext creds at rest from keyrack: the relock residue (F3,
  F15), the logout-path residue (F3) and the orphaned entries (F3) all stop to hold a secret
- **what it would cost** — the op's contract changes from "the creds" to "a proof of a recent
  export"; `deliverForGet` returns the profile name; ~16 integration cases that assert on the creds
  move to the stamp. a reversal is a contained rewrite of one op and its tests
- **rework** — clean. one op, its cache entry shape, its tests; no caller reads the creds today
- **confidence 70%, low because** — the wish names "credentials", but no caller needs them, so the
  stamp may be what the wisher would pick once the fork is put to them
- **verdict** — unresolved, for the wisher
