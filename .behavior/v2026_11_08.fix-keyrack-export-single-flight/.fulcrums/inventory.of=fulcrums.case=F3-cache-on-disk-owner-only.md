# F3 — the export cache rests on disk, owner-only, with a 15 min margin

- **fork** — cache in the keyrack daemon's memory (no plaintext on disk), or in an owner-only file
- **taken** — owner-only file under `~/.rhachet/keyrack/cache/aws.export/` (0600 in a 0700 dir). the
  wish names "a disk cache" and "readable only by its owner"; the aws cli already keeps the same creds
  in `~/.aws/cli/cache`. the vault relock drops every cached export of the profile
  (`delAwsProfileExport`); the cli `rhx keyrack relock` runs no vault relock, so there the export
  rests until near expiry (F15)
- **residue** — the drop takes no key. an export already in flight when a relock lands writes its
  entry after the drop, so those creds rest until their expiry or the next relock. it needs a relock
  and an unlock of one profile at the same moment; a lock per file would close it, at the cost of a
  mutex walk on every relock
- **residue, logout paths** — only the vault relock pairs `logoutAwsSsoSession` with the drop. the
  cross-user recovery, the username-mismatch unlock and the guided setup log out with no drop, so
  if the re-login then fails, the prior user's export rests until its expiry, as the same creds do in
  `~/.aws/cli/cache`, which no logout clears. the logout is domain-wide; the drop is per profile
- **residue, orphans** — the key hashes the config files' content, so an edit to `~/.aws/config`
  re-keys each profile and leaves the prior entry to rest until a relock of that profile. a sweep
  of a profile's other-sha entries on write is not taken: an override config's entry and the default
  config's entry of one profile are both live at once ([case8]), and a sweep would drop one. an
  expired-only sweep on write is safe for correctness but not taken at nano: it reads each peer file
  outside that identity's own mutex, so it can race the peer's rewrite and drop a fresh entry (one
  extra export); a rotated `~/.aws/credentials` (aws-vault, saml2aws) grows one expired file per
  rotation until a relock
- all three residues stop to hold a secret if the cache holds a stamp (F16)
- **margin** — 15 min: the window botocore refreshes within (its advisory refresh and its cached
  fetcher's expiry window), so a cache hit never hands a caller creds shorter than a direct
  `aws configure export-credentials` would. a sso permission-set session lasts 1–12 h, so the margin
  costs at most one extra export per session
- **rework** — clean. one constant, one read and one write function
- **confidence 85%, low because** — the botocore windows are read from memory, not from the bundled cli
- **verdict** — unresolved, for the wisher
