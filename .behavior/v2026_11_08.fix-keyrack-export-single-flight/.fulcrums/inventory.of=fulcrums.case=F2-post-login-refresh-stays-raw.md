# F2 — the post-login refresh reads no cache, deletes it, and overwrites it

- **fork** — (a) route the post-login export through the cache like any read; (b) leave it a raw export
  that writes no cache; (c) export under the mutex with `refresh: true`: read no cache, delete the entry
  before the export, and write the new value — so a failed refresh leaves no pre-login creds either
- **taken** — (c). the refresh runs right after a fresh sso login, to force botocore to mint new sts
  creds, so (a) would hand back pre-login creds. (b) was the first guess, and it fails a real flow: the
  username-mismatch recovery re-logs in as a different user, and vaults that deliver the creds json as the
  secret (`os.secure`, `os.direct`, `1password`) would serve the old user's cached creds until expiry
- **rework** — clean. one call site and one flag
- **confidence 85%, low because** — the cache-clear retry beside it (on a still-expired error) stays a raw
  export; it is the rare branch of a rare branch
- **where** — `vaultAdapterAwsConfig.ts` (post-login refresh)
- **verdict** — unresolved, for the wisher
